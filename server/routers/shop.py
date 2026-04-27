from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import get_current_user
from game_data import luck_upgrade_price, speed_upgrade_price
from models import User, Upgrades
from schemas import ShopBuyRequest, ShopBuyResult

router = APIRouter(prefix="/shop", tags=["shop"])


@router.post("/buy", response_model=ShopBuyResult)
async def buy_upgrade(
    body: ShopBuyRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Upgrades).where(Upgrades.user_id == user.id))
    upgrades = result.scalar_one_or_none()
    if upgrades is None:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Upgrades record missing")

    if body.item == "luck":
        price = luck_upgrade_price(upgrades.luck_level)
        if user.coins < price:
            raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, detail="Not enough coins")
        user.coins -= price
        upgrades.luck_level += 1
        new_level = upgrades.luck_level
    else:
        price = speed_upgrade_price(upgrades.speed_level)
        if user.coins < price:
            raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, detail="Not enough coins")
        user.coins -= price
        upgrades.speed_level += 1
        new_level = upgrades.speed_level

    await db.commit()

    return ShopBuyResult(
        item=body.item,
        new_level=new_level,
        coins_spent=price,
        coins_remaining=user.coins,
    )
