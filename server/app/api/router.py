from fastapi import APIRouter

from app.api.routes import chat, health, repos

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(repos.router, prefix="/repos", tags=["repos"])
api_router.include_router(chat.router, prefix="/repos", tags=["chat"])
