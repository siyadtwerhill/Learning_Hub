import uuid
from datetime import datetime, date
from typing import Optional, List

from pydantic import BaseModel

from app.models.task import TaskPriority, TaskStatus


class CreateTaskRequest(BaseModel):
    title: str
    description: Optional[str] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: Optional[date] = None
    room_id: Optional[uuid.UUID] = None
    is_daily: bool = False
    assign_to: Optional[List[uuid.UUID]] = None  # list of student IDs; None = assign to all room members


class UpdateTaskRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[date] = None


class TaskResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str]
    priority: TaskPriority
    due_date: Optional[date]
    room_id: Optional[uuid.UUID]
    created_by: uuid.UUID
    is_daily: bool
    is_solo: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskAssignmentResponse(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    student_id: uuid.UUID
    status: TaskStatus
    assigned_date: date
    completed_at: Optional[datetime]

    model_config = {"from_attributes": True}


class UpdateTaskStatusRequest(BaseModel):
    status: TaskStatus


class CreateSoloTaskRequest(BaseModel):
    title: str
    description: Optional[str] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: Optional[date] = None
    is_daily: bool = False


class CommentResponse(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    user_id: uuid.UUID
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateCommentRequest(BaseModel):
    content: str


class AttachmentResponse(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    uploaded_by: uuid.UUID
    filename: str
    file_url: str
    file_type: Optional[str]
    file_size: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateAttachmentRequest(BaseModel):
    filename: str
    file_url: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
