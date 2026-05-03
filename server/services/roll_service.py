"""
All roll logic lives here. The router layer only calls perform_roll().
No roll result is ever accepted from the client.
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert

from game_data import RARITIES, RARE_THRESHOLD_WEIGHT, RARITY_SCORES, server_roll
from models import User, Character, Inventory, Upgrades, Stats, RollLog
from schemas import RollOut

# How long the client-side roll animation runs. Public feeds hide rolls
# whose `revealed_at` is still in the future, so the result doesn't leak
# into other players' "recent drops" before the roller has seen it.
# Tune this to match the frontend animation duration.
ROLL_ANIMATION_SECONDS = 6


async def perform_roll(user: User, db: AsyncSession) -> RollOut:
    # 1. Load luck level
    upg_result = await db.execute(
        select(Upgrades).where(Upgrades.user_id == user.id)
    )
    upgrades = upg_result.scalar_one_or_none()
    luck_level = upgrades.luck_level if upgrades else 0

    # 2. Server-side RNG
    char_name, rarity, description = server_roll(luck_level)
    rarity_data = RARITIES[rarity]
    value = rarity_data["coins"]
    is_rare = rarity_data["weight"] <= RARE_THRESHOLD_WEIGHT

    # 3. Resolve character record
    char_result = await db.execute(
        select(Character).where(Character.name == char_name)
    )
    character = char_result.scalar_one()

    # 4. Log this roll. `revealed_at` gates visibility in feeds — it's set
    #    just past the spinner animation so other players can't peek before
    #    the roller sees their own result.
    revealed_at = datetime.now(timezone.utc) + timedelta(seconds=ROLL_ANIMATION_SECONDS)
    db.add(RollLog(
        user_id=user.id,
        character_id=character.id,
        revealed_at=revealed_at,
    ))

    # 5. Upsert inventory (single statement, no race condition)
    await db.execute(
        pg_insert(Inventory)
        .values(user_id=user.id, character_id=character.id, count=1)
        .on_conflict_do_update(
            constraint="uq_inventory_user_char",
            set_={"count": Inventory.count + 1},
        )
    )

    # 5. Credit coins to user
    user.coins += value

    # 6. Update stats — total_rolls, total_value, rarest_owned
    stats_result = await db.execute(
        select(Stats).where(Stats.user_id == user.id)
    )
    stats = stats_result.scalar_one()
    stats.total_rolls += 1
    stats.total_value += value
    stats.rarity_score += RARITY_SCORES.get(rarity, 0)

    if stats.rarest_owned is None:
        stats.rarest_owned = character.id
    else:
        current_result = await db.execute(
            select(Character.weight).where(Character.id == stats.rarest_owned)
        )
        current_weight = current_result.scalar_one_or_none()
        if current_weight is None or character.weight < current_weight:
            stats.rarest_owned = character.id

    await db.commit()

    return RollOut(
        character_name=char_name,
        rarity=rarity,
        description=description,
        value_earned=value,
        coins_total=user.coins,
        is_rare=is_rare,
    )
