import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_teacher
from app.db.session import get_db
from app.models.user import User
from app.schemas.task import (
    CreateTaskRequest, TaskResponse, TaskAssignmentResponse,
    UpdateTaskStatusRequest, CreateSoloTaskRequest, UpdateTaskRequest,
    CommentResponse, CreateCommentRequest, AttachmentResponse, CreateAttachmentRequest,
)
from app.services.task_service import TaskService

router = APIRouter(prefix="/tasks", tags=["Tasks"])


# ── Teacher: create & manage tasks ────────────────────────
@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    data: CreateTaskRequest,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    return await TaskService.create_task(db, teacher.id, data)


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: uuid.UUID,
    data: UpdateTaskRequest,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    try:
        return await TaskService.update_task(db, task_id, teacher.id, data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    try:
        await TaskService.delete_task(db, task_id, teacher.id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/room/{room_id}", response_model=list[TaskResponse])
async def get_room_tasks(
    room_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return await TaskService.get_room_tasks(db, room_id)


# ── Student/Independent: my tasks ─────────────────────────
@router.get("/my/today", response_model=list[dict])
async def my_tasks_today(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await TaskService.get_my_tasks_today_with_details(db, current_user.id)


@router.patch("/assignments/{assignment_id}/status", response_model=TaskAssignmentResponse)
async def update_status(
    assignment_id: uuid.UUID,
    data: UpdateTaskStatusRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await TaskService.update_task_status(db, assignment_id, current_user.id, data.status)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── Solo / Independent learner ─────────────────────────────
@router.post("/solo", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_solo_task(
    data: CreateSoloTaskRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await TaskService.create_solo_task(db, current_user.id, data)


# ── Comments ──────────────────────────────────────────────
@router.post("/{task_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def add_comment(
    task_id: uuid.UUID,
    data: CreateCommentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await TaskService.add_comment(db, task_id, current_user.id, data)


@router.get("/{task_id}/comments", response_model=list[CommentResponse])
async def get_comments(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return await TaskService.get_comments(db, task_id)


# ── Attachments ───────────────────────────────────────────
@router.post("/{task_id}/attachments", response_model=AttachmentResponse, status_code=status.HTTP_201_CREATED)
async def add_attachment(
    task_id: uuid.UUID,
    data: CreateAttachmentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await TaskService.add_attachment(db, task_id, current_user.id, data)


@router.get("/{task_id}/attachments", response_model=list[AttachmentResponse])
async def get_attachments(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return await TaskService.get_attachments(db, task_id)
