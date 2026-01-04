from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas import UserResponse, UserChangePassword, InstanceResponse
from app.models import User, Instance, UserInstance
from app.core.security import verify_password, get_password_hash
from app.core.deps import get_current_user

router = APIRouter(prefix="/api/user", tags=["用户"])


@router.get("/profile", response_model=UserResponse, summary="获取个人信息")
def get_profile(
    current_user: User = Depends(get_current_user)
):
    """获取当前登录用户的个人信息"""
    return current_user


@router.get("/instances", response_model=List[InstanceResponse], summary="获取可访问的实例列表")
def get_user_instances(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取当前用户可访问的所有实例
    
    返回用户被分配的实例列表
    """
    # 查询用户的实例关联
    user_instances = db.query(UserInstance).filter(
        UserInstance.user_id == current_user.id
    ).all()
    
    # 获取实例详情
    instance_ids = [ui.instance_id for ui in user_instances]
    instances = db.query(Instance).filter(Instance.id.in_(instance_ids)).all()
    
    return instances


@router.put("/password", summary="修改密码")
def change_password(
    password_data: UserChangePassword,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    用户修改自己的密码
    
    - **old_password**: 当前密码
    - **new_password**: 新密码
    """
    # 验证原密码
    if not verify_password(password_data.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="原密码错误"
        )
    
    # 更新密码
    current_user.password_hash = get_password_hash(password_data.new_password)
    db.commit()
    
    return {"message": "密码修改成功"}
