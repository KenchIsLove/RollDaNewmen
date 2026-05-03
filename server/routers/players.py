from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

import cache
from database import get_db
from dependencies import get_current_user
from limiter import limiter
from models import Character, Inventory, Stats, Upgrades, User
from schemas import (
    InventoryItemOut,
    PlayerSearchResult,
    PrivateProfileOut,
    ProfileUpdateRequest,
    PublicProfileOut,
    ShowcaseCharacterOut,
    StatsOut,
    UpgradesOut,
)

router = APIRouter(prefix="/players", tags=["players"])

_USERNAME_PATTERN    = r"^[a-zA-Z0-9_]{3,32}$"
_SEARCH_PATTERN      = r"^[a-zA-Z0-9_]+$"
_TOP_INVENTORY_LIMIT = 5
_SEARCH_CACHE_TTL    = 10.0


@router.get("/me", response_model=PrivateProfileOut)
async def my_profile(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _build_private_profile(user, db)


@router.patch("/me", response_model=PrivateProfileOut)
async def update_profile(
    body: ProfileUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    fields = body.model_fields_set

    if "showcase_character_ids" in fields:
        ids = body.showcase_character_ids or []
        if ids:
            await _verify_showcase_ownership(ids, user.id, db)
        user.showcase_character_ids = ids

    if "avatar_url" in fields:
        user.avatar_url = body.avatar_url
    if "bio" in fields:
        user.bio = body.bio
    if "banner_color" in fields and body.banner_color is not None:
        user.banner_color = body.banner_color
    if "display_title" in fields:
        user.display_title = body.display_title or ''
    if "banner_image_url" in fields:
        user.banner_image_url = body.banner_image_url
    if "theme_preset" in fields and body.theme_preset is not None:
        user.theme_preset = body.theme_preset

    await db.commit()
    await db.refresh(user)

    return await _build_private_profile(user, db)


@router.get("/search", response_model=list[PlayerSearchResult])
@limiter.limit("30/minute")
async def search_players(
    request: Request,
    q: str = Query(min_length=2, max_length=32, pattern=_SEARCH_PATTERN),
    limit: int = Query(default=10, ge=1, le=25),
    db: AsyncSession = Depends(get_db),
):
    q_lower   = q.lower()
    cache_key = f"player_search:{q_lower}:{limit}"
    cached    = cache.get(cache_key)
    if cached is not None:
        return cached

    rows = await db.execute(
        select(User.username, User.avatar_url, Stats.rarity_score)
        .join(Stats, Stats.user_id == User.id)
        .where(User.username.like(q_lower + '%'))
        .order_by(desc(Stats.rarity_score))
        .limit(limit)
    )
    results = [
        PlayerSearchResult(
            username=row.username,
            avatar_url=row.avatar_url,
            rarity_score=row.rarity_score,
        )
        for row in rows
    ]
    cache.set(cache_key, results, ttl=_SEARCH_CACHE_TTL)
    return results


@router.get("/{username}", response_model=PublicProfileOut)
async def player_profile(
    username: str = Path(min_length=3, max_length=32, pattern=_USERNAME_PATTERN),
    db: AsyncSession = Depends(get_db),
):
    target_username = username.lower()
    result = await db.execute(select(User).where(User.username == target_username))
    target = result.scalar_one_or_none()
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Player not found")

    stats, _      = await _load_stats_and_upgrades(target.id, db)
    top_inventory = await _load_top_inventory(target.id, db)
    showcase      = await _load_showcase(target.showcase_character_ids or [], db)
    return PublicProfileOut(
        username=target.username,
        created_at=target.created_at,
        stats=_build_stats_out(stats),
        avatar_url=target.avatar_url,
        bio=target.bio,
        banner_color=target.banner_color or '#7c3aed',
        top_inventory=top_inventory,
        display_title=target.display_title or '',
        banner_image_url=target.banner_image_url,
        theme_preset=target.theme_preset or 'midnight',
        showcase=showcase,
    )


async def _build_private_profile(user: User, db: AsyncSession) -> PrivateProfileOut:
    stats, upgrades = await _load_stats_and_upgrades(user.id, db)
    top_inventory   = await _load_top_inventory(user.id, db)
    showcase        = await _load_showcase(user.showcase_character_ids or [], db)
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
        top_inventory=top_inventory,
        display_title=user.display_title or '',
        banner_image_url=user.banner_image_url,
        theme_preset=user.theme_preset or 'midnight',
        showcase=showcase,
    )


async def _verify_showcase_ownership(ids: list[int], user_id, db: AsyncSession) -> None:
    char_result = await db.execute(
        select(Character.id).where(Character.id.in_(ids))
    )
    existing_ids = set(char_result.scalars().all())
    missing = [i for i in ids if i not in existing_ids]
    if missing:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown character IDs: {missing}",
        )

    inv_result = await db.execute(
        select(Inventory.character_id)
        .where(
            Inventory.user_id == user_id,
            Inventory.count > 0,
            Inventory.character_id.in_(ids),
        )
    )
    owned_ids = set(inv_result.scalars().all())
    unowned = [i for i in ids if i not in owned_ids]
    if unowned:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"You do not own characters with IDs: {unowned}",
        )


async def _load_showcase(ids: list[int], db: AsyncSession) -> list[ShowcaseCharacterOut]:
    if not ids:
        return []
    result = await db.execute(
        select(Character)
        .where(Character.id.in_(ids))
        .order_by(Character.weight.asc())
    )
    chars = result.scalars().all()
    return [
        ShowcaseCharacterOut(id=c.id, name=c.name, base_rarity=c.base_rarity)
        for c in chars
    ]


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


async def _load_top_inventory(user_id, db: AsyncSession) -> list[InventoryItemOut]:
    result = await db.execute(
        select(Inventory)
        .join(Character, Character.id == Inventory.character_id)
        .where(Inventory.user_id == user_id, Inventory.count > 0)
        .options(selectinload(Inventory.character))
        .order_by(Character.weight.asc())
        .limit(_TOP_INVENTORY_LIMIT)
    )
    rows = result.scalars().all()
    return [
        InventoryItemOut(
            character_id=row.character.id,
            character_name=row.character.name,
            rarity=row.character.base_rarity,
            count=row.count,
        )
        for row in rows
    ]


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
