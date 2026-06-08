import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_teacher
from app.db.session import get_db
from app.models.room import MembershipStatus
from app.models.user import User
from app.schemas.room import (
    CreateRoomRequest, UpdateRoomRequest, RoomResponse,
    JoinRoomRequest, MembershipResponse, UpdateMembershipRequest, InviteStudentRequest,
)
from app.services.auth_service import AuthService
from app.services.room_service import RoomService

router = APIRouter(prefix="/rooms", tags=["Rooms"])


@router.post("", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
async def create_room(
    data: CreateRoomRequest,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    room = await RoomService.create_room(db, teacher.id, data)
    members = await RoomService.get_room_members(db, room.id)
    result = RoomResponse.model_validate(room)
    result.member_count = len(members)
    return result


@router.get("/my", response_model=list[RoomResponse])
async def my_rooms(
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    rooms = await RoomService.get_teacher_rooms(db, teacher.id)
    out = []
    for r in rooms:
        members = await RoomService.get_room_members(db, r.id)
        resp = RoomResponse.model_validate(r)
        resp.member_count = len(members)
        out.append(resp)
    return out


@router.get("/joined", response_model=list[dict])
async def joined_rooms(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    memberships = await RoomService.get_student_rooms(db, current_user.id)
    result = []
    for m in memberships:
        room = await RoomService.get_room_by_id(db, m.room_id)
        if room:
            teacher = await AuthService.get_user_by_id(db, str(room.teacher_id))
            result.append({
                "room_id": str(room.id),
                "name": room.name,
                "subject": room.subject,
                "code": room.code,
                "teacher_name": teacher.full_name if teacher else "Teacher",
            })
    return result


@router.get("/{room_id}", response_model=RoomResponse)
async def get_room(
    room_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    room = await RoomService.get_room_by_id(db, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    members = await RoomService.get_room_members(db, room.id)
    resp = RoomResponse.model_validate(room)
    resp.member_count = len(members)
    return resp


@router.patch("/{room_id}", response_model=RoomResponse)
async def update_room(
    room_id: uuid.UUID,
    data: UpdateRoomRequest,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    room = await RoomService.get_room_by_id(db, room_id)
    if not room or room.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Room not found")
    updated = await RoomService.update_room(db, room, data)
    members = await RoomService.get_room_members(db, updated.id)
    resp = RoomResponse.model_validate(updated)
    resp.member_count = len(members)
    return resp


@router.post("/join", response_model=MembershipResponse, status_code=status.HTTP_201_CREATED)
async def join_room(
    data: JoinRoomRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        membership = await RoomService.join_room(db, current_user.id, data.code)
        return membership
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{room_id}/members", response_model=list[dict])
async def get_members(
    room_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    room = await RoomService.get_room_by_id(db, room_id)
    if not room or room.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Room not found")

    memberships = await RoomService.get_room_memberships(db, room_id)
    result = []
    for membership in memberships:
        student = await AuthService.get_user_by_id(db, str(membership.student_id))
        result.append({
            "id": str(membership.id),
            "room_id": str(membership.room_id),
            "student_id": str(membership.student_id),
            "student_name": student.full_name if student else "Student",
            "student_email": student.email if student else None,
            "status": membership.status.value,
            "joined_at": membership.joined_at,
        })
    return result


@router.patch("/{room_id}/members/{student_id}", response_model=MembershipResponse)
async def update_membership(
    room_id: uuid.UUID,
    student_id: uuid.UUID,
    data: UpdateMembershipRequest,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    try:
        return await RoomService.update_membership(db, room_id, student_id, data.status)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{room_id}/invite", response_model=MembershipResponse, status_code=status.HTTP_201_CREATED)
async def invite_student(
    room_id: uuid.UUID,
    data: InviteStudentRequest,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    room = await RoomService.get_room_by_id(db, room_id)
    if not room or room.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Room not found")

    try:
        return await RoomService.invite_student(db, room, data.student_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
