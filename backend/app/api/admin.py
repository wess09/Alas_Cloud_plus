from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas import (
    UserCreate, UserUpdate, UserResponse, UserWithInstances,
    InstanceCreate, InstanceUpdate, InstanceResponse,
    AssignInstancesRequest
)
from app.models import User, Instance, UserInstance, UserRole
from app.core.security import get_password_hash
from app.core.deps import get_current_admin

router = APIRouter(prefix="/api/admin", tags=["管理员"])


# ==================== 用户管理 ====================

@router.get("/users", response_model=List[UserWithInstances], summary="获取用户列表")
def get_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    获取所有用户列表（管理员权限）
    
    - **skip**: 跳过的记录数
    - **limit**: 返回的最大记录数
    """
    users = db.query(User).offset(skip).limit(limit).all()
    
    # 为每个用户添加实例ID列表
    result = []
    for user in users:
        user_dict = {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
            "instance_ids": [ui.instance_id for ui in user.user_instances]
        }
        result.append(UserWithInstances(**user_dict))
    
    return result


@router.get("/users/{user_id}", response_model=UserWithInstances, summary="获取用户详情")
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """获取指定用户的详细信息（管理员权限）"""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    user_dict = {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "instance_ids": [ui.instance_id for ui in user.user_instances]
    }
    
    return UserWithInstances(**user_dict)


@router.post("/users", response_model=UserResponse, summary="创建用户", status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    创建新用户（管理员权限）
    
    - **username**: 用户名
    - **password**: 密码
    - **role**: 用户角色（admin/user）
    """
    # 检查用户名是否已存在
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已存在"
        )
    
    # 创建用户
    new_user = User(
        username=user_data.username,
        password_hash=get_password_hash(user_data.password),
        role=user_data.role
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user


@router.put("/users/{user_id}", response_model=UserResponse, summary="更新用户")
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    更新用户信息（管理员权限）
    
    - **username**: 新用户名（可选）
    - **password**: 新密码（可选）
    - **role**: 新角色（可选）
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 更新字段
    if user_data.username is not None:
        # 检查新用户名是否已被使用
        existing = db.query(User).filter(
            User.username == user_data.username,
            User.id != user_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="用户名已存在"
            )
        user.username = user_data.username
    
    if user_data.password is not None:
        user.password_hash = get_password_hash(user_data.password)
    
    if user_data.role is not None:
        user.role = user_data.role
    
    db.commit()
    db.refresh(user)
    
    return user


@router.delete("/users/{user_id}", summary="删除用户", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """删除用户（管理员权限）"""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 不允许删除自己
    if user.id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能删除自己的账号"
        )
    
    db.delete(user)
    db.commit()
    
    return None


# ==================== 实例管理 ====================

@router.get("/instances", response_model=List[InstanceResponse], summary="获取实例列表")
def get_instances(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    获取所有实例列表（管理员权限）
    
    - **skip**: 跳过的记录数
    - **limit**: 返回的最大记录数
    """
    instances = db.query(Instance).offset(skip).limit(limit).all()
    return instances


@router.get("/instances/{instance_id}", response_model=InstanceResponse, summary="获取实例详情")
def get_instance(
    instance_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """获取指定实例的详细信息（管理员权限）"""
    instance = db.query(Instance).filter(Instance.id == instance_id).first()
    
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="实例不存在"
        )
    
    return instance


@router.post("/instances", response_model=InstanceResponse, summary="创建实例", status_code=status.HTTP_201_CREATED)
def create_instance(
    instance_data: InstanceCreate,
    auto_deploy: bool = False,  # 是否自动部署 Docker 容器
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    创建新实例（管理员权限）
    
    - **name**: 实例名称
    - **url**: 实例URL
    - **description**: 实例描述（可选）
    - **auto_deploy**: 是否自动部署 Docker 容器（可选）
    """
    new_instance = Instance(
        name=instance_data.name,
        url=instance_data.url,
        description=instance_data.description
    )
    
    db.add(new_instance)
    db.commit()
    db.refresh(new_instance)
    
    # 如果启用自动部署，创建 Docker 容器
    if auto_deploy:
        try:
            from app.services import DockerService
            docker_service = DockerService()
            
            # 创建容器
            container_info = docker_service.create_container(new_instance.name)
            
            # 更新实例信息
            new_instance.container_id = container_info['container_id']
            new_instance.container_name = container_info['container_name']
            new_instance.config_path = container_info['config_path']
            new_instance.host_port = container_info['host_port']
            new_instance.container_status = container_info['status']
            
            # 尝试获取远程 URL（从 deploy.yaml 自动读取 SSH 用户名）
            try:
                remote_url = docker_service.get_remote_url(container_info['config_path'])
                new_instance.url = remote_url
                
                # 获取 URL 后重启容器以确保配置生效
                print(f"获取 URL 成功 ({remote_url})，正在重启容器...")
                docker_service.restart_container(new_instance.container_id)
            except Exception as e:
                print(f"警告：无法获取远程 URL 或重启容器失败: {str(e)}")
            
            db.commit()
            db.refresh(new_instance)
            
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"自动部署容器失败: {str(e)}"
            )
    
    return new_instance


@router.put("/instances/{instance_id}", response_model=InstanceResponse, summary="更新实例")
def update_instance(
    instance_id: int,
    instance_data: InstanceUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    更新实例信息（管理员权限）
    
    - **name**: 新名称（可选）
    - **url**: 新URL（可选）
    - **description**: 新描述（可选）
    """
    instance = db.query(Instance).filter(Instance.id == instance_id).first()
    
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="实例不存在"
        )
    
    # 更新字段
    if instance_data.name is not None:
        instance.name = instance_data.name
    
    if instance_data.url is not None:
        instance.url = instance_data.url
    
    if instance_data.description is not None:
        instance.description = instance_data.description
    
    db.commit()
    db.refresh(instance)
    
    return instance


@router.delete("/instances/{instance_id}", summary="删除实例", status_code=status.HTTP_204_NO_CONTENT)
def delete_instance(
    instance_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """删除实例（管理员权限）"""
    instance = db.query(Instance).filter(Instance.id == instance_id).first()
    
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="实例不存在"
        )
    
    db.delete(instance)
    db.commit()
    
    return None


# ==================== 用户实例权限管理 ====================

@router.post("/users/{user_id}/instances", summary="为用户分配实例", status_code=status.HTTP_200_OK)
def assign_instances(
    user_id: int,
    assign_data: AssignInstancesRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    为用户分配实例访问权限（管理员权限）
    
    - **instance_ids**: 实例ID列表
    
    该操作会替换用户当前的所有实例权限
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 验证所有实例ID是否存在
    instances = db.query(Instance).filter(Instance.id.in_(assign_data.instance_ids)).all()
    if len(instances) != len(assign_data.instance_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="部分实例ID不存在"
        )
    
    # 删除用户现有的所有实例关联
    db.query(UserInstance).filter(UserInstance.user_id == user_id).delete()
    
    # 创建新的关联
    for instance_id in assign_data.instance_ids:
        user_instance = UserInstance(user_id=user_id, instance_id=instance_id)
        db.add(user_instance)
    
    db.commit()
    
    return {"message": "实例分配成功", "user_id": user_id, "instance_ids": assign_data.instance_ids}


@router.delete("/users/{user_id}/instances/{instance_id}", summary="取消用户实例访问权限", status_code=status.HTTP_204_NO_CONTENT)
def revoke_instance(
    user_id: int,
    instance_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """取消用户对特定实例的访问权限（管理员权限）"""
    user_instance = db.query(UserInstance).filter(
        UserInstance.user_id == user_id,
        UserInstance.instance_id == instance_id
    ).first()
    
    if not user_instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户实例关联不存在"
        )
    
    db.delete(user_instance)
    db.commit()
    
    return None
