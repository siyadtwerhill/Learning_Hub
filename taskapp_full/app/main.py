from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router
from app.api.v1.endpoints.ws import ws_endpoint
from app.db.session import engine, Base

# Import all models so SQLAlchemy registers them before create_all
import app.models.user
import app.models.room
import app.models.task
import app.models.progress
import app.models.notification
import app.models.leaderboard


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="TaskApp API",
    description="Classroom task management platform — teachers, students, independent learners.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.add_api_websocket_route("/ws/{user_id}", ws_endpoint)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}
