from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from dependencies import get_current_user
from game_data import CHAR_MAP
from models import User, Trade, TradeItem, Inventory
from schemas import (
    TradeCreateRequest,
    TradeDetailItemOut,
    TradeDetailOut,
    TradeOut,
)
from services.trade_service import accept_trade, get_trade_or_404, trade_to_schema

router = APIRouter(prefix="/trades", tags=["trades"])

# History tab covers everything that's no longer pending.
_HISTORY_STATUSES = ("accepted", "declined", "cancelled")

# Best-effort image filename derived from the character name. Mirrors the
# frontend's `/images/<snake_case>.png` convention. The frontend's CHAR_MAP
# is still the source of truth for whether art actually exists; this is a
# convenience field on the detail payload.
def _image_path(character_name: str) -> str:
    slug = character_name.lower().replace(" ", "_")
    if slug.startswith("the_"):
        slug = slug[4:]
    return f"/images/{slug}.png"


@router.post("", response_model=TradeOut, status_code=status.HTTP_201_CREATED)
async def create_trade(
    body: TradeCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.receiver_username == user.username:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Cannot trade with yourself")

    receiver_result = await db.execute(
        select(User).where(User.username == body.receiver_username)
    )
    receiver = receiver_result.scalar_one_or_none()
    if receiver is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Receiver not found")

    # Validate all character names exist in game data
    all_names = [s.character_name for s in body.offered + body.requested]
    unknown = [n for n in all_names if n not in CHAR_MAP]
    if unknown:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, detail=f"Unknown characters: {unknown}"
        )

    # Validate sender owns enough of each offered character
    for spec in body.offered:
        char = CHAR_MAP[spec.character_name]
        from models import Character
        char_result = await db.execute(
            select(Character).where(Character.name == spec.character_name)
        )
        char_row = char_result.scalar_one_or_none()
        if char_row is None:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail=f"Character '{spec.character_name}' not in database — run /init",
            )

        inv_result = await db.execute(
            select(Inventory).where(
                and_(
                    Inventory.user_id == user.id,
                    Inventory.character_id == char_row.id,
                )
            )
        )
        row = inv_result.scalar_one_or_none()
        if row is None or row.count < spec.count:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail=f"You don't own enough '{spec.character_name}'",
            )

    trade = Trade(sender_id=user.id, receiver_id=receiver.id)
    db.add(trade)
    await db.flush()

    for spec in body.offered:
        from models import Character
        char_result = await db.execute(
            select(Character).where(Character.name == spec.character_name)
        )
        char_row = char_result.scalar_one()
        db.add(TradeItem(
            trade_id=trade.id,
            character_id=char_row.id,
            count=spec.count,
            type="offered",
        ))

    for spec in body.requested:
        from models import Character
        char_result = await db.execute(
            select(Character).where(Character.name == spec.character_name)
        )
        char_row = char_result.scalar_one()
        db.add(TradeItem(
            trade_id=trade.id,
            character_id=char_row.id,
            count=spec.count,
            type="requested",
        ))

    await db.commit()
    trade = await get_trade_or_404(trade.id, db)
    return trade_to_schema(trade)


@router.get("", response_model=list[TradeOut])
async def list_my_trades(
    tab: Literal["sent", "received", "history"] | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Without `tab`: returns all pending trades involving the current user
    (legacy behavior). With `tab`: filters by role + status combination.
    """
    if tab == "sent":
        where_clause = and_(
            Trade.sender_id == user.id,
            Trade.status == "pending",
        )
    elif tab == "received":
        where_clause = and_(
            Trade.receiver_id == user.id,
            Trade.status == "pending",
        )
    elif tab == "history":
        where_clause = and_(
            or_(Trade.sender_id == user.id, Trade.receiver_id == user.id),
            Trade.status.in_(_HISTORY_STATUSES),
        )
    else:
        where_clause = and_(
            Trade.status == "pending",
            or_(Trade.sender_id == user.id, Trade.receiver_id == user.id),
        )

    result = await db.execute(
        select(Trade)
        .where(where_clause)
        .options(
            selectinload(Trade.items).selectinload(TradeItem.character),
            selectinload(Trade.sender),
            selectinload(Trade.receiver),
        )
        .order_by(Trade.created_at.desc())
    )
    trades = result.scalars().all()
    return [trade_to_schema(t) for t in trades]


@router.get("/{trade_id}", response_model=TradeDetailOut)
async def get_single_trade(
    trade_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Single-trade detail. Restricted to sender/receiver — for any other
    viewer we return 404 (not 403) so trade existence stays opaque.
    """
    trade = await get_trade_or_404(trade_id, db)
    if user.id not in (trade.sender_id, trade.receiver_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Trade not found")

    return TradeDetailOut(
        id=trade.id,
        sender_username=trade.sender.username,
        receiver_username=trade.receiver.username,
        status=trade.status,
        created_at=trade.created_at,
        items=[
            TradeDetailItemOut(
                character_name=item.character.name,
                rarity=item.character.base_rarity,
                count=item.count,
                type=item.type,
                image=_image_path(item.character.name),
            )
            for item in trade.items
        ],
    )


@router.post("/{trade_id}/accept", response_model=TradeOut)
async def accept(
    trade_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trade = await accept_trade(trade_id, user, db)
    return trade_to_schema(trade)


@router.post("/{trade_id}/decline", response_model=TradeOut)
async def decline(
    trade_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trade = await _set_status(trade_id, user.id, "receiver", "declined", db)
    return trade_to_schema(trade)


@router.post("/{trade_id}/cancel", response_model=TradeOut)
async def cancel(
    trade_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trade = await _set_status(trade_id, user.id, "sender", "cancelled", db)
    return trade_to_schema(trade)


async def _set_status(
    trade_id: int,
    user_id,
    required_role: str,
    new_status: str,
    db: AsyncSession,
) -> Trade:
    trade = await get_trade_or_404(trade_id, db)
    if trade.status != "pending":
        raise HTTPException(
            status.HTTP_409_CONFLICT, detail=f"Trade is already {trade.status}"
        )
    if required_role == "receiver" and trade.receiver_id != user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not your trade to decline")
    if required_role == "sender" and trade.sender_id != user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not your trade to cancel")
    trade.status = new_status
    await db.commit()
    return await get_trade_or_404(trade_id, db)
