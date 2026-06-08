import uuid
from datetime import date

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.progress import UserStreak, DailySummary
from app.models.task import Task, TaskAssignment, TaskStatus
from app.models.room import RoomMembership, MembershipStatus
from app.models.user import User
from app.schemas.progress import StreakResponse, DailySummaryResponse, StudentProgressResponse


class ProgressService:

    @staticmethod
    async def get_streak(db: AsyncSession, user_id: uuid.UUID) -> UserStreak | None:
        result = await db.execute(select(UserStreak).where(UserStreak.user_id == user_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_daily_summary(db: AsyncSession, user_id: uuid.UUID, target_date: date) -> DailySummaryResponse:
        result = await db.execute(
            select(TaskAssignment).where(
                and_(
                    TaskAssignment.student_id == user_id,
                    TaskAssignment.assigned_date == target_date,
                )
            )
        )
        assignments = list(result.scalars().all())

        total = len(assignments)
        completed = sum(1 for a in assignments if a.status == TaskStatus.DONE)
        overdue = sum(1 for a in assignments if a.status == TaskStatus.OVERDUE)
        rate = round((completed / total * 100), 2) if total > 0 else 0.0

        return DailySummaryResponse(
            user_id=user_id,
            summary_date=target_date,
            total_tasks=total,
            completed_tasks=completed,
            overdue_tasks=overdue,
            completion_rate=rate,
        )

    @staticmethod
    async def get_student_progress_in_room(db: AsyncSession, room_id: uuid.UUID) -> list[StudentProgressResponse]:
        # Get all approved members
        members_result = await db.execute(
            select(RoomMembership).where(
                and_(
                    RoomMembership.room_id == room_id,
                    RoomMembership.status == MembershipStatus.APPROVED,
                )
            )
        )
        memberships = list(members_result.scalars().all())

        progress_list = []
        for membership in memberships:
            student_id = membership.student_id

            # Get user info
            user_result = await db.execute(select(User).where(User.id == student_id))
            user = user_result.scalar_one_or_none()
            if not user:
                continue

            # Get assignments for tasks that belong to this room only.
            assign_result = await db.execute(
                select(TaskAssignment)
                .join(Task, Task.id == TaskAssignment.task_id)
                .where(
                    and_(
                        TaskAssignment.student_id == student_id,
                        Task.room_id == room_id,
                    )
                )
            )
            assignments = list(assign_result.scalars().all())
            total = len(assignments)
            completed = sum(1 for a in assignments if a.status == TaskStatus.DONE)
            rate = round((completed / total * 100), 2) if total > 0 else 0.0

            # Get streak
            streak_result = await db.execute(select(UserStreak).where(UserStreak.user_id == student_id))
            streak = streak_result.scalar_one_or_none()

            progress_list.append(StudentProgressResponse(
                student_id=student_id,
                username=user.username,
                full_name=user.full_name,
                total_tasks=total,
                completed_tasks=completed,
                completion_rate=rate,
                current_streak=streak.current_streak if streak else 0,
            ))

        return progress_list
