from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Simulator(Base):
    """模拟器模型"""
    __tablename__ = "simulators"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    ws_scrcpy_url = Column(String(500), nullable=True)
    remote_control_url = Column(String(500), nullable=True)
    emulator_id = Column(String(100), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # 关联关系
    user_simulators = relationship("UserSimulator", back_populates="simulator", cascade="all, delete-orphan")
