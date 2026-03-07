import os
import subprocess
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import uvicorn

@asynccontextmanager
async def lifespan(app: FastAPI):
    """在这个控制脚本启动时(lifespan)，也顺便把 ws-scrcpy 启动一下"""
    print("[启动检测] 正在尝试启动 ws-scrcpy 连线服务...")
    _start_ws_scrcpy()
    yield
    # 可以在此处添加关闭脚本时的清理逻辑，例如: _stop_ws_scrcpy()

app = FastAPI(title="模拟器远端控制服务", description="接收云端请求，控制本地 MuMu 12 开关机", lifespan=lifespan)

# MuMu 相关程序的路径，可以从环境变量读取
# 默认路径通常在 MuMu 安装目录的 shell 文件夹下
MUMU_SHELL_DIR = os.getenv("MUMU_SHELL_DIR", r"E:\Program Files\Netease\MuMu\nx_main")
MUMU_MANAGER_PATH = os.path.join(MUMU_SHELL_DIR, "MuMuManager.exe")
WS_SCRCPY_DIR = os.getenv("WS_SCRCPY_DIR", r"C:\Users\xf\ws-scrcpy\dist")

# 全局持有 ws-scrcpy 子进程对象，方便精确终止
_ws_scrcpy_process: subprocess.Popen | None = None


class SimulatorRequest(BaseModel):
    emulator_id: str


def _start_ws_scrcpy():
    """启动 ws-scrcpy 并将其作为子进程管理"""
    global _ws_scrcpy_process
    if not os.path.exists(WS_SCRCPY_DIR):
        print(f"[ws-scrcpy] 未找到目录: {WS_SCRCPY_DIR}，跳过启动。")
        return
    main_js_path = os.path.join(WS_SCRCPY_DIR, "index.js")
    _ws_scrcpy_process = subprocess.Popen(
        ["node", main_js_path, "-max-fps", "30", "--video-bit-rate", "2M", "--max-size", "1024"],
        cwd=WS_SCRCPY_DIR,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=subprocess.CREATE_NO_WINDOW,
    )
    print(f"[ws-scrcpy] 已启动 (PID={_ws_scrcpy_process.pid})。")


def _stop_ws_scrcpy():
    """安全终止当前的 ws-scrcpy 子进程及其进程树，并清理遗留进程"""
    global _ws_scrcpy_process
    
    # 1. 如果有绑定的进程对象，使用 taskkill 杀掉整棵进程树（避免残留无子进程的孤儿）
    if _ws_scrcpy_process is not None:
        pid = _ws_scrcpy_process.pid
        try:
            print(f"[ws-scrcpy] 尝试终止 PID={pid} 及其子进程树...")
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NO_WINDOW
            )
            print(f"[ws-scrcpy] 子进程 (PID={pid}) 及其进程树已被终止。")
        except Exception as e:
            print(f"[ws-scrcpy] 终止子进程树时出错: {e}")
        finally:
            _ws_scrcpy_process = None
    else:
        print("[ws-scrcpy] 没有正在运行的子进程对象。")

    # 2. 补刀操作：清理因服务意外退出而遗留的特定 ws-scrcpy Node进程
    try:
        subprocess.run(
            'wmic process where "name=\'node.exe\' and commandline like \'%ws-scrcpy%\'" call terminate',
            shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=subprocess.CREATE_NO_WINDOW
        )
    except Exception:
        pass


def execute_command(cmd: list, wait: bool = True):
    """执行命令行指令"""
    exe_path = cmd[0]
    if not os.path.exists(exe_path):
        raise HTTPException(
            status_code=500,
            detail=f"未找到可执行文件: {exe_path}。请确保 MUMU_SHELL_DIR 环境变量设置正确。",
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
    """等待 1 分钟，清理 adb，然后重启自己的 ws-scrcpy 子进程"""
    print("[后台任务] 启动延时 1 分钟重置连线流程...")
    await asyncio.sleep(60)

    print("[后台任务] 清理 ADB 服务...")
    adb_path = os.path.join(MUMU_SHELL_DIR, "adb.exe")
    if os.path.exists(adb_path):
        subprocess.run([adb_path, "kill-server"], check=False, creationflags=subprocess.CREATE_NO_WINDOW)
    else:
        subprocess.run(["adb", "kill-server"], shell=True, check=False, creationflags=subprocess.CREATE_NO_WINDOW)

    print("[后台任务] 终止当前 ws-scrcpy 子进程...")
    _stop_ws_scrcpy()

    print("[后台任务] 等待 10 秒后重启 ws-scrcpy...")
    await asyncio.sleep(30)

    print("[后台任务] 重启 ws-scrcpy...")
    _start_ws_scrcpy()


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
            creationflags=subprocess.CREATE_NO_WINDOW,
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
    # 1. 关机
    stop_args = [MUMU_MANAGER_PATH, "api", "-v", req.emulator_id, "shutdown_player"]
    execute_command(stop_args, wait=False)

    # 2. 加入后台任务处理: 等待20s -> 开机 -> 等待3min -> 杀adb重启scrcpy
    background_tasks.add_task(delayed_restart_process, req.emulator_id)
    return {"status": "success", "message": "关机指令已发送，大约20秒后将自动开机重启连线"}


@app.get("/status")
async def health_check():
    """检测控制端是否正常存活"""
    return {
        "status": "alive",
        "manager_exists": os.path.exists(MUMU_MANAGER_PATH),
        "ws_scrcpy_running": _ws_scrcpy_process is not None and _ws_scrcpy_process.poll() is None,
    }


# (旧版 startup 事件已替换为 lifespan)


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8011))
    print(f"==================================================")
    print(f" 正在启动 Simulator Controller ")
    print(f" 监听端口: {port}")
    print(f" Shell 目录: {MUMU_SHELL_DIR}")
    print(f"==================================================")
    uvicorn.run(app, host="0.0.0.0", port=port)
