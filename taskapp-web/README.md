# TaskFlow — Frontend (React + Tailwind)

## Stack
- React 18 + Vite
- Tailwind CSS v3
- React Router v6
- React Hook Form
- Axios (with JWT interceptor + auto-refresh)
- React Hot Toast

## Setup

```bash
npm install
cp .env.example .env
npm run dev
# → http://localhost:3000
```

## Pages built (Auth phase)

| Route | Page | Who |
|-------|------|-----|
| `/login` | Login form | Anyone |
| `/register` | Register + role picker | Anyone |
| `/student` | Student dashboard (placeholder) | Student / Independent |
| `/teacher` | Teacher dashboard (placeholder) | Teacher |
| `/admin` | Admin dashboard (placeholder) | Admin |

## Auth flow
1. Register → choose role (Teacher / Student / Solo Learner) → redirected to login
2. Login → JWT stored in localStorage → redirected to role-based dashboard
3. Expired token → auto-refreshed via axios interceptor
4. Protected routes redirect unauthenticated users to /login

## Next
Run `npm run dev` and continue with the Teacher dashboard (rooms + tasks).
