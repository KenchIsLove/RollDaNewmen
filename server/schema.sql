-- Roll Da Newman — Reference Schema
-- SQLAlchemy creates this automatically via init_db().
-- Use this file as documentation or for manual inspection/migrations.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    username         VARCHAR(32) NOT NULL,
    hashed_password  VARCHAR(128) NOT NULL,
    coins            BIGINT      NOT NULL DEFAULT 0 CHECK (coins >= 0),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_users_username UNIQUE (username)
);
CREATE INDEX IF NOT EXISTS ix_users_username ON users (username);

-- ── Characters (static game data, seeded at startup) ──────────────────────────
CREATE TABLE IF NOT EXISTS characters (
    id          SERIAL      PRIMARY KEY,
    name        VARCHAR(64) NOT NULL,
    base_rarity VARCHAR(32) NOT NULL,
    weight      INTEGER     NOT NULL,  -- roll weight; lower = rarer
    value       INTEGER     NOT NULL,  -- coins awarded on roll
    CONSTRAINT uq_characters_name UNIQUE (name)
);

-- ── Inventory ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory (
    id           SERIAL  PRIMARY KEY,
    user_id      UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    character_id INTEGER NOT NULL REFERENCES characters(id),
    count        INTEGER NOT NULL DEFAULT 1 CHECK (count >= 0),
    CONSTRAINT uq_inventory_user_char UNIQUE (user_id, character_id)
);
CREATE INDEX IF NOT EXISTS ix_inventory_user_id ON inventory (user_id);

-- ── Upgrades ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS upgrades (
    id          SERIAL  PRIMARY KEY,
    user_id     UUID    NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    luck_level  INTEGER NOT NULL DEFAULT 0 CHECK (luck_level  >= 0),
    speed_level INTEGER NOT NULL DEFAULT 0 CHECK (speed_level >= 0)
);

-- ── Stats (denormalized for fast leaderboard queries) ─────────────────────────
CREATE TABLE IF NOT EXISTS stats (
    id            SERIAL   PRIMARY KEY,
    user_id       UUID     NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    total_rolls   BIGINT   NOT NULL DEFAULT 0,
    rarest_owned  INTEGER  REFERENCES characters(id) ON DELETE SET NULL,
    total_value   BIGINT   NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_stats_total_rolls  ON stats (total_rolls  DESC);
CREATE INDEX IF NOT EXISTS ix_stats_total_value  ON stats (total_value  DESC);
CREATE INDEX IF NOT EXISTS ix_stats_rarest_owned ON stats (rarest_owned);

-- ── Trades ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trades (
    id          SERIAL      PRIMARY KEY,
    sender_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status      VARCHAR(16) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','accepted','declined','cancelled')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_trade_no_self CHECK (sender_id != receiver_id)
);
CREATE INDEX IF NOT EXISTS ix_trades_sender_id   ON trades (sender_id);
CREATE INDEX IF NOT EXISTS ix_trades_receiver_id ON trades (receiver_id);
CREATE INDEX IF NOT EXISTS ix_trades_status      ON trades (status);

-- ── Trade items ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trade_items (
    id           SERIAL      PRIMARY KEY,
    trade_id     INTEGER     NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    character_id INTEGER     NOT NULL REFERENCES characters(id),
    count        INTEGER     NOT NULL DEFAULT 1 CHECK (count >= 1),
    type         VARCHAR(16) NOT NULL CHECK (type IN ('offered','requested'))
);
CREATE INDEX IF NOT EXISTS ix_trade_items_trade_id ON trade_items (trade_id);
