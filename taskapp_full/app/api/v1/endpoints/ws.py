import asyncio
import uuid

from fastapi import WebSocket, WebSocketDisconnect

from app.core.security import decode_token
from app.core.websocket_manager import manager


async def ws_endpoint(websocket: WebSocket, user_id: uuid.UUID):
    token = websocket.query_params.get("token")
    payload = decode_token(token) if token else {}

    if not payload or payload.get("type") != "access" or str(payload.get("sub")) != str(user_id):
        await websocket.close(code=1008)
        return

    await manager.connect(user_id, websocket)

    try:
        while True:
            try:
                message = await asyncio.wait_for(websocket.receive_json(), timeout=30)
            except asyncio.TimeoutError:
                await websocket.send_json({"type": "ping"})
                continue

            if message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(user_id)
    except Exception:
        manager.disconnect(user_id)
