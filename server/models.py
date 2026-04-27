import uuid
from datetime import datetime
from sqlalchemy import (
    String, Integer, BigInteger, ForeignKey, DateTime,
    UniqueConstraint, CheckConstraint, Index, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("coins >= 0", name="ck_users_coins_non_negative"),
        Index("ix_users_username", "username"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(128), nullable=False)
    coins: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    bio: Mapped[str | None] = mapped_column(String(300), nullable=True)
    banner_color: Mapped[str] = mapped_column(String(7), server_default='#7c3aed', nullable=False)

    upgrades: Mapped["Upgrades"] = relationship(
        "Upgrades", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    stats: Mapped["Stats"] = relationship(
        "Stats", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    inventory: Mapped[list["Inventory"]] = relationship(
        "Inventory", back_populates="user", cascade="all, delete-orphan"
    )
    sent_trades: Mapped[list["Trade"]] = relationship(
        "Trade", foreign_keys="Trade.sender_id", back_populates="sender"
    )
    received_trades: Mapped[list["Trade"]] = relationship(
        "Trade", foreign_keys="Trade.receiver_id", back_populates="receiver"
    )


class Character(Base):
    __tablename__ = "characters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    base_rarity: Mapped[str] = mapped_column(String(32), nullable=False)
    weight: Mapped[int] = mapped_column(Integer, nullable=False)  # lower = rarer
    value: Mapped[int] = mapped_column(Integer, nullable=False)   # coins awarded on roll


class Inventory(Base):
    __tablename__ = "inventory"
    __table_args__ = (
        UniqueConstraint("user_id", "character_id", name="uq_inventory_user_char"),
        CheckConstraint("count >= 0", name="ck_inventory_count_non_negative"),
        Index("ix_inventory_user_id", "user_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    character_id: Mapped[int] = mapped_column(
        ForeignKey("characters.id"), nullable=False
    )
    count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="inventory")
    character: Mapped["Character"] = relationship("Character")


class Upgrades(Base):
    __tablename__ = "upgrades"
    __table_args__ = (
        CheckConstraint("luck_level >= 0",  name="ck_upgrades_luck_non_negative"),
        CheckConstraint("speed_level >= 0", name="ck_upgrades_speed_non_negative"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    luck_level: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    speed_level: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="upgrades")


class Stats(Base):
    __tablename__ = "stats"
    __table_args__ = (
        Index("ix_stats_total_rolls",   "total_rolls"),
        Index("ix_stats_total_value",   "total_value"),
        Index("ix_stats_rarest_owned",  "rarest_owned"),
        Index("ix_stats_rarity_score",  "rarity_score"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    total_rolls: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    # FK to the rarest character they currently own — NULL until first roll
    rarest_owned: Mapped[int | None] = mapped_column(
        ForeignKey("characters.id", ondelete="SET NULL"), nullable=True
    )
    total_value: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    rarity_score: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="stats")
    rarest_character: Mapped["Character | None"] = relationship(
        "Character", foreign_keys=[rarest_owned]
    )


class RollLog(Base):
    __tablename__ = "roll_log"
    __table_args__ = (
        Index("ix_roll_log_user_id",   "user_id"),
        Index("ix_roll_log_rolled_at", "rolled_at"),
        Index("ix_roll_log_char_id",   "character_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    character_id: Mapped[int] = mapped_column(ForeignKey("characters.id"), nullable=False)
    rolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User")
    character: Mapped["Character"] = relationship("Character")


class Trade(Base):
    __tablename__ = "trades"
    __table_args__ = (
        CheckConstraint("sender_id != receiver_id", name="ck_trade_no_self_trade"),
        CheckConstraint(
            "status IN ('pending','accepted','declined','cancelled')",
            name="ck_trade_status",
        ),
        Index("ix_trades_sender_id",   "sender_id"),
        Index("ix_trades_receiver_id", "receiver_id"),
        Index("ix_trades_status",      "status"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sender_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    receiver_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(16), default="pending", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    sender: Mapped["User"] = relationship("User", foreign_keys=[sender_id])
    receiver: Mapped["User"] = relationship("User", foreign_keys=[receiver_id])
    items: Mapped[list["TradeItem"]] = relationship(
        "TradeItem", back_populates="trade", cascade="all, delete-orphan"
    )


class TradeItem(Base):
    __tablename__ = "trade_items"
    __table_args__ = (
        CheckConstraint("count >= 1", name="ck_trade_item_count_positive"),
        CheckConstraint(
            "type IN ('offered','requested')", name="ck_trade_item_type"
        ),
        Index("ix_trade_items_trade_id", "trade_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    trade_id: Mapped[int] = mapped_column(
        ForeignKey("trades.id", ondelete="CASCADE"), nullable=False
    )
    character_id: Mapped[int] = mapped_column(
        ForeignKey("characters.id"), nullable=False
    )
    count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    # "offered" = sender gives this  |  "requested" = receiver gives this
    type: Mapped[str] = mapped_column(String(16), nullable=False)

    trade: Mapped["Trade"] = relationship("Trade", back_populates="items")
    character: Mapped["Character"] = relationship("Character")
