"""
Live global chat — WebSocket broadcast with in-memory history.

All connections share one channel. Messages are not persisted across
process restarts; swap the deque for a DB-backed log if needed later.
"""
import asyncio
import json
import re
import time
import uuid
from collections import deque
from datetime import datetime, timezone

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from jose import JWTError
from sqlalchemy import select

from auth import decode_token
from database import AsyncSessionLocal
from models import User

router = APIRouter(tags=["chat"])

_MAX_HISTORY  = 50
_MAX_MSG_LEN  = 240
_MAX_RAW_LEN  = 1024              # raw JSON envelope cap
_MIN_INTERVAL = 1.0               # seconds between messages from a single socket

# Strip C0 controls except \t \n \r, plus DEL.
_CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


class _Manager:
    def __init__(self) -> None:
        self.connections: set[WebSocket] = set()
        self.history: deque[dict] = deque(maxlen=_MAX_HISTORY)
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self.connections.add(ws)

    async def disconnect(self, ws: WebSocket) -> None:
        async with self._lock:
            self.connections.discard(ws)

    async def broadcast(self, message: dict) -> None:
        self.history.append(message)
        async with self._lock:
            stale: list[WebSocket] = []
            for ws in self.connections:
                try:
                    await ws.send_json(message)
                except Exception:
                    stale.append(ws)
            for ws in stale:
                self.connections.discard(ws)


_mgr = _Manager()


async def _send_error(ws: WebSocket, msg: str) -> None:
    try:
        await ws.send_json({"error": msg})
    except Exception:
        pass


@router.get("/chat/history")
async def get_history() -> list[dict]:
    return list(_mgr.history)


@router.websocket("/ws/chat")
async def chat_ws(ws: WebSocket, token: str = Query(...)) -> None:
    if not token or len(token) > 4096:
        await ws.close(code=4401)
        return

    try:
        payload = decode_token(token)
        user_id = uuid.UUID(payload["sub"])
    except (JWTError, KeyError, ValueError):
        await ws.close(code=4401)
        return

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

    if user is None:
        await ws.close(code=4401)
        return

    await _mgr.connect(ws)
    last_msg_at = 0.0

    try:
        while True:
            try:
                raw = await ws.receive_text()
            except WebSocketDisconnect:
                break

            if len(raw) > _MAX_RAW_LEN:
                await _send_error(ws, "Message too long")
                continue

            try:
                data = json.loads(raw)
            except (json.JSONDecodeError, ValueError):
                await _send_error(ws, "Invalid JSON")
                continue

            if not isinstance(data, dict):
                await _send_error(ws, "Expected JSON object")
                continue

            text = data.get("text")
            if not isinstance(text, str):
                await _send_error(ws, "Missing or non-string 'text' field")
                continue

            text = _CONTROL_CHARS_RE.sub("", text).strip()
            if not text:
                continue
            if len(text) > _MAX_MSG_LEN:
                await _send_error(ws, "Message too long")
                continue

            now = time.monotonic()
            if now - last_msg_at < _MIN_INTERVAL:
                await _send_error(ws, "Slow down")
                continue
            last_msg_at = now

            await _mgr.broadcast({
                "username": user.username,
                "text": text,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
    except WebSocketDisconnect:
        pass
    finally:
        await _mgr.disconnect(ws)
