import os
import subprocess
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="模拟器远端控制服务", description="接收云端请求，控制本地 MuMu 12 开关机")

# MuMu 相关程序的路径，可以从环境变量读取
# 默认路径通常在 MuMu 安装目录的 shell 文件夹下
MUMU_SHELL_DIR = os.getenv("MUMU_SHELL_DIR", r"E:\Program Files\Netease\MuMu\nx_main")
MUMU_PLAYER_PATH = os.path.join(MUMU_SHELL_DIR, "MuMuPlayer.exe")
MUMU_MANAGER_PATH = os.path.join(MUMU_SHELL_DIR, "MuMuManager.exe")

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

@app.post("/start")
async def start_emulator(req: SimulatorRequest):
    """开机接口: MuMuPlayer.exe -v {index}"""
    args = [MUMU_PLAYER_PATH, "-v", req.emulator_id]
    # 启动模拟器使用 Popen 方式，不阻塞接口
    return execute_command(args, wait=False)

@app.post("/stop")
async def stop_emulator(req: SimulatorRequest):
    """关机接口: MuMuManager.exe api -v {index} shutdown_player"""
    args = [MUMU_MANAGER_PATH, "api", "-v", req.emulator_id, "shutdown_player"]
    return execute_command(args, wait=True)

@app.post("/restart")
async def restart_emulator(req: SimulatorRequest):
    """重启接口: 先关机后开机"""
    # 1. 关机 (同步等待完成)
    stop_args = [MUMU_MANAGER_PATH, "api", "-v", req.emulator_id, "shutdown_player"]
    execute_command(stop_args, wait=True)
    
    # 2. 开机 (不阻塞)
    start_args = [MUMU_PLAYER_PATH, "-v", req.emulator_id]
    return execute_command(start_args, wait=False)

@app.get("/status")
async def health_check():
    """检测控制端是否正常存活"""
    return {
        "status": "alive", 
        "player_exists": os.path.exists(MUMU_PLAYER_PATH),
        "manager_exists": os.path.exists(MUMU_MANAGER_PATH)
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8011))
    print(f"==================================================")
    print(f" 正在启动 Simulator Controller ")
    print(f" 监听端口: {port}")
    print(f" Shell 目录: {MUMU_SHELL_DIR}")
    print(f"==================================================")
    uvicorn.run(app, host="0.0.0.0", port=port)
