from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class SimulatorBase(BaseModel):
    """模拟器基础模型"""
    name: str = Field(..., min_length=1, max_length=100, description="模拟器名称")
    ws_scrcpy_url: Optional[str] = Field(None, max_length=500, description="ws-scrcpy远程URL")
    remote_control_url: Optional[str] = Field(None, max_length=500, description="远程控制服务端URL")
    emulator_id: Optional[str] = Field(None, max_length=100, description="模拟器ID")


class SimulatorCreate(SimulatorBase):
    """创建模拟器模型"""
    pass


class SimulatorUpdate(BaseModel):
    """更新模拟器模型"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="模拟器名称")
    ws_scrcpy_url: Optional[str] = Field(None, max_length=500, description="ws-scrcpy远程URL")
    remote_control_url: Optional[str] = Field(None, max_length=500, description="远程控制服务端URL")
    emulator_id: Optional[str] = Field(None, max_length=100, description="模拟器ID")


class SimulatorResponse(SimulatorBase):
    """模拟器响应模型"""
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class AssignSimulatorsRequest(BaseModel):
    """分配模拟器请求模型"""
    simulator_ids: list[int] = Field(..., description="模拟器ID列表")


class TestConnectionRequest(BaseModel):
    """测试连接请求模型"""
    url: str = Field(..., description="远程控制服务端URL")
