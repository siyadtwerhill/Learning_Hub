import uuid

from fastapi import WebSocket
from fastapi.encoders import jsonable_encoder
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.room import MembershipStatus, RoomMembership


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, user_id: uuid.UUID | str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections[str(user_id)] = websocket

    def disconnect(self, user_id: uuid.UUID | str) -> None:
        self.active_connections.pop(str(user_id), None)

    async def send_to_user(self, user_id: uuid.UUID | str, data: dict) -> None:
        websocket = self.active_connections.get(str(user_id))
        if not websocket:
            return

        try:
            await websocket.send_json(jsonable_encoder(data))
        except Exception:
            self.disconnect(user_id)

    async def broadcast_to_room(self, room_id: uuid.UUID | str, data: dict, db: AsyncSession) -> None:
        result = await db.execute(
            select(RoomMembership.student_id).where(
                and_(
                    RoomMembership.room_id == room_id,
                    RoomMembership.status == MembershipStatus.APPROVED,
                )
            )
        )
        for student_id in result.scalars().all():
            await self.send_to_user(student_id, data)

    async def broadcast_to_all(self, data: dict) -> None:
        for user_id in list(self.active_connections.keys()):
            await self.send_to_user(user_id, data)


manager = ConnectionManager()
