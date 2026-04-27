import re
from datetime import datetime
from typing import Annotated, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

# ── Reusable patterns and helpers ─────────────────────────────────────────────

_USERNAME_RE  = r"^[a-zA-Z0-9_]{3,32}$"
_HEX_COLOR_RE = r"^#[0-9a-fA-F]{6}$"

# Strip C0 controls except \t \n \r, plus DEL.
_CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def _clean_text(v: str) -> str:
    return _CONTROL_CHARS_RE.sub("", v).strip()


# ── Reusable annotated types ──────────────────────────────────────────────────

Username  = Annotated[str, StringConstraints(min_length=3, max_length=32, pattern=_USERNAME_RE)]
Password  = Annotated[str, StringConstraints(min_length=8, max_length=128)]
CharName  = Annotated[str, StringConstraints(min_length=1, max_length=64, strip_whitespace=True)]
Bio       = Annotated[str, StringConstraints(max_length=300)]
HexColor  = Annotated[str, StringConstraints(pattern=_HEX_COLOR_RE)]
AvatarUrl = Annotated[str, StringConstraints(min_length=1, max_length=512)]


class _StrictBase(BaseModel):
    """Base for every request schema: forbid unknown fields."""
    model_config = ConfigDict(extra="forbid")


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterRequest(_StrictBase):
    username: Username
    password: Password


class LoginRequest(_StrictBase):
    # Bound length but skip the regex — failing accounts shouldn't reveal
    # whether the username was even well-formed; still cap to prevent DoS.
    username: Annotated[str, StringConstraints(min_length=1, max_length=32)]
    password: Annotated[str, StringConstraints(min_length=1, max_length=128)]


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Roll ──────────────────────────────────────────────────────────────────────

class RollOut(BaseModel):
    character_name: str
    rarity: str
    description: str
    value_earned: int
    coins_total: int
    is_rare: bool


# ── Inventory ─────────────────────────────────────────────────────────────────

class InventoryItemOut(BaseModel):
    character_name: str
    rarity: str
    count: int


class InventoryOut(BaseModel):
    items: list[InventoryItemOut]
    total_value: int


# ── Shop ──────────────────────────────────────────────────────────────────────

class ShopBuyRequest(_StrictBase):
    item: Literal["luck", "speed"]


class ShopBuyResult(BaseModel):
    item: str
    new_level: int
    coins_spent: int
    coins_remaining: int


# ── Stats & profile ───────────────────────────────────────────────────────────

class UpgradesOut(BaseModel):
    luck_level: int
    speed_level: int


class StatsOut(BaseModel):
    total_rolls: int
    total_value: int
    rarity_score: int = 0
    rarest_character: str | None
    rarest_rarity: str | None


class PublicProfileOut(BaseModel):
    username: str
    created_at: datetime
    stats: StatsOut
    avatar_url: str | None = None
    bio: str | None = None
    banner_color: str = '#7c3aed'


class PrivateProfileOut(BaseModel):
    username: str
    coins: int
    created_at: datetime
    stats: StatsOut
    upgrades: UpgradesOut
    avatar_url: str | None = None
    bio: str | None = None
    banner_color: str = '#7c3aed'


class ProfileUpdateRequest(_StrictBase):
    avatar_url:   AvatarUrl | None = None
    bio:          Bio       | None = None
    banner_color: HexColor  | None = None

    @field_validator("avatar_url")
    @classmethod
    def validate_avatar_scheme(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            raise ValueError("Avatar URL must use http or https")
        return v

    @field_validator("bio")
    @classmethod
    def clean_bio(cls, v: str | None) -> str | None:
        if v is None:
            return v
        cleaned = _clean_text(v)
        return cleaned or None


# ── Leaderboard ───────────────────────────────────────────────────────────────

class LeaderboardEntry(BaseModel):
    rank: int
    username: str
    value: int | str


class LeaderboardOut(BaseModel):
    board: str
    entries: list[LeaderboardEntry]
    cached_at: datetime


# ── Recent drops / roll history ───────────────────────────────────────────────

class RecentDropOut(BaseModel):
    username: str
    character: str
    rarity: str


class RollHistoryEntry(BaseModel):
    character: str
    rarity: str


# ── Trades ────────────────────────────────────────────────────────────────────

class TradeItemSpec(_StrictBase):
    character_name: CharName
    count: Annotated[int, Field(ge=1, le=999)]


class TradeCreateRequest(_StrictBase):
    receiver_username: Username
    offered:   Annotated[list[TradeItemSpec], Field(max_length=10)]
    requested: Annotated[list[TradeItemSpec], Field(max_length=10)]

    @model_validator(mode="after")
    def validate_items(self) -> "TradeCreateRequest":
        if not self.offered and not self.requested:
            raise ValueError("Trade must include at least one item on either side")
        return self


class TradeItemOut(BaseModel):
    character_name: str
    rarity: str
    count: int
    type: str   # "offered" | "requested"


class TradeOut(BaseModel):
    id: int
    sender_username: str
    receiver_username: str
    status: str
    items: list[TradeItemOut]
    created_at: datetime
