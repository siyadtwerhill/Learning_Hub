import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_teacher
from app.db.session import get_db
from app.models.user import User
from app.schemas.progress import StreakResponse, DailySummaryResponse, StudentProgressResponse
from app.services.progress_service import ProgressService

router = APIRouter(prefix="/progress", tags=["Progress"])


@router.get("/streak", response_model=StreakResponse | None)
async def my_streak(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ProgressService.get_streak(db, current_user.id)


@router.get("/daily", response_model=DailySummaryResponse)
async def daily_summary(
    target_date: date = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    d = target_date or date.today()
    return await ProgressService.get_daily_summary(db, current_user.id, d)


@router.get("/room/{room_id}/students", response_model=list[StudentProgressResponse])
async def room_student_progress(
    room_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    return await ProgressService.get_student_progress_in_room(db, room_id)
