import random
import string
import uuid

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.room import Room, RoomMembership, MembershipStatus
from app.models.notification import Notification, NotificationType
from app.models.user import User, UserRole
from app.schemas.room import CreateRoomRequest, UpdateRoomRequest
from app.core.websocket_manager import manager


def generate_room_code(length: int = 6) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


class RoomService:

    @staticmethod
    async def create_room(db: AsyncSession, teacher_id: uuid.UUID, data: CreateRoomRequest) -> Room:
        # Generate unique code
        while True:
            code = generate_room_code()
            existing = await db.execute(select(Room).where(Room.code == code))
            if not existing.scalar_one_or_none():
                break

        room = Room(
            name=data.name,
            description=data.description,
            subject=data.subject,
            code=code,
            teacher_id=teacher_id,
            max_students=data.max_students,
        )
        db.add(room)
        await db.commit()
        await db.refresh(room)
        return room

    @staticmethod
    async def get_teacher_rooms(db: AsyncSession, teacher_id: uuid.UUID) -> list[Room]:
        result = await db.execute(select(Room).where(Room.teacher_id == teacher_id))
        return list(result.scalars().all())

    @staticmethod
    async def get_room_by_id(db: AsyncSession, room_id: uuid.UUID) -> Room | None:
        result = await db.execute(select(Room).where(Room.id == room_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_room_by_code(db: AsyncSession, code: str) -> Room | None:
        result = await db.execute(select(Room).where(Room.code == code.upper()))
        return result.scalar_one_or_none()

    @staticmethod
    async def update_room(db: AsyncSession, room: Room, data: UpdateRoomRequest) -> Room:
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(room, field, value)
        await db.commit()
        await db.refresh(room)
        return room

    @staticmethod
    async def join_room(db: AsyncSession, student_id: uuid.UUID, code: str) -> RoomMembership:
        room = await RoomService.get_room_by_code(db, code)
        if not room or not room.is_active:
            raise ValueError("Room not found or inactive")

        # Check already a member
        existing = await db.execute(
            select(RoomMembership).where(
                RoomMembership.room_id == room.id,
                RoomMembership.student_id == student_id,
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError("Already a member or request pending")

        # Check capacity
        count_result = await db.execute(
            select(func.count()).where(
                RoomMembership.room_id == room.id,
                RoomMembership.status == MembershipStatus.APPROVED,
            )
        )
        count = count_result.scalar()
        if count >= room.max_students:
            raise ValueError("Room is full")

        membership = RoomMembership(room_id=room.id, student_id=student_id)
        db.add(membership)

        # Notify teacher
        notif = Notification(
            user_id=room.teacher_id,
            type=NotificationType.ROOM_JOINED,
            title="New join request",
            message=f"A student wants to join your room '{room.name}'",
            reference_id=str(room.id),
        )
        db.add(notif)
        await db.commit()
        await db.refresh(membership)
        student_result = await db.execute(select(User).where(User.id == student_id))
        student = student_result.scalar_one_or_none()
        await manager.send_to_user(
            room.teacher_id,
            {
                "type": "room_join_request",
                "student_id": student_id,
                "student_name": student.full_name if student else None,
                "room_id": room.id,
                "room_name": room.name,
            },
        )
        return membership

    @staticmethod
    async def invite_student(db: AsyncSession, room: Room, student_id: uuid.UUID) -> RoomMembership:
        student_result = await db.execute(
            select(User).where(
                User.id == student_id,
                User.role == UserRole.STUDENT,
                User.is_active == True,
            )
        )
        student = student_result.scalar_one_or_none()
        if not student:
            raise ValueError("Student not found")

        count_result = await db.execute(
            select(func.count()).where(
                RoomMembership.room_id == room.id,
                RoomMembership.status == MembershipStatus.APPROVED,
            )
        )
        count = count_result.scalar()

        existing_result = await db.execute(
            select(RoomMembership).where(
                RoomMembership.room_id == room.id,
                RoomMembership.student_id == student_id,
            )
        )
        membership = existing_result.scalar_one_or_none()

        if not membership and count >= room.max_students:
            raise ValueError("Room is full")

        if membership:
            membership.status = MembershipStatus.APPROVED
        else:
            membership = RoomMembership(
                room_id=room.id,
                student_id=student_id,
                status=MembershipStatus.APPROVED,
            )
            db.add(membership)

        notif = Notification(
            user_id=student_id,
            type=NotificationType.ROOM_APPROVED,
            title="Added to room",
            message=f"You were added to '{room.name}'",
            reference_id=str(room.id),
        )
        db.add(notif)
        await db.commit()
        await db.refresh(membership)
        await manager.send_to_user(
            student_id,
            {
                "type": "room_approved",
                "room_id": room.id,
                "room_name": room.name,
            },
        )
        return membership

    @staticmethod
    async def update_membership(
        db: AsyncSession, room_id: uuid.UUID, student_id: uuid.UUID, status: MembershipStatus
    ) -> RoomMembership:
        result = await db.execute(
            select(RoomMembership).where(
                RoomMembership.room_id == room_id,
                RoomMembership.student_id == student_id,
            )
        )
        membership = result.scalar_one_or_none()
        if not membership:
            raise ValueError("Membership not found")

        membership.status = status

        # Notify student
        room_result = await db.execute(select(Room).where(Room.id == room_id))
        room = room_result.scalar_one_or_none()
        notif_type = NotificationType.ROOM_APPROVED if status == MembershipStatus.APPROVED else NotificationType.ROOM_REJECTED
        notif = Notification(
            user_id=student_id,
            type=notif_type,
            title="Room request updated",
            message=f"Your request to join '{room.name}' was {status.value}",
            reference_id=str(room_id),
        )
        db.add(notif)
        await db.commit()
        await db.refresh(membership)
        if status == MembershipStatus.APPROVED and room:
            await manager.send_to_user(
                student_id,
                {
                    "type": "room_approved",
                    "room_id": room_id,
                    "room_name": room.name,
                },
            )
        return membership

    @staticmethod
    async def get_room_members(db: AsyncSession, room_id: uuid.UUID) -> list[RoomMembership]:
        result = await db.execute(
            select(RoomMembership).where(
                RoomMembership.room_id == room_id,
                RoomMembership.status == MembershipStatus.APPROVED,
            )
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_room_memberships(db: AsyncSession, room_id: uuid.UUID) -> list[RoomMembership]:
        result = await db.execute(select(RoomMembership).where(RoomMembership.room_id == room_id))
        return list(result.scalars().all())

    @staticmethod
    async def get_student_rooms(db: AsyncSession, student_id: uuid.UUID) -> list[RoomMembership]:
        result = await db.execute(
            select(RoomMembership).where(
                RoomMembership.student_id == student_id,
                RoomMembership.status == MembershipStatus.APPROVED,
            )
        )
        return list(result.scalars().all())
