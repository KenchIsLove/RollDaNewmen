from datetime import datetime, timezone
from typing import Literal
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession

import cache
from database import get_db
from models import User, Character, Stats
from schemas import LeaderboardOut, LeaderboardEntry

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])

_CACHE_TTL = 30.0


@router.get("/{board}", response_model=LeaderboardOut)
async def get_leaderboard(
    board: Literal["rarity_score", "total_rolls", "rarest_char"],
    limit: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    key = f"lb:{board}:{limit}"
    cached = cache.get(key)
    if cached:
        return cached

    entries = await _query(board, limit, db)
    result = LeaderboardOut(
        board=board,
        entries=entries,
        cached_at=datetime.now(timezone.utc),
    )
    cache.set(key, result, ttl=_CACHE_TTL)
    return result


async def _query(board: str, limit: int, db: AsyncSession) -> list[LeaderboardEntry]:
    if board == "rarity_score":
        rows = await db.execute(
            select(User.username, Stats.rarity_score)
            .join(Stats, Stats.user_id == User.id)
            .order_by(desc(Stats.rarity_score))
            .limit(limit)
        )
        return [
            LeaderboardEntry(rank=i + 1, username=r.username, value=r.rarity_score)
            for i, r in enumerate(rows)
        ]

    if board == "total_rolls":
        rows = await db.execute(
            select(User.username, Stats.total_rolls)
            .join(Stats, Stats.user_id == User.id)
            .order_by(desc(Stats.total_rolls))
            .limit(limit)
        )
        return [
            LeaderboardEntry(rank=i + 1, username=r.username, value=r.total_rolls)
            for i, r in enumerate(rows)
        ]

    # rarest_char — join to characters to sort by weight (lower = rarer)
    rows = await db.execute(
        select(User.username, Character.name, Character.base_rarity, Character.weight)
        .join(Stats, Stats.user_id == User.id)
        .join(Character, Character.id == Stats.rarest_owned)
        .where(Stats.rarest_owned.is_not(None))
        .order_by(asc(Character.weight))
        .limit(limit)
    )
    return [
        LeaderboardEntry(
            rank=i + 1,
            username=r.username,
            value=r.base_rarity,
            rarest_character_name=r.name,
            rarest_character_rarity=r.base_rarity,
        )
        for i, r in enumerate(rows)
    ]
