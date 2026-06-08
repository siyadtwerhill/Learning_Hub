from pydantic import BaseModel
from typing import List
import uuid


class PlatformStats(BaseModel):
    total_users: int
    total_teachers: int
    total_students: int
    total_independent: int
    total_rooms: int
    total_tasks: int
    total_completed_tasks: int
    platform_completion_rate: float


class RoomAnalytics(BaseModel):
    room_id: uuid.UUID
    room_name: str
    total_students: int
    total_tasks: int
    completed_tasks: int
    completion_rate: float
    avg_streak: float


class LeaderboardEntryResponse(BaseModel):
    rank: int
    student_id: uuid.UUID
    username: str
    full_name: str
    points: int
    tasks_completed: int
    streak_bonus: int
