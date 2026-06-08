import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator

from app.models.room import MembershipStatus


class CreateRoomRequest(BaseModel):
    name: str
    description: Optional[str] = None
    subject: Optional[str] = None
    max_students: int = 50

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Room name cannot be empty")
        return v.strip()


class UpdateRoomRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    subject: Optional[str] = None
    max_students: Optional[int] = None
    is_active: Optional[bool] = None


class RoomResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    subject: Optional[str]
    code: str
    teacher_id: uuid.UUID
    is_active: bool
    max_students: int
    created_at: datetime
    member_count: int = 0

    model_config = {"from_attributes": True}


class JoinRoomRequest(BaseModel):
    code: str


class InviteStudentRequest(BaseModel):
    student_id: uuid.UUID


class MembershipResponse(BaseModel):
    id: uuid.UUID
    room_id: uuid.UUID
    student_id: uuid.UUID
    status: MembershipStatus
    joined_at: datetime

    model_config = {"from_attributes": True}


class UpdateMembershipRequest(BaseModel):
    status: MembershipStatus
