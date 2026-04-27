from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from config import settings
from database import init_db
from limiter import limiter
from routers import auth, roll, inventory, shop, leaderboard, players, trades, drops, rolls, chat

MAX_BODY_BYTES = 32 * 1024  # 32 KB cap on any request body


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Roll Da Newman — Multiplayer API",
    description="Gacha RNG game backend with leaderboards and trading.",
    version="2.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def limit_body_size(request: Request, call_next):
    cl = request.headers.get("content-length")
    if cl and cl.isdigit() and int(cl) > MAX_BODY_BYTES:
        return JSONResponse(
            {"detail": "Request body too large"},
            status_code=413,
        )
    return await call_next(request)

app.include_router(auth.router)
app.include_router(roll.router)
app.include_router(inventory.router)
app.include_router(shop.router)
app.include_router(leaderboard.router)
app.include_router(players.router)
app.include_router(trades.router)
app.include_router(drops.router)
app.include_router(rolls.router)
app.include_router(chat.router)


@app.get("/health", tags=["meta"])
async def health():
    return {"status": "ok"}
