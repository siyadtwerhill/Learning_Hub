from fastapi import APIRouter
from app.api.v1.endpoints import auth, rooms, tasks, progress, notifications, analytics, users

router = APIRouter(prefix="/api/v1")
router.include_router(auth.router)
router.include_router(rooms.router)
router.include_router(tasks.router)
router.include_router(progress.router)
router.include_router(notifications.router)
router.include_router(analytics.router)
router.include_router(users.router)
