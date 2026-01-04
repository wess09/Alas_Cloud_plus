from pydantic import BaseModel, Field, HttpUrl
from typing import Optional
from datetime import datetime


class InstanceBase(BaseModel):
    """实例基础模型"""
    name: str = Field(..., min_length=1, max_length=100, description="实例名称")
    url: Optional[str] = Field(None, max_length=500, description="实例URL")
    description: Optional[str] = Field(None, description="实例描述")


class InstanceCreate(InstanceBase):
    """创建实例模型"""
    pass


class InstanceUpdate(BaseModel):
    """更新实例模型"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="实例名称")
    url: Optional[str] = Field(None, min_length=1, max_length=500, description="实例URL")
    description: Optional[str] = Field(None, description="实例描述")


class InstanceResponse(InstanceBase):
    """实例响应模型"""
    id: int
    container_id: Optional[str] = None
    container_name: Optional[str] = None
    config_path: Optional[str] = None
    host_port: Optional[int] = None
    container_status: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

