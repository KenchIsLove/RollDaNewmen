"""
In-memory TTL cache for leaderboard results.

Replacement path for Redis:
  Replace get/set/invalidate with calls to an aioredis client.
  The rest of the codebase imports only these three functions.
"""
import time
from typing import Any

_store: dict[str, tuple[Any, float]] = {}


def get(key: str) -> Any | None:
    entry = _store.get(key)
    if entry is None:
        return None
    value, expires_at = entry
    if time.monotonic() > expires_at:
        del _store[key]
        return None
    return value


def set(key: str, value: Any, ttl: float = 30.0) -> None:
    _store[key] = (value, time.monotonic() + ttl)


def invalidate(key: str) -> None:
    _store.pop(key, None)
