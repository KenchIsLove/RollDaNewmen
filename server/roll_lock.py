"""
Per-user roll lock — enforces a minimum interval between rolls for a single
user, so two browser tabs can't fire overlapping rolls.

Critical: the lock must outlive the request itself. `perform_roll` only
takes a few ms, but the spinner animation runs for several seconds; if the
lock released as soon as the request finished, a second tab could squeeze
in a fresh roll the moment the first one's DB write committed. We solve
this by attaching an `expires_at` to each entry — the lock auto-clears
after the full animation window, with no `release()` call on success.

Process-local. Same single-instance constraint as `cache.py` and the chat
WebSocket router: with >1 replica, a user could roll once per replica.
For that case, replace the dict with `SET NX PX <ms>` against Redis.
The DB-backed `RollLog.revealed_at` check in the /roll handler is the
durable safety net that survives both restarts and multi-replica setups.
"""
import asyncio
import time
import uuid

# user_id -> monotonic time at which the lock auto-clears.
_holders: dict[uuid.UUID, float] = {}
_mutex = asyncio.Lock()


async def acquire(user_id: uuid.UUID, hold_seconds: float) -> bool:
    """
    Try to acquire the roll lock for `user_id`, holding it for
    `hold_seconds` even if the caller never explicitly releases.

    Returns True on success, False if the lock is still held by a
    previous roll within its hold window.
    """
    now = time.monotonic()
    async with _mutex:
        expires_at = _holders.get(user_id)
        if expires_at is not None and now < expires_at:
            return False
        _holders[user_id] = now + hold_seconds
        return True


async def release(user_id: uuid.UUID) -> None:
    """
    Release the lock early — call this on roll *failure* so the user
    can retry without waiting out the full hold window. On success,
    do NOT call release: the auto-expiry is what gates the cooldown.
    """
    async with _mutex:
        _holders.pop(user_id, None)
