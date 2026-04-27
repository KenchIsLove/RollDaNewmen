# Roll Da Newman — Multiplayer Backend

Production-ready FastAPI backend for a gacha-style RNG game.

## Stack

| Layer | Library |
|---|---|
| Framework | FastAPI (async) |
| ORM | SQLAlchemy 2 async + asyncpg |
| Database | PostgreSQL 15+ |
| Auth | JWT via python-jose, bcrypt via passlib |
| Rate limiting | slowapi |
| Cache | In-memory TTL dict (swap `cache.py` for Redis) |

## Project layout

```
server/
├── main.py               # App entry point, lifespan, middleware
├── config.py             # Env-based settings (pydantic-settings)
├── database.py           # Engine, session factory, table creation, character seed
├── models.py             # SQLAlchemy ORM models (7 tables)
├── schemas.py            # Pydantic request/response models
├── auth.py               # bcrypt + JWT helpers
├── game_data.py          # Server-side RNG, rarity tables, character list
├── dependencies.py       # get_current_user FastAPI dependency
├── cache.py              # TTL cache for leaderboard responses
├── limiter.py            # Shared slowapi Limiter instance
├── routers/
│   ├── auth.py           # POST /auth/register  POST /auth/login
│   ├── roll.py           # POST /roll
│   ├── inventory.py      # GET  /inventory  GET /inventory/{username}
│   ├── shop.py           # POST /shop/buy
│   ├── leaderboard.py    # GET  /leaderboard/{board}
│   ├── players.py        # GET  /players/me  GET /players/{username}
│   └── trades.py         # CRUD /trades
├── services/
│   ├── roll_service.py   # perform_roll() — all roll logic lives here
│   └── trade_service.py  # accept_trade() with row-level locking
├── schema.sql            # Reference SQL (auto-created by SQLAlchemy)
├── .env.example          # Environment variable template
└── requirements.txt
```

## Quick start

### 1. Create the database

```bash
psql -U postgres -c "CREATE DATABASE rollgame;"
```

### 2. Set up Python environment

```bash
cd server
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env — set DATABASE_URL and generate a real SECRET_KEY:
python -c "import secrets; print(secrets.token_hex(32))"
```

### 4. Run

```bash
uvicorn main:app --reload --port 8000
```

Tables are created and characters seeded automatically on first startup.
Interactive docs at **http://localhost:8000/docs**

---

## API Reference

All endpoints except `/auth/register`, `/auth/login`, and `/health` require:

```
Authorization: Bearer <token>
```

### Auth

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/auth/register` | `{username, password}` | `{access_token}` |
| POST | `/auth/login` | `{username, password}` | `{access_token}` |

Usernames: 3–32 chars, letters/digits/underscores. Passwords: 8–128 chars.

### Roll

| Method | Path | Notes |
|---|---|---|
| POST | `/roll` | Server-side RNG only. **Rate limited: 60/min per IP.** |

Returns `{character_name, rarity, description, value_earned, coins_total, is_rare}`.

### Inventory

| Method | Path | Notes |
|---|---|---|
| GET | `/inventory` | Your inventory |
| GET | `/inventory/{username}` | Any player's inventory (public) |

### Shop

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/shop/buy` | `{item: "luck" \| "speed"}` | Price doubles each level |

Luck reduces Common drop rate. Speed reduces animation time in the client.

### Leaderboard

| Method | Path | Query | Cache |
|---|---|---|---|
| GET | `/leaderboard/total_value` | `?limit=10` | 30 s |
| GET | `/leaderboard/total_rolls` | `?limit=10` | 30 s |
| GET | `/leaderboard/rarest_char` | `?limit=10` | 30 s |

### Players

| Method | Path | Auth | Returns |
|---|---|---|---|
| GET | `/players/me` | Required | Private profile: coins, stats, upgrades |
| GET | `/players/{username}` | Public | Public profile: stats only |

### Trades

| Method | Path | Notes |
|---|---|---|
| POST | `/trades` | Create trade offer |
| GET | `/trades` | List your pending trades |
| POST | `/trades/{id}/accept` | Receiver accepts — atomic ownership-checked swap |
| POST | `/trades/{id}/decline` | Receiver declines |
| POST | `/trades/{id}/cancel` | Sender cancels |

Trade body: `{receiver_username, offered: [{character_name, count}], requested: [...]}`

---

## Security design

| Concern | Approach |
|---|---|
| Passwords | bcrypt (work factor 12) via passlib |
| Tokens | HS256 JWT, 7-day expiry, signed with `SECRET_KEY` |
| Roll integrity | All RNG runs in `services/roll_service.py` — client sends no roll input |
| Coin integrity | Only `/roll` and `/shop/buy` modify coins; DB `CHECK (coins >= 0)` enforces floor |
| Trade races | `SELECT ... FOR UPDATE` on trade row + inventory rows before any transfer |
| Input validation | Pydantic schemas validate every request before it reaches a service or DB |
| Rate limiting | 60 rolls/minute per IP via slowapi |
| DB constraints | `CHECK`, `UNIQUE`, and FK constraints on all critical columns |

## Scaling notes

- **Multi-instance**: replace `cache.py` with aioredis — the interface is identical (`get/set/invalidate`)
- **Connection pool**: tune `pool_size` / `max_overflow` in `database.py` for your load
- **Leaderboard columns**: `stats.total_value` and `stats.rarest_owned` are denormalized — they update on every roll and trade, so leaderboard queries stay a single indexed scan with no aggregation
- **Alembic**: use `alembic init alembic` to set up migrations before deploying schema changes
