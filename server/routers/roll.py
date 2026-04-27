from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import get_current_user
from limiter import limiter
from models import User
from schemas import RollOut
from services.roll_service import perform_roll

router = APIRouter(prefix="/roll", tags=["roll"])


@router.post("", response_model=RollOut)
@limiter.limit("60/minute")
async def roll(
    request: Request,  # required by slowapi
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await perform_roll(user, db)
