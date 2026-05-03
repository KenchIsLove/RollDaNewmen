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

Username        = Annotated[str, StringConstraints(min_length=3, max_length=32, pattern=_USERNAME_RE)]
Password        = Annotated[str, StringConstraints(min_length=8, max_length=128)]
CharName        = Annotated[str, StringConstraints(min_length=1, max_length=64, strip_whitespace=True)]
Bio             = Annotated[str, StringConstraints(max_length=2000)]
HexColor        = Annotated[str, StringConstraints(pattern=_HEX_COLOR_RE)]
AvatarUrl       = Annotated[str, StringConstraints(min_length=1, max_length=512)]
DisplayTitle    = Annotated[str, StringConstraints(max_length=60)]
BannerImageUrl  = Annotated[str, StringConstraints(min_length=1, max_length=1024)]
ThemePreset     = Literal["midnight", "sunset", "forest", "cherry", "ocean", "gold"]


class _StrictBase(BaseModel):
    """Base for every request schema: forbid unknown fields."""
    model_config = ConfigDict(extra="forbid")


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterRequest(_StrictBase):
    username: Username
    password: Password

    @field_validator("username")
    @classmethod
    def lowercase_username(cls, v: str) -> str:
        return v.lower()

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password is too long (maximum 72 bytes)")
        has_letter = any(c.isalpha() for c in v)
        has_digit  = any(c.isdigit() for c in v)
        if not (has_letter and has_digit):
            raise ValueError("Password must contain at least one letter and at least one number")
        return v


class LoginRequest(_StrictBase):
    # Bound length but skip the regex — failing accounts shouldn't reveal
    # whether the username was even well-formed; still cap to prevent DoS.
    username: Annotated[str, StringConstraints(min_length=1, max_length=32)]
    password: Annotated[str, StringConstraints(min_length=1, max_length=128)]

    @field_validator("username")
    @classmethod
    def lowercase_username(cls, v: str) -> str:
        return v.lower()


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
    character_id: int | None = None
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


class ShowcaseCharacterOut(BaseModel):
    id: int
    name: str
    base_rarity: str


class PublicProfileOut(BaseModel):
    username: str
    created_at: datetime
    stats: StatsOut
    avatar_url: str | None = None
    bio: str | None = None
    banner_color: str = '#7c3aed'
    top_inventory: list[InventoryItemOut] = []
    display_title: str = ''
    banner_image_url: str | None = None
    theme_preset: str = 'midnight'
    showcase: list[ShowcaseCharacterOut] = []


class PrivateProfileOut(BaseModel):
    username: str
    coins: int
    created_at: datetime
    stats: StatsOut
    upgrades: UpgradesOut
    avatar_url: str | None = None
    bio: str | None = None
    banner_color: str = '#7c3aed'
    top_inventory: list[InventoryItemOut] = []
    display_title: str = ''
    banner_image_url: str | None = None
    theme_preset: str = 'midnight'
    showcase: list[ShowcaseCharacterOut] = []


class PlayerSearchResult(BaseModel):
    username: str
    avatar_url: str | None = None
    rarity_score: int = 0


class ProfileUpdateRequest(_StrictBase):
    avatar_url:        AvatarUrl       | None = None
    bio:               Bio             | None = None
    banner_color:      HexColor        | None = None
    display_title:     DisplayTitle    | None = None
    banner_image_url:  BannerImageUrl  | None = None
    theme_preset:      ThemePreset     | None = None
    showcase_character_ids: list[int]  | None = None

    @field_validator("avatar_url")
    @classmethod
    def validate_avatar_scheme(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            raise ValueError("Avatar URL must use http or https")
        return v

    @field_validator("banner_image_url")
    @classmethod
    def validate_banner_scheme(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            raise ValueError("Banner image URL must use http or https")
        return v

    @field_validator("bio")
    @classmethod
    def clean_bio(cls, v: str | None) -> str | None:
        if v is None:
            return v
        cleaned = _clean_text(v)
        return cleaned or None

    @field_validator("display_title")
    @classmethod
    def clean_display_title(cls, v: str | None) -> str | None:
        if v is None:
            return v
        return _clean_text(v)

    @field_validator("showcase_character_ids")
    @classmethod
    def validate_showcase(cls, v: list[int] | None) -> list[int] | None:
        if v is None:
            return v
        if len(v) > 3:
            raise ValueError("Showcase can have at most 3 characters")
        if len(v) != len(set(v)):
            raise ValueError("Showcase cannot contain duplicate characters")
        if any(i <= 0 for i in v):
            raise ValueError("Character IDs must be positive integers")
        return v


# ── Leaderboard ───────────────────────────────────────────────────────────────

class LeaderboardEntry(BaseModel):
    rank: int
    username: str
    value: int | str
    rarest_character_name:   str | None = None
    rarest_character_rarity: str | None = None


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


# Detail variant returned by GET /trades/{id} — same shape but with a
# best-effort image path so the detail page can render character art
# without needing a separate frontend lookup. The frontend may still
# fall back to its own CHAR_MAP for placeholders / null images.
class TradeDetailItemOut(BaseModel):
    character_name: str
    rarity: str
    count: int
    type: str
    image: str  # e.g. "/images/grumpy_cat.png"


class TradeDetailOut(BaseModel):
    id: int
    sender_username: str
    receiver_username: str
    status: str
    items: list[TradeDetailItemOut]
    created_at: datetime
