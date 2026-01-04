from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Instance(Base):
    """实例模型"""
    __tablename__ = "instances"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    url = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    
    # Docker 容器信息
    container_id = Column(String(100), nullable=True)  # Docker 容器 ID
    container_name = Column(String(100), nullable=True)  # 容器名称
    config_path = Column(String(500), nullable=True)  # 配置文件路径
    host_port = Column(Integer, nullable=True)  # 主机端口
    container_status = Column(String(50), default="created")  # 容器状态
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # 关联关系
    user_instances = relationship("UserInstance", back_populates="instance", cascade="all, delete-orphan")
