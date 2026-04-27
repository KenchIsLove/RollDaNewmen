from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from dependencies import get_current_user
from models import User, Inventory
from schemas import InventoryOut, InventoryItemOut

router = APIRouter(prefix="/inventory", tags=["inventory"])

_USERNAME_PATTERN = r"^[a-zA-Z0-9_]{3,32}$"


@router.get("", response_model=InventoryOut)
async def my_inventory(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _build_inventory(user.id, db)


@router.get("/{username}", response_model=InventoryOut)
async def player_inventory(
    username: str = Path(min_length=3, max_length=32, pattern=_USERNAME_PATTERN),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.username == username))
    target = result.scalar_one_or_none()
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Player not found")
    return await _build_inventory(target.id, db)


async def _build_inventory(user_id, db: AsyncSession) -> InventoryOut:
    result = await db.execute(
        select(Inventory)
        .where(Inventory.user_id == user_id, Inventory.count > 0)
        .options(selectinload(Inventory.character))
        .order_by(Inventory.character_id)
    )
    rows = result.scalars().all()
    items = [
        InventoryItemOut(
            character_name=row.character.name,
            rarity=row.character.base_rarity,
            count=row.count,
        )
        for row in rows
    ]
    total_value = sum(r.character.value * r.count for r in rows)
    return InventoryOut(items=items, total_value=total_value)
