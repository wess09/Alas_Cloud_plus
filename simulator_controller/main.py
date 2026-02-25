import os
import subprocess
import asyncio
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="模拟器远端控制服务", description="接收云端请求，控制本地 MuMu 12 开关机")

# MuMu 相关程序的路径，可以从环境变量读取
# MuMu 相关程序的路径，可以从环境变量读取
# 默认路径通常在 MuMu 安装目录的 shell 文件夹下
MUMU_SHELL_DIR = os.getenv("MUMU_SHELL_DIR", r"E:\Program Files\Netease\MuMu\nx_main")
MUMU_MANAGER_PATH = os.path.join(MUMU_SHELL_DIR, "MuMuManager.exe")
WS_SCRCPY_DIR = os.getenv("WS_SCRCPY_DIR", r"C:\Users\xf\ws-scrcpy\dist")

class SimulatorRequest(BaseModel):
    emulator_id: str

def execute_command(cmd: list, wait: bool = True):
    """执行命令行指令"""
    exe_path = cmd[0]
    if not os.path.exists(exe_path):
        raise HTTPException(
            status_code=500, 
            detail=f"未找到可执行文件: {exe_path}。请确保 MUMU_SHELL_DIR 环境变量设置正确。"
        )
        
    try:
        if wait:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            return {"status": "success", "output": result.stdout}
        else:
            # 启动模拟器时通常不需要等待其完全启动（可能需要很久）
            subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return {"status": "success", "message": "指令已发送"}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"命令执行失败: {e.output or e.stderr}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"发生未知报错: {str(e)}")

async def delayed_ws_scrcpy_restart():
    """等待 3 分钟，清理 adb，并杀死旧的 ws-scrcpy 进程后重启"""
    print("[后台任务] 启动延时 3 分钟重置连线流程...")
    await asyncio.sleep(180)
    
    print("[后台任务] 清理 ADB 服务...")
    adb_path = os.path.join(MUMU_SHELL_DIR, "adb.exe")
    if os.path.exists(adb_path):
        subprocess.run([adb_path, "kill-server"], check=False, creationflags=subprocess.CREATE_NO_WINDOW)
    else:
        subprocess.run(["adb", "kill-server"], shell=True, check=False, creationflags=subprocess.CREATE_NO_WINDOW)
        
    print("[后台任务] 强制终止旧的 ws-scrcpy Node 进程...")
    # 使用 wmic 依靠命令行参数精准匹配
    kill_cmd = 'wmic process where "name=\'node.exe\' and commandline like \'%ws-scrcpy%\'" call terminate'
    subprocess.run(kill_cmd, shell=True, check=False, creationflags=subprocess.CREATE_NO_WINDOW)
    
    await asyncio.sleep(2)
    
    print("[后台任务] 重启 ws-scrcpy...")
    if os.path.exists(WS_SCRCPY_DIR):
        subprocess.Popen(
            ["node", "index.js"], 
            cwd=WS_SCRCPY_DIR,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW
        )
        print("[后台任务] ws-scrcpy 重启成功。")
    else:
        print(f"[后台任务警告] 未找到 ws-scrcpy 目录: {WS_SCRCPY_DIR}")

async def delayed_restart_process(emulator_id: str):
    """关机后等待20秒，再执行开机，最后继续挂载3分钟重置任务"""
    print(f"[后台任务] {emulator_id} 关机已发送。等待 20 秒令进程完全退出...")
    await asyncio.sleep(20)
    
    print(f"[后台任务] 模拟器 {emulator_id} 开始重新开机...")
    start_args = [MUMU_MANAGER_PATH, "api", "-v", emulator_id, "launch_player"]
    try:
        subprocess.Popen(
            start_args,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW
        )
    except Exception as e:
        print(f"[后台开机报错] {e}")
        
    # 继续跑 3 分钟后重启画面的自愈
    await delayed_ws_scrcpy_restart()


@app.post("/start")
async def start_emulator(req: SimulatorRequest, background_tasks: BackgroundTasks):
    """开机接口: MuMuManager.exe api -v {index} launch_player"""
    args = [MUMU_MANAGER_PATH, "api", "-v", req.emulator_id, "launch_player"]
    background_tasks.add_task(delayed_ws_scrcpy_restart)
    return execute_command(args, wait=False)

@app.post("/stop")
async def stop_emulator(req: SimulatorRequest):
    """关机接口: MuMuManager.exe api -v {index} shutdown_player"""
    args = [MUMU_MANAGER_PATH, "api", "-v", req.emulator_id, "shutdown_player"]
    return execute_command(args, wait=True)

@app.post("/restart")
async def restart_emulator(req: SimulatorRequest, background_tasks: BackgroundTasks):
    """重启接口: 先关机，然后在后台等待 20 秒再开机和挂起等待刷新"""
    # 1. 关机 (同步发送，可能需要一点时间执行)
    stop_args = [MUMU_MANAGER_PATH, "api", "-v", req.emulator_id, "shutdown_player"]
    res = execute_command(stop_args, wait=False)
    
    # 2. 加入后台任务处理: 等待20s -> 开机 -> 等待3min -> 杀adb重启scrcpy
    background_tasks.add_task(delayed_restart_process, req.emulator_id)
    return {"status": "success", "message": "关机指令已发送，大约20秒后将自动开机重启连线"}

@app.get("/status")
async def health_check():
    """检测控制端是否正常存活"""
    return {
        "status": "alive", 
        "manager_exists": os.path.exists(MUMU_MANAGER_PATH)
    }

@app.on_event("startup")
async def startup_event():
    """在这个控制脚本启动时，也顺便把 ws-scrcpy 启动一下"""
    print("[启动检测] 正在尝试启动 ws-scrcpy 连线服务...")
    if os.path.exists(WS_SCRCPY_DIR):
        print("[启动检测] 清理可能的旧 NodeJS 残留进程...")
        kill_cmd = 'wmic process where "name=\'node.exe\' and commandline like \'%ws-scrcpy%\'" call terminate'
        subprocess.run(kill_cmd, shell=True, check=False, creationflags=subprocess.CREATE_NO_WINDOW)
        
        print("[启动检测] 拉起 ws-scrcpy...")
        subprocess.Popen(
            ["node", "index.js"], 
            cwd=WS_SCRCPY_DIR,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW
        )
        print("[启动检测] 启动指令发送完毕。")
    else:
        print(f"[启动检测异常] 未找到 ws-scrcpy 的目录: {WS_SCRCPY_DIR}")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8011))
    print(f"==================================================")
    print(f" 正在启动 Simulator Controller ")
    print(f" 监听端口: {port}")
    print(f" Shell 目录: {MUMU_SHELL_DIR}")
    print(f"==================================================")
    uvicorn.run(app, host="0.0.0.0", port=port)
