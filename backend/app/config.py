from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """应用配置"""
    
    # 数据库配置
    DATABASE_URL: str = "sqlite:///./app.db"
    
    # JWT 配置
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS 配置
    CORS_ORIGINS: list = ["*"]
    
    # 应用配置
    APP_NAME: str = "用户管理系统"
    DEBUG: bool = True
    
    # Docker 配置
    DOCKER_IMAGE: str = "hajiming/azurlaneautoscript:latest"
    DOCKER_BASE_PATH: str = "/home/nero/alas"  # 配置文件基础路径
    DOCKER_CONTAINER_PREFIX: str = "alas"  # 容器名前缀
    DOCKER_SSH_SERVER: str = "app.hk1.azurlane.cloud:10022"  # SSH 服务器地址

    
    class Config:
        env_file = ".env"


settings = Settings()
