# TaskApp Backend — Full (Phases 1–6)

## Stack
- **FastAPI** + **PostgreSQL** + **SQLAlchemy 2.0 (async)** + **JWT**

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env   # fill in your DB URL and SECRET_KEY
uvicorn app.main:app --reload
# Docs at http://localhost:8000/docs
```

## All API Endpoints

### Auth (Phase 1)
| Method | Endpoint | Auth | Who |
|--------|----------|------|-----|
| POST | `/api/v1/auth/register` | ❌ | Anyone |
| POST | `/api/v1/auth/login` | ❌ | Anyone |
| POST | `/api/v1/auth/refresh` | ❌ | Anyone |
| GET | `/api/v1/auth/me` | ✅ | Anyone |
| PATCH | `/api/v1/auth/me` | ✅ | Anyone |
| PATCH | `/api/v1/auth/admin/deactivate/{id}` | ✅ | Admin |

### Rooms (Phase 2)
| Method | Endpoint | Auth | Who |
|--------|----------|------|-----|
| POST | `/api/v1/rooms` | ✅ | Teacher |
| GET | `/api/v1/rooms/my` | ✅ | Teacher |
| GET | `/api/v1/rooms/joined` | ✅ | Student |
| GET | `/api/v1/rooms/{id}` | ✅ | Anyone |
| PATCH | `/api/v1/rooms/{id}` | ✅ | Teacher |
| POST | `/api/v1/rooms/join` | ✅ | Student |
| GET | `/api/v1/rooms/{id}/members` | ✅ | Teacher |
| PATCH | `/api/v1/rooms/{id}/members/{student_id}` | ✅ | Teacher |

### Tasks (Phase 3)
| Method | Endpoint | Auth | Who |
|--------|----------|------|-----|
| POST | `/api/v1/tasks` | ✅ | Teacher |
| PATCH | `/api/v1/tasks/{id}` | ✅ | Teacher |
| DELETE | `/api/v1/tasks/{id}` | ✅ | Teacher |
| GET | `/api/v1/tasks/room/{room_id}` | ✅ | Anyone |
| GET | `/api/v1/tasks/my/today` | ✅ | Student |
| PATCH | `/api/v1/tasks/assignments/{id}/status` | ✅ | Student |
| POST | `/api/v1/tasks/solo` | ✅ | Independent |
| POST | `/api/v1/tasks/{id}/comments` | ✅ | Anyone |
| GET | `/api/v1/tasks/{id}/comments` | ✅ | Anyone |
| POST | `/api/v1/tasks/{id}/attachments` | ✅ | Anyone |
| GET | `/api/v1/tasks/{id}/attachments` | ✅ | Anyone |

### Progress (Phase 4)
| Method | Endpoint | Auth | Who |
|--------|----------|------|-----|
| GET | `/api/v1/progress/streak` | ✅ | Anyone |
| GET | `/api/v1/progress/daily?target_date=YYYY-MM-DD` | ✅ | Anyone |
| GET | `/api/v1/progress/room/{id}/students` | ✅ | Teacher |

### Notifications (Phase 5)
| Method | Endpoint | Auth | Who |
|--------|----------|------|-----|
| GET | `/api/v1/notifications?unread_only=true` | ✅ | Anyone |
| GET | `/api/v1/notifications/unread-count` | ✅ | Anyone |
| POST | `/api/v1/notifications/mark-read` | ✅ | Anyone |
| POST | `/api/v1/notifications/mark-all-read` | ✅ | Anyone |

### Analytics & Leaderboard (Phase 6)
| Method | Endpoint | Auth | Who |
|--------|----------|------|-----|
| GET | `/api/v1/analytics/platform` | ✅ | Admin |
| GET | `/api/v1/analytics/rooms/{id}` | ✅ | Anyone |
| GET | `/api/v1/analytics/rooms/{id}/leaderboard?period=all_time` | ✅ | Anyone |

## Roles
- `admin` — full control
- `teacher` — create rooms & tasks
- `student` — join rooms, complete tasks
- `independent` — solo tasks only

## Leaderboard Points
- 10 pts per completed task
- 5 pts per day of active streak (streak bonus)

## Streak Logic
- Complete at least 1 task/day = streak continues
- Miss a day = streak resets to 1
- Milestones at: 3, 7, 14, 30, 60, 100 days → notification sent
