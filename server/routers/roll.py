from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import get_current_user
from limiter import limiter
from models import RollLog, User
from roll_lock import acquire, release
from schemas import RollOut
from services.roll_service import ROLL_ANIMATION_SECONDS, perform_roll

router = APIRouter(prefix="/roll", tags=["roll"])

# How long to keep a user's lock held after a successful roll. Must cover
# the full animation window so a second tab can't fire a new roll the moment
# the DB write commits. A small slack past ROLL_ANIMATION_SECONDS keeps the
# lock and the visibility gate in step even with clock skew.
_LOCK_HOLD_SECONDS = ROLL_ANIMATION_SECONDS + 1


@router.post("", response_model=RollOut)
@limiter.limit("60/minute")
async def roll(
    request: Request,  # required by slowapi
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 1. Fast in-memory lock — catches concurrent /roll requests from
    #    the same user (e.g. two tabs clicking at the same instant) and
    #    keeps the lock held for the full animation duration so they
    #    can't fire back-to-back rolls either.
    if not await acquire(user.id, _LOCK_HOLD_SECONDS):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="Roll already in progress",
        )

    # 2. Durable safety net: if the most recent RollLog for this user
    #    still has `revealed_at` in the future, that user's previous
    #    roll is mid-animation — refuse, even if the in-memory lock
    #    was wiped by a server restart or doesn't exist on this replica.
    #    Indexed on user_id; cheap.
    pending = await db.execute(
        select(RollLog.id)
        .where(RollLog.user_id == user.id)
        .where(RollLog.revealed_at > func.now())
        .limit(1)
    )
    if pending.scalar_one_or_none() is not None:
        # Don't clear the in-memory lock here — its hold window matches
        # the DB gate, so leaving it set just keeps both signals consistent.
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="Roll already in progress",
        )

    try:
        return await perform_roll(user, db)
    except Exception:
        # Failure path: free the in-memory lock so the user can retry
        # immediately. If perform_roll committed the RollLog before
        # crashing, the DB safety net will gate the next attempt anyway.
        await release(user.id)
        raise
