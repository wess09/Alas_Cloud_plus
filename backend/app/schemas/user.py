from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.user import UserRole


class UserBase(BaseModel):
    """用户基础模型"""
    username: str = Field(..., min_length=1, max_length=50, description="用户名")


class UserCreate(UserBase):
    """创建用户模型"""
    password: str = Field(..., min_length=6, description="密码，至少6位")
    role: UserRole = Field(default=UserRole.USER, description="用户角色")


class UserUpdate(BaseModel):
    """更新用户模型"""
    username: Optional[str] = Field(None, min_length=1, max_length=50, description="用户名")
    password: Optional[str] = Field(None, min_length=6, description="新密码")
    role: Optional[UserRole] = Field(None, description="用户角色")


class UserChangePassword(BaseModel):
    """用户修改密码模型"""
    old_password: str = Field(..., description="原密码")
    new_password: str = Field(..., min_length=6, description="新密码，至少6位")


class UserResponse(UserBase):
    """用户响应模型"""
    id: int
    role: UserRole
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class UserWithInstances(UserResponse):
    """用户及其实例响应模型"""
    instance_ids: List[int] = Field(default_factory=list, description="实例ID列表")
    
    class Config:
        from_attributes = True


class AssignInstancesRequest(BaseModel):
    """分配实例请求模型"""
    instance_ids: List[int] = Field(..., description="实例ID列表")
