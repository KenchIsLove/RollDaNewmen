"""
Trade execution with row-level locking to prevent race conditions.
All ownership checks and item transfers run inside a single transaction.
"""
import uuid
from fastapi import HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models import Character, Inventory, Stats, Trade, TradeItem, User
from schemas import TradeOut, TradeItemOut


# ── Public helpers ────────────────────────────────────────────────────────────

async def get_trade_or_404(trade_id: int, db: AsyncSession) -> Trade:
    result = await db.execute(
        select(Trade)
        .where(Trade.id == trade_id)
        .options(
            selectinload(Trade.items).selectinload(TradeItem.character),
            selectinload(Trade.sender),
            selectinload(Trade.receiver),
        )
    )
    trade = result.scalar_one_or_none()
    if trade is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Trade not found")
    return trade


def trade_to_schema(trade: Trade) -> TradeOut:
    return TradeOut(
        id=trade.id,
        sender_username=trade.sender.username,
        receiver_username=trade.receiver.username,
        status=trade.status,
        items=[
            TradeItemOut(
                character_name=item.character.name,
                rarity=item.character.base_rarity,
                count=item.count,
                type=item.type,
            )
            for item in trade.items
        ],
        created_at=trade.created_at,
    )


# ── Accept ────────────────────────────────────────────────────────────────────

async def accept_trade(trade_id: int, acceptor: User, db: AsyncSession) -> Trade:
    # Lock the trade row first to block concurrent accepts
    lock_result = await db.execute(
        select(Trade).where(Trade.id == trade_id).with_for_update()
    )
    trade = lock_result.scalar_one_or_none()
    if trade is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Trade not found")
    if trade.receiver_id != acceptor.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not your trade to accept")
    if trade.status != "pending":
        raise HTTPException(
            status.HTTP_409_CONFLICT, detail=f"Trade is already {trade.status}"
        )

    # Reload items with characters for the ownership checks
    items_result = await db.execute(
        select(TradeItem)
        .where(TradeItem.trade_id == trade_id)
        .options(selectinload(TradeItem.character))
    )
    items = items_result.scalars().all()
    offered   = [i for i in items if i.type == "offered"]
    requested = [i for i in items if i.type == "requested"]

    # Verify sender still owns all offered items (with row locks)
    await _verify_ownership(db, trade.sender_id, offered)

    # Verify receiver still owns all requested items (with row locks)
    await _verify_ownership(db, trade.receiver_id, requested)

    # Execute the atomic swap
    for item in offered:
        await _transfer(db, trade.sender_id, trade.receiver_id, item)
    for item in requested:
        await _transfer(db, trade.receiver_id, trade.sender_id, item)

    # Recalculate rarest_owned for both parties (they may have given away their rarest)
    await _refresh_rarest(db, trade.sender_id)
    await _refresh_rarest(db, trade.receiver_id)

    trade.status = "accepted"
    await db.commit()

    return await get_trade_or_404(trade_id, db)


# ── Internal helpers ──────────────────────────────────────────────────────────

async def _verify_ownership(
    db: AsyncSession,
    user_id: uuid.UUID,
    items: list[TradeItem],
) -> None:
    for item in items:
        result = await db.execute(
            select(Inventory)
            .where(
                and_(
                    Inventory.user_id == user_id,
                    Inventory.character_id == item.character_id,
                )
            )
            .with_for_update()
        )
        row = result.scalar_one_or_none()
        if row is None or row.count < item.count:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail=f"Insufficient '{item.character.name}' to complete trade",
            )


async def _transfer(
    db: AsyncSession,
    from_id: uuid.UUID,
    to_id: uuid.UUID,
    item: TradeItem,
) -> None:
    char_value = item.character.value * item.count

    # Deduct from sender inventory
    from_inv = await db.execute(
        select(Inventory).where(
            and_(
                Inventory.user_id == from_id,
                Inventory.character_id == item.character_id,
            )
        )
    )
    from_row = from_inv.scalar_one()
    from_row.count -= item.count

    # Credit receiver inventory
    to_inv = await db.execute(
        select(Inventory).where(
            and_(
                Inventory.user_id == to_id,
                Inventory.character_id == item.character_id,
            )
        )
    )
    to_row = to_inv.scalar_one_or_none()
    if to_row:
        to_row.count += item.count
    else:
        db.add(Inventory(user_id=to_id, character_id=item.character_id, count=item.count))

    # Update total_value in Stats for both parties
    from_stats = await db.execute(select(Stats).where(Stats.user_id == from_id))
    from_st = from_stats.scalar_one_or_none()
    if from_st:
        from_st.total_value = max(0, from_st.total_value - char_value)

    to_stats = await db.execute(select(Stats).where(Stats.user_id == to_id))
    to_st = to_stats.scalar_one_or_none()
    if to_st:
        to_st.total_value += char_value


async def _refresh_rarest(db: AsyncSession, user_id: uuid.UUID) -> None:
    """Recalculate rarest_owned by scanning current inventory."""
    result = await db.execute(
        select(Inventory.character_id)
        .join(Character, Character.id == Inventory.character_id)
        .where(and_(Inventory.user_id == user_id, Inventory.count > 0))
        .order_by(Character.weight.asc())
        .limit(1)
    )
    rarest_id = result.scalar_one_or_none()

    stats_result = await db.execute(select(Stats).where(Stats.user_id == user_id))
    stats = stats_result.scalar_one_or_none()
    if stats:
        stats.rarest_owned = rarest_id
