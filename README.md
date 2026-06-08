# Learning Hub (TaskFlow)

A full-stack classroom task management platform for teachers, students, and independent learners. Teachers create virtual rooms, assign tasks, and track progress. Students complete assignments, build daily streaks, and compete on room leaderboards — all with real-time WebSocket updates.

**Repository:** [github.com/siyadtwerhill/Learning_Hub](https://github.com/siyadtwerhill/Learning_Hub)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Download & Run](#download--run)
- [Environment Variables](#environment-variables)
- [User Roles](#user-roles)
- [API Overview](#api-overview)
- [Real-Time Updates](#real-time-updates)
- [Gamification](#gamification)
- [Frontend Routes](#frontend-routes)
- [Development](#development)
- [License](#license)

---

## Features

### Authentication & Users
- JWT-based auth with access + refresh tokens
- Role-based registration (Teacher, Student, Solo Learner, Admin)
- Profile management and admin user deactivation

### Rooms (Classrooms)
- Teachers create rooms with unique join codes
- Students request to join; teachers approve, reject, or ban members
- Teachers can invite students by email
- Room member management and capacity limits

### Tasks
- Teachers assign tasks to entire rooms or specific students
- Priority levels (low, medium, high) and optional due dates
- Daily recurring tasks support
- Solo tasks for independent learners (no room required)
- Task comments and file attachments
- Students update assignment status: `not_started` → `in_progress` → `done`

### Progress & Analytics
- Daily completion summaries per user
- Streak tracking with milestone notifications (3, 7, 14, 30, 60, 100 days)
- Teacher view of student progress per room
- Platform-wide analytics for admins
- Per-room analytics and leaderboards

### Notifications
- In-app notifications for task assignments, streak milestones, and more
- Unread count and mark-as-read support
- Real-time delivery via WebSocket

### Frontend Dashboards
- **Teacher:** manage rooms, assign tasks, view student progress, find students
- **Student / Independent:** today's tasks, streak tracker, joined rooms, notifications
- **Admin:** platform overview (dashboard in progress)

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | FastAPI, SQLAlchemy 2.0 (async), PostgreSQL, asyncpg, Pydantic v2, python-jose (JWT), passlib/bcrypt |
| **Frontend** | React 18, Vite, Tailwind CSS v3, React Router v6, React Hook Form, Axios, React Hot Toast, Lucide Icons |
| **Database** | PostgreSQL 16 (Docker) |
| **Real-time** | FastAPI WebSockets |

---

## Architecture

```mermaid
flowchart TB
    subgraph Client["Browser (React + Vite)"]
        UI[Dashboards & Auth]
        WS[WebSocket Client]
        API[Axios API Client]
    end

    subgraph Server["FastAPI Backend"]
        Routes[REST API /api/v1]
        WSS[WebSocket /ws/{user_id}]
        Services[Service Layer]
        ORM[SQLAlchemy Async ORM]
    end

    DB[(PostgreSQL)]

    UI --> API
    UI --> WS
    API --> Routes
    WS --> WSS
    Routes --> Services
    WSS --> Services
    Services --> ORM
    ORM --> DB
```

---

## Project Structure

```
Learning_Hub/
├── taskapp_full/          # FastAPI backend
│   ├── app/
│   │   ├── api/v1/        # REST endpoints (auth, rooms, tasks, progress, …)
│   │   ├── core/          # Config, security, WebSocket manager
│   │   ├── db/            # Database session & engine
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic request/response schemas
│   │   ├── services/      # Business logic
│   │   └── main.py        # App entry point
│   ├── docker-compose.yml # PostgreSQL container
│   ├── requirements.txt
│   └── .env.example
│
└── taskapp-web/           # React frontend
    ├── src/
    │   ├── components/    # Reusable UI components
    │   ├── context/       # Auth, WebSocket, Theme providers
    │   ├── hooks/         # Custom React hooks
    │   ├── pages/         # Role-based dashboards & auth pages
    │   └── services/      # Axios API client
    ├── package.json
    └── .env.example
```

---

## Prerequisites

- **Python** 3.11+ (3.14 tested)
- **Node.js** 18+ and npm
- **Docker** (recommended for PostgreSQL) or a local PostgreSQL 16 instance
- **Git**

---

## Download & Run

Follow these steps after cloning. You need **two terminals** — one for the backend, one for the frontend.

> **Important:** `.env` files are **not** included in this repo (they contain secrets).  
> Copy `.env.example` → `.env` in both folders and edit your values locally.  
> **Never commit `.env` to GitHub.**

### Step 1 — Download the project

**Option A: Git clone (recommended)**

```bash
git clone https://github.com/siyadtwerhill/Learning_Hub.git
cd Learning_Hub
```

**Option B: Download ZIP**

1. Open https://github.com/siyadtwerhill/Learning_Hub
2. Click **Code → Download ZIP**
3. Extract the folder and open a terminal inside it

### Step 2 — Start the database (PostgreSQL)

```bash
cd taskapp_full
docker compose up -d
```

| Setting  | Value      |
|----------|------------|
| Host     | `localhost` |
| Port     | `5432`     |
| User     | `postgres` |
| Password | `password` |
| Database | `taskapp`  |

> Skip Docker only if you already have PostgreSQL 16 running and update `DATABASE_URL` in your `.env`.

### Step 3 — Backend setup (Terminal 1)

```bash
cd taskapp_full
pip install -r requirements.txt
```

Create your local env file:

```bash
# macOS / Linux
cp .env.example .env

# Windows (PowerShell)
copy .env.example .env
```

Edit `taskapp_full/.env` and set a strong `SECRET_KEY` (required). The other defaults work with Docker above.

Start the API:

```bash
uvicorn app.main:app --reload
```

| URL | Purpose |
|-----|---------|
| http://localhost:8000 | API base |
| http://localhost:8000/docs | Swagger UI |
| http://localhost:8000/health | Health check |

Database tables are created automatically on first startup.

### Step 4 — Frontend setup (Terminal 2)

```bash
cd taskapp-web
npm install
```

Create your local env file:

```bash
# macOS / Linux
cp .env.example .env

# Windows (PowerShell)
copy .env.example .env
```

The default `VITE_API_URL=http://localhost:8000/api/v1` is correct for local development.

Start the dev server:

```bash
npm run dev
```

Open **http://localhost:3000** in your browser.

### Step 5 — Create an account

1. Go to http://localhost:3000/register
2. Pick a role: **Teacher**, **Student**, or **Solo Learner**
3. Log in — you are redirected to the dashboard for your role

### Quick checklist

| Step | Command | Running at |
|------|---------|------------|
| Database | `docker compose up -d` (in `taskapp_full`) | port 5432 |
| Backend | `uvicorn app.main:app --reload` (in `taskapp_full`) | port 8000 |
| Frontend | `npm run dev` (in `taskapp-web`) | port 3000 |

### Troubleshooting

| Problem | Fix |
|---------|-----|
| `DATABASE_URL` connection error | Make sure Docker is running: `docker compose up -d` |
| Frontend can't reach API | Check `taskapp-web/.env` has `VITE_API_URL=http://localhost:8000/api/v1` |
| Port already in use | Stop the other process or change the port in `vite.config.js` / uvicorn |
| `pip` not found | Use `python -m pip install -r requirements.txt` |

---

## Environment Variables

### Backend (`taskapp_full/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Async PostgreSQL connection string | `postgresql+asyncpg://postgres:password@localhost:5432/taskapp` |
| `SECRET_KEY` | JWT signing secret — **change in production** | — |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime | `60` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifetime | `7` |

### Frontend (`taskapp-web/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:8000/api/v1` |

---

## User Roles

| Role | Description |
|------|-------------|
| `admin` | Full platform control; access to platform analytics |
| `teacher` | Create rooms, assign tasks, manage members, view student progress |
| `student` | Join rooms via code, complete assigned tasks, track streaks |
| `independent` | Create and manage solo tasks without joining a room |

---

## API Overview

All REST endpoints are prefixed with `/api/v1`. Authentication uses `Authorization: Bearer <access_token>` unless noted.

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Register a new user |
| POST | `/auth/login` | No | Login and receive tokens |
| POST | `/auth/refresh` | No | Refresh access token |
| GET | `/auth/me` | Yes | Get current user profile |
| PATCH | `/auth/me` | Yes | Update profile |
| PATCH | `/auth/admin/deactivate/{id}` | Yes (Admin) | Deactivate a user |

### Rooms
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/rooms` | Yes (Teacher) | Create a room |
| GET | `/rooms/my` | Yes (Teacher) | List teacher's rooms |
| GET | `/rooms/joined` | Yes (Student) | List joined rooms |
| GET | `/rooms/{id}` | Yes | Get room details |
| PATCH | `/rooms/{id}` | Yes (Teacher) | Update room |
| POST | `/rooms/join` | Yes (Student) | Request to join by code |
| GET | `/rooms/{id}/members` | Yes (Teacher) | List room members |
| PATCH | `/rooms/{id}/members/{student_id}` | Yes (Teacher) | Approve/reject/ban member |

### Tasks
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/tasks` | Yes (Teacher) | Create and assign a task |
| PATCH | `/tasks/{id}` | Yes (Teacher) | Update a task |
| DELETE | `/tasks/{id}` | Yes (Teacher) | Delete a task |
| GET | `/tasks/room/{room_id}` | Yes | List tasks in a room |
| GET | `/tasks/my/today` | Yes (Student) | Get today's assignments |
| PATCH | `/tasks/assignments/{id}/status` | Yes (Student) | Update assignment status |
| POST | `/tasks/solo` | Yes (Independent) | Create a solo task |
| POST | `/tasks/{id}/comments` | Yes | Add a comment |
| GET | `/tasks/{id}/comments` | Yes | List comments |
| POST | `/tasks/{id}/attachments` | Yes | Add an attachment |
| GET | `/tasks/{id}/attachments` | Yes | List attachments |

### Progress
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/progress/streak` | Yes | Get current streak |
| GET | `/progress/daily?target_date=YYYY-MM-DD` | Yes | Get daily summary |
| GET | `/progress/room/{id}/students` | Yes (Teacher) | Student progress in a room |

### Notifications
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications?unread_only=true` | Yes | List notifications |
| GET | `/notifications/unread-count` | Yes | Get unread count |
| POST | `/notifications/mark-read` | Yes | Mark specific notifications read |
| POST | `/notifications/mark-all-read` | Yes | Mark all as read |

### Analytics & Leaderboard
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/analytics/platform` | Yes (Admin) | Platform-wide stats |
| GET | `/analytics/rooms/{id}` | Yes | Room analytics |
| GET | `/analytics/rooms/{id}/leaderboard?period=all_time` | Yes | Room leaderboard |

For full request/response schemas, use the Swagger UI at http://localhost:8000/docs.

---

## Real-Time Updates

The backend exposes a WebSocket endpoint at:

```
ws://localhost:8000/ws/{user_id}
```

The frontend connects automatically after login. Events include:
- New task assignments
- Task status changes
- Streak milestone celebrations
- Room-wide broadcasts

---

## Gamification

### Streaks
- Complete at least **1 task per day** to keep your streak alive
- Missing a day resets the streak to 1
- Milestones at **3, 7, 14, 30, 60, and 100 days** trigger a notification

### Leaderboard Points
| Action | Points |
|--------|--------|
| Complete a task | +10 |
| Active streak bonus | +5 per streak day |

Leaderboard periods: `all_time`, `weekly`, `monthly`.

---

## Frontend Routes

| Route | Page | Access |
|-------|------|--------|
| `/` | Redirect to role dashboard | Authenticated |
| `/login` | Login | Public |
| `/register` | Register with role picker | Public |
| `/teacher` | Teacher dashboard (rooms, tasks, progress) | Teacher |
| `/student` | Student / Independent dashboard | Student, Independent |
| `/admin` | Admin dashboard | Admin |

### Auth Flow
1. Register → choose role → redirect to login
2. Login → JWT stored in `localStorage` → redirect to role dashboard
3. Expired token → auto-refreshed via Axios interceptor
4. Protected routes redirect unauthenticated users to `/login`

---

## Development

### Backend

```bash
cd taskapp_full
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd taskapp-web
npm run dev      # Development server (port 3000)
npm run build    # Production build
npm run preview  # Preview production build
```

### Useful commands

```bash
# Stop PostgreSQL
cd taskapp_full && docker compose down

# Stop PostgreSQL and remove data volume
cd taskapp_full && docker compose down -v
```

---

## License

This project is open source. Add your preferred license file (e.g. MIT) before publishing.

---

## Acknowledgments

Built as a learning platform combining classroom management, task tracking, and gamification to help teachers and students stay organized and motivated.
