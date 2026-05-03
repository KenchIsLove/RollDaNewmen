from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy import select, text
from config import settings

engine = create_async_engine(
    settings.database_url,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def init_db() -> None:
    """Create tables and seed static character data."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Idempotent column migrations for tables that already exist
        for sql in [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS bio VARCHAR(300)",
            "ALTER TABLE users ALTER COLUMN bio TYPE VARCHAR(2000)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_color VARCHAR(7) NOT NULL DEFAULT '#7c3aed'",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS display_title VARCHAR(60) NOT NULL DEFAULT ''",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_image_url TEXT",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_preset VARCHAR(20) NOT NULL DEFAULT 'midnight'",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS showcase_character_ids JSONB NOT NULL DEFAULT '[]'::jsonb",
            "ALTER TABLE stats ADD COLUMN IF NOT EXISTS rarity_score BIGINT NOT NULL DEFAULT 0",
            "ALTER TABLE roll_log ADD COLUMN IF NOT EXISTS revealed_at TIMESTAMPTZ",
        ]:
            await conn.execute(text(sql))

    await _seed_characters()


async def _seed_characters() -> None:
    from models import Character
    from game_data import CHARS, RARITIES

    rows = [
        {
            "name": name,
            "base_rarity": rarity,
            "weight": RARITIES[rarity]["weight"],
            "value": RARITIES[rarity]["coins"],
        }
        for name, rarity, _ in CHARS
    ]
    stmt = (
        pg_insert(Character)
        .values(rows)
        .on_conflict_do_nothing(index_elements=["name"])
    )
    async with AsyncSessionLocal() as db:
        await db.execute(stmt)
        await db.commit()
