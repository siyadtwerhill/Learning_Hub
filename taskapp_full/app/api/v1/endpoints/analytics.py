import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.analytics import PlatformStats, RoomAnalytics, LeaderboardEntryResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics & Leaderboard"])


@router.get("/platform", response_model=PlatformStats)
async def platform_stats(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return await AnalyticsService.get_platform_stats(db)


@router.get("/rooms/{room_id}", response_model=RoomAnalytics)
async def room_analytics(
    room_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    try:
        return await AnalyticsService.get_room_analytics(db, room_id)
    except ValueError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/rooms/{room_id}/leaderboard", response_model=list[LeaderboardEntryResponse])
async def room_leaderboard(
    room_id: uuid.UUID,
    period: str = Query("all_time", pattern="^(all_time|weekly|monthly)$"),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return await AnalyticsService.get_leaderboard(db, room_id, period)
