from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_teacher
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.auth import UserSearchResponse

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/search", response_model=UserSearchResponse)
async def search_student_by_email(
    email: str = Query(...),
    db: AsyncSession = Depends(get_db),
    _teacher: User = Depends(require_teacher),
):
    result = await db.execute(
        select(User).where(
            func.lower(User.email) == email.lower(),
            User.role == UserRole.STUDENT,
            User.is_active == True,
        )
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )
    return student
