from app.api.auth import router as auth_router
from app.api.admin import router as admin_router
from app.api.user import router as user_router
from app.api.docker import router as docker_router

__all__ = ["auth_router", "admin_router", "user_router", "docker_router"]
