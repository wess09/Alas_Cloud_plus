from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import User, Instance
from app.core.deps import get_current_admin
from app.services import DockerService
import yaml
import os


class ConfigUpdate(BaseModel):
    content: str

router = APIRouter(prefix="/api/admin/docker", tags=["Docker管理"])


@router.post("/instances/{instance_id}/deploy", summary="为实例部署 Docker 容器")
async def deploy_instance(
    instance_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    为指定实例部署 Docker 容器
    
    - **instance_id**: 实例 ID
    
    注意：SSH 用户名将从容器内的 deploy.yaml 配置文件自动读取
    """
    # 获取实例
    instance = db.query(Instance).filter(Instance.id == instance_id).first()
    
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="实例不存在"
        )
    
    # 检查是否已经部署
    if instance.container_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="实例已经部署了容器"
        )
    
    try:
        docker_service = DockerService()
        
        # 创建容器
        container_info = docker_service.create_container(instance.name)
        
        # 更新实例信息
        instance.container_id = container_info['container_id']
        instance.container_name = container_info['container_name']
        instance.config_path = container_info['config_path']
        instance.host_port = container_info['host_port']
        instance.container_status = container_info['status']
        
        # 尝试获取远程 URL（从 deploy.yaml 自动读取 SSH 用户名）
        try:
            remote_url = docker_service.get_remote_url(container_info['config_path'])
            instance.url = remote_url
            
            # 获取 URL 后重启容器以确保配置生效
            print(f"获取 URL 成功 ({remote_url})，正在重启容器...")
            docker_service.restart_container(instance.container_id)
        except Exception as e:
            # 如果无法立即获取 URL，保持原 URL 不变
            print(f"警告：无法获取远程 URL 或重启容器失败: {str(e)}")
        
        db.commit()
        db.refresh(instance)
        
        return {
            "message": "容器部署成功",
            "instance_id": instance_id,
            "container_id": instance.container_id,
            "container_name": instance.container_name,
            "config_path": instance.config_path,
            "host_port": instance.host_port,
            "url": instance.url
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"部署容器失败: {str(e)}"
        )


@router.post("/instances/{instance_id}/start", summary="启动实例容器")
async def start_instance_container(
    instance_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """启动指定实例的 Docker 容器"""
    instance = db.query(Instance).filter(Instance.id == instance_id).first()
    
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="实例不存在"
        )
    
    if not instance.container_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="实例尚未部署容器"
        )
    
    try:
        docker_service = DockerService()
        docker_service.start_container(instance.container_id)
        
        instance.container_status = "running"
        db.commit()
        
        return {"message": "容器启动成功", "instance_id": instance_id}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"启动容器失败: {str(e)}"
        )


@router.post("/instances/{instance_id}/stop", summary="停止实例容器")
async def stop_instance_container(
    instance_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """停止指定实例的 Docker 容器"""
    instance = db.query(Instance).filter(Instance.id == instance_id).first()
    
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="实例不存在"
        )
    
    if not instance.container_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="实例尚未部署容器"
        )
    
    try:
        docker_service = DockerService()
        docker_service.stop_container(instance.container_id)
        
        instance.container_status = "stopped"
        db.commit()
        
        return {"message": "容器停止成功", "instance_id": instance_id}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"停止容器失败: {str(e)}"
        )


@router.delete("/instances/{instance_id}/container", summary="删除实例容器")
async def remove_instance_container(
    instance_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """删除指定实例的 Docker 容器"""
    instance = db.query(Instance).filter(Instance.id == instance_id).first()
    
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="实例不存在"
        )
    
    if not instance.container_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="实例尚未部署容器"
        )
    
    try:
        docker_service = DockerService()
        docker_service.remove_container(instance.container_id)
        
        # 清除容器信息
        instance.container_id = None
        instance.container_name = None
        instance.config_path = None
        instance.host_port = None
        instance.container_status = "removed"
        
        db.commit()
        
        return {"message": "容器删除成功", "instance_id": instance_id}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除容器失败: {str(e)}"
        )


@router.get("/instances/{instance_id}/status", summary="获取实例容器状态")
async def get_instance_container_status(
    instance_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """获取指定实例的 Docker 容器状态"""
    instance = db.query(Instance).filter(Instance.id == instance_id).first()
    
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="实例不存在"
        )
    
    if not instance.container_id:
        return {
            "instance_id": instance_id,
            "has_container": False,
            "message": "实例尚未部署容器"
        }
    
    try:
        docker_service = DockerService()
        container_status = docker_service.get_container_status(instance.container_id)
        
        # 更新数据库中的状态
        instance.container_status = container_status['status']
        db.commit()
        
        return {
            "instance_id": instance_id,
            "has_container": True,
            "container_status": container_status
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取容器状态失败: {str(e)}"
        )


@router.post("/instances/{instance_id}/update-url", summary="更新实例远程 URL")
async def update_instance_remote_url(
    instance_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    更新实例的远程访问 URL
    
    通过 SSH 隧道重新获取远程 URL 并更新到数据库
    注意：SSH 用户名将从 deploy.yaml 配置文件自动读取
    """
    instance = db.query(Instance).filter(Instance.id == instance_id).first()
    
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="实例不存在"
        )
    
    if not instance.config_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="实例配置路径不存在"
        )
    
    try:
        docker_service = DockerService()
        remote_url = docker_service.get_remote_url(instance.config_path)
        
        instance.url = remote_url
        db.commit()
        
        # 获取 URL 后重启容器以确保配置生效
        if instance.container_id:
            try:
                print(f"URL 更新成功 ({remote_url})，正在重启容器...")
                docker_service.restart_container(instance.container_id)
            except Exception as e:
                print(f"警告：重启容器失败: {str(e)}")
        
        return {
            "message": "远程 URL 更新成功（容器已重启）",
            "instance_id": instance_id,
            "url": remote_url
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新远程 URL 失败: {str(e)}"
        )


@router.post("/instances/{instance_id}/restart", summary="重启实例容器")
async def restart_instance_container(
    instance_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """重启指定实例的 Docker 容器"""
    instance = db.query(Instance).filter(Instance.id == instance_id).first()
    
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="实例不存在"
        )
    
    if not instance.container_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="实例尚未部署容器"
        )
    
    try:
        docker_service = DockerService()
        docker_service.restart_container(instance.container_id)
        
        instance.container_status = "running"
        db.commit()
        
        return {"message": "容器重启成功", "instance_id": instance_id}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"重启容器失败: {str(e)}"
        )


@router.get("/instances/{instance_id}/config", summary="获取实例配置")
async def get_instance_config(
    instance_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """获取指定实例的 deploy.yaml 配置内容"""
    instance = db.query(Instance).filter(Instance.id == instance_id).first()
    
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="实例不存在"
        )
    
    if not instance.config_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="实例配置路径不存在"
        )
    
    config_file = os.path.join(instance.config_path, "deploy.yaml")
    
    if not os.path.exists(config_file):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="配置文件不存在"
        )
    
    try:
        with open(config_file, 'r', encoding='utf-8') as f:
            content = f.read()
        return {"content": content, "instance_id": instance_id}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"读取配置文件失败: {str(e)}"
        )


@router.put("/instances/{instance_id}/config", summary="更新实例配置")
async def update_instance_config(
    instance_id: int,
    config_data: ConfigUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """更新指定实例的 deploy.yaml 配置"""
    instance = db.query(Instance).filter(Instance.id == instance_id).first()
    
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="实例不存在"
        )
    
    if not instance.config_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="实例配置路径不存在"
        )
    
    # 验证 YAML 格式
    try:
        yaml.safe_load(config_data.content)
    except yaml.YAMLError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"YAML 格式错误: {str(e)}"
        )
    
    config_file = os.path.join(instance.config_path, "deploy.yaml")
    
    try:
        with open(config_file, 'w', encoding='utf-8') as f:
            f.write(config_data.content)
        return {"message": "配置更新成功", "instance_id": instance_id}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"保存配置文件失败: {str(e)}"
        )
