import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


class StreakResponse(BaseModel):
    user_id: uuid.UUID
    current_streak: int
    longest_streak: int
    last_activity_date: Optional[date]
    total_tasks_completed: int

    model_config = {"from_attributes": True}


class DailySummaryResponse(BaseModel):
    user_id: uuid.UUID
    summary_date: date
    total_tasks: int
    completed_tasks: int
    overdue_tasks: int
    completion_rate: float

    model_config = {"from_attributes": True}


class StudentProgressResponse(BaseModel):
    student_id: uuid.UUID
    username: str
    full_name: str
    total_tasks: int
    completed_tasks: int
    completion_rate: float
    current_streak: int
