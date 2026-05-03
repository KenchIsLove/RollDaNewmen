from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User, Character, RollLog
from schemas import RecentDropOut

router = APIRouter(prefix="/drops", tags=["drops"])

_EPIC_WEIGHT = 200_000   # Epic and above have weight <= 200,000 (×1000 scaled)


@router.get("/recent", response_model=list[RecentDropOut])
async def recent_drops(
    limit: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        select(User.username, Character.name, Character.base_rarity)
        .join(RollLog, RollLog.user_id == User.id)
        .join(Character, Character.id == RollLog.character_id)
        .where(Character.weight <= _EPIC_WEIGHT)
        # Hide rolls whose animation hasn't finished yet. NULL = legacy
        # rows from before this column existed; treat as already revealed.
        .where(or_(RollLog.revealed_at.is_(None), RollLog.revealed_at <= func.now()))
        .order_by(desc(RollLog.rolled_at))
        .limit(limit)
    )
    return [
        RecentDropOut(username=r.username, character=r.name, rarity=r.base_rarity)
        for r in rows
    ]
