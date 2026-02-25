from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import requests
from app.database import get_db
from app.schemas.simulator import (
    SimulatorCreate, 
    SimulatorUpdate, 
    SimulatorResponse, 
    AssignSimulatorsRequest,
    TestConnectionRequest
)
from app.models import User, Simulator, UserSimulator, UserRole
from app.core.deps import get_current_admin, get_current_user

router = APIRouter(tags=["模拟器"])

# ==================== 管理员：模拟器管理 ====================

@router.get("/api/admin/simulators", response_model=List[SimulatorResponse], summary="获取所有模拟器")
def get_all_simulators(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """获取所有模拟器（管理员权限）"""
    return db.query(Simulator).offset(skip).limit(limit).all()


@router.post("/api/admin/simulators/test-connection", summary="测试远程控制后端连通性")
def test_simulator_connection(
    test_data: TestConnectionRequest,
    current_admin: User = Depends(get_current_admin)
):
    """
    由云端后端发起请求，测试配置的 remote_control_url 是否可用。
    这可以验证云端与远端机器之间的网络服务是否畅通。
    """
    target_url = f"{test_data.url.rstrip('/')}/status"
    try:
        response = requests.get(target_url, timeout=5)
        response.raise_for_status()
        return {
            "status": "success", 
            "message": "连接成功", 
            "remote_info": response.json()
        }
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, 
            detail=f"连接失败: {str(e)}"
        )


@router.post("/api/admin/simulators", response_model=SimulatorResponse, summary="创建模拟器", status_code=status.HTTP_201_CREATED)
def create_simulator(
    simulator_data: SimulatorCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """创建新模拟器（管理员权限）"""
    new_simulator = Simulator(**simulator_data.model_dump())
    db.add(new_simulator)
    db.commit()
    db.refresh(new_simulator)
    return new_simulator


@router.put("/api/admin/simulators/{simulator_id}", response_model=SimulatorResponse, summary="更新模拟器")
def update_simulator(
    simulator_id: int,
    simulator_data: SimulatorUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """更新模拟器信息（管理员权限）"""
    simulator = db.query(Simulator).filter(Simulator.id == simulator_id).first()
    if not simulator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="模拟器不存在")
    
    update_data = simulator_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(simulator, key, value)
    
    db.commit()
    db.refresh(simulator)
    return simulator


@router.delete("/api/admin/simulators/{simulator_id}", summary="删除模拟器", status_code=status.HTTP_204_NO_CONTENT)
def delete_simulator(
    simulator_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """删除模拟器（管理员权限）"""
    simulator = db.query(Simulator).filter(Simulator.id == simulator_id).first()
    if not simulator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="模拟器不存在")
    db.delete(simulator)
    db.commit()
    return None


@router.post("/api/admin/users/{user_id}/simulators", summary="为用户分配模拟器", status_code=status.HTTP_200_OK)
def assign_simulators(
    user_id: int,
    assign_data: AssignSimulatorsRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """为用户分配模拟器权限（管理员权限），会覆盖原有分配"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    
    simulators = db.query(Simulator).filter(Simulator.id.in_(assign_data.simulator_ids)).all()
    if len(simulators) != len(assign_data.simulator_ids):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="部分模拟器ID不存在")
    
    db.query(UserSimulator).filter(UserSimulator.user_id == user_id).delete()
    for sim_id in assign_data.simulator_ids:
        db.add(UserSimulator(user_id=user_id, simulator_id=sim_id))
    db.commit()
    
    return {"message": "模拟器分配成功", "user_id": user_id, "simulator_ids": assign_data.simulator_ids}


# ==================== 用户：我的模拟器 ====================

@router.get("/api/user/simulators", response_model=List[SimulatorResponse], summary="获取我的模拟器")
def get_user_simulators(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取当前用户被分配的模拟器列表"""
    user_simulators = db.query(UserSimulator).filter(UserSimulator.user_id == current_user.id).all()
    sim_ids = [us.simulator_id for us in user_simulators]
    return db.query(Simulator).filter(Simulator.id.in_(sim_ids)).all()


@router.post("/api/user/simulators/{simulator_id}/{action}", summary="控制模拟器开/关/重启")
def control_simulator(
    simulator_id: int,
    action: str,  # "start", "stop" or "restart"
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """通过云端代理，向远程的独立服务端发送控制指令"""
    if action not in ["start", "stop", "restart"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="不支持的操作。只能是 'start', 'stop' 或 'restart'")
        
    user_simulator = db.query(UserSimulator).filter(
        UserSimulator.user_id == current_user.id,
        UserSimulator.simulator_id == simulator_id
    ).first()
    
    if not user_simulator:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问此模拟器")
        
    simulator = db.query(Simulator).filter(Simulator.id == simulator_id).first()
    if not simulator.remote_control_url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该模拟器未配置远程控制 URL")
    
    target_url = f"{simulator.remote_control_url.rstrip('/')}/{action}"
    
    try:
        response = requests.post(
            target_url, 
            json={"emulator_id": simulator.emulator_id},
            timeout=15 if action == "restart" else 10
        )
        response.raise_for_status()
        return {"message": f"指令 {action} 执行成功", "remote_response": response.json()}
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, 
            detail=f"访问远程模拟器控制端失败: {str(e)}"
        )
