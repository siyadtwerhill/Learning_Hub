import uuid
from datetime import date, datetime

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.room import RoomMembership, MembershipStatus
from app.models.room import Room
from app.models.task import Task, TaskAssignment, TaskStatus, TaskComment, TaskAttachment
from app.models.notification import Notification, NotificationType
from app.models.progress import UserStreak, DailySummary
from app.models.user import User
from app.schemas.task import CreateTaskRequest, CreateSoloTaskRequest, UpdateTaskRequest, CreateCommentRequest, CreateAttachmentRequest
from app.core.websocket_manager import manager


class TaskService:

    @staticmethod
    async def create_task(db: AsyncSession, created_by: uuid.UUID, data: CreateTaskRequest) -> Task:
        task = Task(
            title=data.title,
            description=data.description,
            priority=data.priority,
            due_date=data.due_date,
            room_id=data.room_id,
            created_by=created_by,
            is_daily=data.is_daily,
            is_solo=False,
        )
        db.add(task)
        await db.flush()  # get task.id before assigning

        today = date.today()
        created_assignments = []
        room_name = None

        if data.room_id:
            room_result = await db.execute(select(Room).where(Room.id == data.room_id))
            room = room_result.scalar_one_or_none()
            room_name = room.name if room else None

            # Determine who to assign to
            if data.assign_to:
                student_ids = data.assign_to
            else:
                # Assign to all approved room members
                members_result = await db.execute(
                    select(RoomMembership.student_id).where(
                        and_(
                            RoomMembership.room_id == data.room_id,
                            RoomMembership.status == MembershipStatus.APPROVED,
                        )
                    )
                )
                student_ids = list(members_result.scalars().all())

            for student_id in student_ids:
                assignment = TaskAssignment(
                    task_id=task.id,
                    student_id=student_id,
                    assigned_date=today,
                )
                db.add(assignment)
                created_assignments.append(assignment)

                notif = Notification(
                    user_id=student_id,
                    type=NotificationType.TASK_ASSIGNED,
                    title="New task assigned",
                    message=f"You have a new task: '{task.title}'",
                    reference_id=str(task.id),
                )
                db.add(notif)

        await db.flush()
        await db.commit()
        await db.refresh(task)
        for assignment in created_assignments:
            await manager.send_to_user(
                assignment.student_id,
                {
                    "type": "task_assigned",
                    "assignment_id": assignment.id,
                    "task_id": task.id,
                    "title": task.title,
                    "description": task.description,
                    "priority": task.priority,
                    "due_date": task.due_date,
                    "room_id": task.room_id,
                    "room_name": room_name,
                },
            )
        return task

    @staticmethod
    async def create_solo_task(db: AsyncSession, user_id: uuid.UUID, data: CreateSoloTaskRequest) -> Task:
        task = Task(
            title=data.title,
            description=data.description,
            priority=data.priority,
            due_date=data.due_date,
            created_by=user_id,
            is_daily=data.is_daily,
            is_solo=True,
        )
        db.add(task)
        await db.flush()

        assignment = TaskAssignment(
            task_id=task.id,
            student_id=user_id,
            assigned_date=date.today(),
        )
        db.add(assignment)
        await db.commit()
        await db.refresh(task)
        return task

    @staticmethod
    async def get_my_tasks_today(db: AsyncSession, user_id: uuid.UUID) -> list[TaskAssignment]:
        today = date.today()
        result = await db.execute(
            select(TaskAssignment).where(
                and_(
                    TaskAssignment.student_id == user_id,
                    TaskAssignment.assigned_date == today,
                )
            )
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_my_tasks_today_with_details(db: AsyncSession, user_id: uuid.UUID) -> list[dict]:
        today = date.today()
        result = await db.execute(
            select(TaskAssignment, Task, Room)
            .join(Task, Task.id == TaskAssignment.task_id)
            .outerjoin(Room, Room.id == Task.room_id)
            .where(
                and_(
                    TaskAssignment.student_id == user_id,
                    TaskAssignment.assigned_date == today,
                )
            )
        )
        rows = result.all()
        return [
            {
                "id": assignment.id,
                "task_id": assignment.task_id,
                "student_id": assignment.student_id,
                "status": assignment.status,
                "assigned_date": assignment.assigned_date,
                "completed_at": assignment.completed_at,
                "task": {
                    "id": task.id,
                    "title": task.title,
                    "description": task.description,
                    "priority": task.priority,
                    "due_date": task.due_date,
                    "room_id": task.room_id,
                    "is_daily": task.is_daily,
                    "is_solo": task.is_solo,
                    "created_at": task.created_at,
                },
                "room": (
                    {
                        "id": room.id,
                        "name": room.name,
                        "subject": room.subject,
                    }
                    if room
                    else None
                ),
            }
            for assignment, task, room in rows
        ]

    @staticmethod
    async def get_assignment(db: AsyncSession, assignment_id: uuid.UUID) -> TaskAssignment | None:
        result = await db.execute(select(TaskAssignment).where(TaskAssignment.id == assignment_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def update_task_status(
        db: AsyncSession, assignment_id: uuid.UUID, student_id: uuid.UUID, status: TaskStatus
    ) -> TaskAssignment:
        assignment = await TaskService.get_assignment(db, assignment_id)
        if not assignment or assignment.student_id != student_id:
            raise ValueError("Assignment not found or unauthorized")

        assignment.status = status
        if status == TaskStatus.DONE:
            assignment.completed_at = datetime.utcnow()
            await TaskService._update_streak(db, student_id)

        await db.commit()
        await db.refresh(assignment)
        if status == TaskStatus.DONE:
            task_result = await db.execute(select(Task).where(Task.id == assignment.task_id))
            task = task_result.scalar_one_or_none()
            student_result = await db.execute(select(User).where(User.id == student_id))
            student = student_result.scalar_one_or_none()
            if task:
                await manager.send_to_user(
                    task.created_by,
                    {
                        "type": "task_completed",
                        "student_id": student_id,
                        "student_name": student.full_name if student else None,
                        "task_id": task.id,
                        "room_id": task.room_id,
                        "title": task.title,
                    },
                )
        return assignment

    @staticmethod
    async def _update_streak(db: AsyncSession, user_id: uuid.UUID):
        today = date.today()
        result = await db.execute(select(UserStreak).where(UserStreak.user_id == user_id))
        streak = result.scalar_one_or_none()

        if not streak:
            streak = UserStreak(user_id=user_id, current_streak=1, longest_streak=1, last_activity_date=today, total_tasks_completed=1)
            db.add(streak)
        else:
            streak.total_tasks_completed += 1
            if streak.last_activity_date:
                delta = (today - streak.last_activity_date).days
                if delta == 1:
                    streak.current_streak += 1
                elif delta > 1:
                    streak.current_streak = 1
                # delta == 0 means same day, streak unchanged
            else:
                streak.current_streak = 1

            if streak.current_streak > streak.longest_streak:
                streak.longest_streak = streak.current_streak

            streak.last_activity_date = today

            # Streak milestone notifications
            if streak.current_streak in [3, 7, 14, 30, 60, 100]:
                notif = Notification(
                    user_id=user_id,
                    type=NotificationType.STREAK_MILESTONE,
                    title="🔥 Streak milestone!",
                    message=f"You're on a {streak.current_streak}-day streak! Keep it up!",
                )
                db.add(notif)
                await manager.send_to_user(
                    user_id,
                    {
                        "type": "streak_milestone",
                        "streak": streak.current_streak,
                    },
                )

        await db.flush()

    @staticmethod
    async def get_room_tasks(db: AsyncSession, room_id: uuid.UUID) -> list[Task]:
        result = await db.execute(select(Task).where(Task.room_id == room_id))
        return list(result.scalars().all())

    @staticmethod
    async def update_task(db: AsyncSession, task_id: uuid.UUID, created_by: uuid.UUID, data: UpdateTaskRequest) -> Task:
        result = await db.execute(select(Task).where(Task.id == task_id, Task.created_by == created_by))
        task = result.scalar_one_or_none()
        if not task:
            raise ValueError("Task not found or unauthorized")
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(task, field, value)
        await db.commit()
        await db.refresh(task)
        return task

    @staticmethod
    async def delete_task(db: AsyncSession, task_id: uuid.UUID, created_by: uuid.UUID):
        result = await db.execute(select(Task).where(Task.id == task_id, Task.created_by == created_by))
        task = result.scalar_one_or_none()
        if not task:
            raise ValueError("Task not found or unauthorized")
        await db.delete(task)
        await db.commit()

    # ── Comments ──────────────────────────────────────────
    @staticmethod
    async def add_comment(db: AsyncSession, task_id: uuid.UUID, user_id: uuid.UUID, data: CreateCommentRequest) -> TaskComment:
        comment = TaskComment(task_id=task_id, user_id=user_id, content=data.content)
        db.add(comment)

        # Get task to notify creator
        task_result = await db.execute(select(Task).where(Task.id == task_id))
        task = task_result.scalar_one_or_none()
        if task and task.created_by != user_id:
            notif = Notification(
                user_id=task.created_by,
                type=NotificationType.NEW_COMMENT,
                title="New comment on your task",
                message=f"Someone commented on '{task.title}'",
                reference_id=str(task_id),
            )
            db.add(notif)

        await db.commit()
        await db.refresh(comment)
        if task and task.created_by != user_id:
            await manager.send_to_user(
                task.created_by,
                {
                    "type": "new_comment",
                    "task_id": task_id,
                    "title": task.title,
                    "task_title": task.title,
                    "user_id": user_id,
                    "content_preview": data.content[:50],
                },
            )
        return comment

    @staticmethod
    async def get_comments(db: AsyncSession, task_id: uuid.UUID) -> list[TaskComment]:
        result = await db.execute(select(TaskComment).where(TaskComment.task_id == task_id))
        return list(result.scalars().all())

    # ── Attachments ───────────────────────────────────────
    @staticmethod
    async def add_attachment(db: AsyncSession, task_id: uuid.UUID, user_id: uuid.UUID, data: CreateAttachmentRequest) -> TaskAttachment:
        attachment = TaskAttachment(
            task_id=task_id,
            uploaded_by=user_id,
            filename=data.filename,
            file_url=data.file_url,
            file_type=data.file_type,
            file_size=data.file_size,
        )
        db.add(attachment)
        await db.commit()
        await db.refresh(attachment)
        return attachment

    @staticmethod
    async def get_attachments(db: AsyncSession, task_id: uuid.UUID) -> list[TaskAttachment]:
        result = await db.execute(select(TaskAttachment).where(TaskAttachment.task_id == task_id))
        return list(result.scalars().all())
