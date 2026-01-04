from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db
from app.api import auth_router, admin_router, user_router, docker_router

# 创建 FastAPI 应用
app = FastAPI(
    title=settings.APP_NAME,
    description="前后端分离的用户管理系统 API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

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


@app.on_event("startup")
def on_startup():
    """应用启动时初始化数据库"""
    from app.database import SessionLocal, Base, engine
    from app.models import User, UserRole
    import bcrypt
    
    # 初始化数据库表结构
    init_db()
    
    # 检查并创建默认管理员账号
    db = SessionLocal()
    try:
        existing_admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if not existing_admin:
            # 创建默认管理员
            password = "admin123"
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            admin = User(
                username="admin",
                password_hash=password_hash,
                role=UserRole.ADMIN
            )
            db.add(admin)
            db.commit()
            print("✓ 默认管理员账号已创建")
            print("  用户名: admin")
            print("  密码: admin123")
        else:
            print("✓ 管理员账号已存在")
    except Exception as e:
        print(f"⚠ 初始化默认数据时出错: {e}")
        db.rollback()
    finally:
        db.close()


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
