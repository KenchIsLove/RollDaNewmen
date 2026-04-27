from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from dependencies import get_current_user
from models import User, Stats, Upgrades
from schemas import PublicProfileOut, PrivateProfileOut, StatsOut, UpgradesOut, ProfileUpdateRequest

router = APIRouter(prefix="/players", tags=["players"])

_USERNAME_PATTERN = r"^[a-zA-Z0-9_]{3,32}$"


@router.get("/me", response_model=PrivateProfileOut)
async def my_profile(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stats, upgrades = await _load_stats_and_upgrades(user.id, db)
    return PrivateProfileOut(
        username=user.username,
        coins=user.coins,
        created_at=user.created_at,
        stats=_build_stats_out(stats),
        upgrades=UpgradesOut(
            luck_level=upgrades.luck_level if upgrades else 0,
            speed_level=upgrades.speed_level if upgrades else 0,
        ),
        avatar_url=user.avatar_url,
        bio=user.bio,
        banner_color=user.banner_color or '#7c3aed',
    )


@router.patch("/me", response_model=PrivateProfileOut)
async def update_profile(
    body: ProfileUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if "avatar_url" in body.model_fields_set:
        user.avatar_url = body.avatar_url
    if "bio" in body.model_fields_set:
        user.bio = body.bio
    if "banner_color" in body.model_fields_set and body.banner_color is not None:
        user.banner_color = body.banner_color
    await db.commit()

    stats, upgrades = await _load_stats_and_upgrades(user.id, db)
    return PrivateProfileOut(
        username=user.username,
        coins=user.coins,
        created_at=user.created_at,
        stats=_build_stats_out(stats),
        upgrades=UpgradesOut(
            luck_level=upgrades.luck_level if upgrades else 0,
            speed_level=upgrades.speed_level if upgrades else 0,
        ),
        avatar_url=user.avatar_url,
        bio=user.bio,
        banner_color=user.banner_color or '#7c3aed',
    )


@router.get("/{username}", response_model=PublicProfileOut)
async def player_profile(
    username: str = Path(min_length=3, max_length=32, pattern=_USERNAME_PATTERN),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.username == username))
    target = result.scalar_one_or_none()
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Player not found")

    stats, _ = await _load_stats_and_upgrades(target.id, db)
    return PublicProfileOut(
        username=target.username,
        created_at=target.created_at,
        stats=_build_stats_out(stats),
        avatar_url=target.avatar_url,
        bio=target.bio,
        banner_color=target.banner_color or '#7c3aed',
    )


async def _load_stats_and_upgrades(user_id, db: AsyncSession):
    stats_result = await db.execute(
        select(Stats)
        .where(Stats.user_id == user_id)
        .options(selectinload(Stats.rarest_character))
    )
    stats = stats_result.scalar_one_or_none()

    upg_result = await db.execute(select(Upgrades).where(Upgrades.user_id == user_id))
    upgrades = upg_result.scalar_one_or_none()

    return stats, upgrades


def _build_stats_out(stats: Stats | None) -> StatsOut:
    if stats is None:
        return StatsOut(
            total_rolls=0, total_value=0, rarity_score=0,
            rarest_character=None, rarest_rarity=None,
        )
    rarest_name   = stats.rarest_character.name        if stats.rarest_character else None
    rarest_rarity = stats.rarest_character.base_rarity if stats.rarest_character else None
    return StatsOut(
        total_rolls=stats.total_rolls,
        total_value=stats.total_value,
        rarity_score=stats.rarity_score,
        rarest_character=rarest_name,
        rarest_rarity=rarest_rarity,
    )
