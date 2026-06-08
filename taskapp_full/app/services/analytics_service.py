import uuid

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.models.room import Room, RoomMembership, MembershipStatus
from app.models.task import Task, TaskAssignment, TaskStatus
from app.models.progress import UserStreak
from app.models.leaderboard import LeaderboardEntry
from app.schemas.analytics import PlatformStats, RoomAnalytics, LeaderboardEntryResponse


class AnalyticsService:

    @staticmethod
    async def get_platform_stats(db: AsyncSession) -> PlatformStats:
        def count_role(role):
            return select(func.count()).where(User.role == role)

        total_users = (await db.execute(select(func.count()).select_from(User))).scalar()
        total_teachers = (await db.execute(count_role(UserRole.TEACHER))).scalar()
        total_students = (await db.execute(count_role(UserRole.STUDENT))).scalar()
        total_independent = (await db.execute(count_role(UserRole.INDEPENDENT))).scalar()
        total_rooms = (await db.execute(select(func.count()).select_from(Room))).scalar()
        total_tasks = (await db.execute(select(func.count()).select_from(Task))).scalar()
        total_completed = (await db.execute(
            select(func.count()).where(TaskAssignment.status == TaskStatus.DONE)
        )).scalar()
        total_assignments = (await db.execute(select(func.count()).select_from(TaskAssignment))).scalar()
        completion_rate = round((total_completed / total_assignments * 100), 2) if total_assignments > 0 else 0.0

        return PlatformStats(
            total_users=total_users,
            total_teachers=total_teachers,
            total_students=total_students,
            total_independent=total_independent,
            total_rooms=total_rooms,
            total_tasks=total_tasks,
            total_completed_tasks=total_completed,
            platform_completion_rate=completion_rate,
        )

    @staticmethod
    async def get_room_analytics(db: AsyncSession, room_id: uuid.UUID) -> RoomAnalytics:
        room_result = await db.execute(select(Room).where(Room.id == room_id))
        room = room_result.scalar_one_or_none()
        if not room:
            raise ValueError("Room not found")

        members_count = (await db.execute(
            select(func.count()).where(
                RoomMembership.room_id == room_id,
                RoomMembership.status == MembershipStatus.APPROVED,
            )
        )).scalar()

        tasks_count = (await db.execute(
            select(func.count()).where(Task.room_id == room_id)
        )).scalar()

        # Get all assignments for tasks in this room
        room_task_ids_result = await db.execute(
            select(Task.id).where(Task.room_id == room_id)
        )
        room_task_ids = list(room_task_ids_result.scalars().all())

        completed_count = 0
        total_assignments = 0
        if room_task_ids:
            completed_count = (await db.execute(
                select(func.count()).where(
                    TaskAssignment.task_id.in_(room_task_ids),
                    TaskAssignment.status == TaskStatus.DONE,
                )
            )).scalar()
            total_assignments = (await db.execute(
                select(func.count()).where(TaskAssignment.task_id.in_(room_task_ids))
            )).scalar()

        completion_rate = round((completed_count / total_assignments * 100), 2) if total_assignments > 0 else 0.0

        # Avg streak of members
        members_result = await db.execute(
            select(RoomMembership.student_id).where(
                RoomMembership.room_id == room_id,
                RoomMembership.status == MembershipStatus.APPROVED,
            )
        )
        member_ids = list(members_result.scalars().all())
        avg_streak = 0.0
        if member_ids:
            streaks_result = await db.execute(
                select(UserStreak).where(UserStreak.user_id.in_(member_ids))
            )
            streaks = list(streaks_result.scalars().all())
            avg_streak = round(sum(s.current_streak for s in streaks) / len(member_ids), 2)

        return RoomAnalytics(
            room_id=room_id,
            room_name=room.name,
            total_students=members_count,
            total_tasks=tasks_count,
            completed_tasks=completed_count,
            completion_rate=completion_rate,
            avg_streak=avg_streak,
        )

    @staticmethod
    async def get_leaderboard(db: AsyncSession, room_id: uuid.UUID, period: str = "all_time") -> list[LeaderboardEntryResponse]:
        # Get approved members
        members_result = await db.execute(
            select(RoomMembership.student_id).where(
                RoomMembership.room_id == room_id,
                RoomMembership.status == MembershipStatus.APPROVED,
            )
        )
        member_ids = list(members_result.scalars().all())

        entries = []
        for student_id in member_ids:
            user_result = await db.execute(select(User).where(User.id == student_id))
            user = user_result.scalar_one_or_none()
            if not user:
                continue

            completed = (await db.execute(
                select(func.count()).where(
                    TaskAssignment.student_id == student_id,
                    TaskAssignment.status == TaskStatus.DONE,
                )
            )).scalar()

            streak_result = await db.execute(select(UserStreak).where(UserStreak.user_id == student_id))
            streak = streak_result.scalar_one_or_none()
            streak_bonus = streak.current_streak * 5 if streak else 0
            points = (completed * 10) + streak_bonus

            entries.append(LeaderboardEntryResponse(
                rank=0,  # Will be set below
                student_id=student_id,
                username=user.username,
                full_name=user.full_name,
                points=points,
                tasks_completed=completed,
                streak_bonus=streak_bonus,
            ))

        entries.sort(key=lambda x: x.points, reverse=True)
        for i, entry in enumerate(entries):
            entry.rank = i + 1

        return entries
