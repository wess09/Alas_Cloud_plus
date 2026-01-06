from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db
from app.api import auth_router, admin_router, user_router, docker_router
from app.services.health_checker import HealthCheckService
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from contextlib import asynccontextmanager

# FastAPI 应用定义已移至下方以支持 lifespan

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(user_router)
app.include_router(docker_router)


    finally:
        db.close()

# 创建调度器
scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时执行
    on_startup()
    
    # 启动调度器
    scheduler.add_job(HealthCheckService.check_all_instances, 'interval', minutes=1, id='health_check')
    scheduler.start()
    print("✓ 定时任务调度器已启动")
    
    yield
    
    # 关闭时执行
    scheduler.shutdown()
    print("✓ 定时任务调度器已关闭")


# 创建 FastAPI 应用
app = FastAPI(
    title=settings.APP_NAME,
    description="前后端分离的用户管理系统 API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)


@app.get("/", tags=["根路径"])
def root():
    """API 根路径"""
    return {
        "message": "用户管理系统 API",
        "version": "1.0.0",
        "docs": "/api/docs",
        "redoc": "/api/redoc"
    }


@app.get("/api/health", tags=["健康检查"])
def health_check():
    """健康检查接口"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)
