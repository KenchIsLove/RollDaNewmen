from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import get_current_user
from models import User, Character, RollLog
from schemas import RollHistoryEntry

router = APIRouter(prefix="/rolls", tags=["rolls"])


@router.get("/me", response_model=list[RollHistoryEntry])
async def my_rolls(
    limit: int = Query(default=5, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        select(Character.name, Character.base_rarity)
        .join(RollLog, RollLog.character_id == Character.id)
        .where(RollLog.user_id == user.id)
        .order_by(desc(RollLog.rolled_at))
        .limit(limit)
    )
    return [RollHistoryEntry(character=r.name, rarity=r.base_rarity) for r in rows]
