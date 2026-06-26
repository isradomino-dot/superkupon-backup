from datetime import datetime
from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List

from app.db import Base


class Merchant(Base):
    __tablename__ = "merchants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128))
    logo_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    coupons: Mapped[List["Coupon"]] = relationship(back_populates="merchant")


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128))
    icon: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    coupons: Mapped[List["Coupon"]] = relationship(back_populates="category")


class Coupon(Base):
    __tablename__ = "coupons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    title: Mapped[str] = mapped_column(String(256))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    discount_type: Mapped[str] = mapped_column(String(32))  # percent | fixed | cashback | bogo | free_shipping
    discount_value: Mapped[float] = mapped_column(Float, default=0)
    min_spend: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_discount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    merchant_id: Mapped[int] = mapped_column(ForeignKey("merchants.id"), index=True)
    category_id: Mapped[Optional[int]] = mapped_column(ForeignKey("categories.id"), index=True, nullable=True)
    merchant: Mapped["Merchant"] = relationship(back_populates="coupons")
    category: Mapped[Optional["Category"]] = relationship(back_populates="coupons")

    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    source_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    source_target: Mapped[str] = mapped_column(String(64), index=True)

    scraped_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active", index=True)

    quality_score: Mapped[int] = mapped_column(Integer, default=0, index=True)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    redeem_count: Mapped[int] = mapped_column(Integer, default=0)

    region: Mapped[str] = mapped_column(String(32), default="national", index=True)

    content_hash: Mapped[str] = mapped_column(String(64), index=True)

    __table_args__ = (
        Index("idx_merchant_status", "merchant_id", "status"),
        Index("idx_status_expires", "status", "expires_at"),
        Index("idx_region_status", "region", "status"),
    )


class ScrapeLog(Base):
    __tablename__ = "scrape_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    target_id: Mapped[str] = mapped_column(String(64), index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(32))  # success | partial | failed
    items_found: Mapped[int] = mapped_column(Integer, default=0)
    items_new: Mapped[int] = mapped_column(Integer, default=0)
    items_updated: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class CouponVote(Base):
    """User-submitted verification vote untuk kupon.

    Tujuan:
      - Trust signal ("X people verified this works")
      - Self-cleaning: kalau 3+ user lapor 'expired' dalam 24 jam dan gak ada
        'works' override, status kupon auto-archive.

    Dedup: hash IP + coupon_id — 1 IP cuma bisa vote 1x per kupon per 24 jam
    (kalau vote ulang dengan value beda, vote lama di-update bukan dobel).
    """

    __tablename__ = "coupon_votes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    coupon_id: Mapped[int] = mapped_column(ForeignKey("coupons.id"), index=True)
    value: Mapped[str] = mapped_column(String(16))  # "works" | "expired"
    reporter_ip_hash: Mapped[str] = mapped_column(String(64), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("idx_votes_coupon_value_time", "coupon_id", "value", "created_at"),
        Index("idx_votes_ip_coupon", "reporter_ip_hash", "coupon_id"),
    )


class PushSubscription(Base):
    """Web Push (VAPID) subscription dari browser PWA.

    Disimpan saat user opt-in notifikasi di frontend. Setiap subscription
    unik per endpoint URL yang di-issue browser push service (FCM/Mozilla).

    Lifecycle:
      - INSERT: saat user accept prompt di browser (POST /push/subscribe).
      - DELETE: saat user opt-out, atau saat send_push_to_all() dapat
        410 Gone dari push service (subscription expired/uninstalled).
    """

    __tablename__ = "push_subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    endpoint: Mapped[str] = mapped_column(String(500), unique=True, index=True)
    p256dh: Mapped[str] = mapped_column(String(200))
    auth: Mapped[str] = mapped_column(String(50))
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class User(Base):
    """Member user account (public site signup, beda dari ADMIN_USERS_JSON env-based admin auth).

    Status workflow:
    - "active": bisa langsung login (self-register member auto-active untuk MVP)
    - "pending": butuh admin approval (untuk staff invite flow Phase 2 nanti)
    - "banned": disabled, gak bisa login

    Role:
    - "member": default self-register, akses fitur favorit/wishlist/claim
    - "staff": dibuat admin via invite link (Phase 2)
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32), default="member")
    status: Mapped[str] = mapped_column(String(32), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class UserSession(Base):
    """Session token untuk member auth. Pakai opaque token (bukan JWT) — bisa
    di-revoke langsung dari DB tanpa nunggu token expiry.

    Token format: random 32-byte hex string (64 char).
    Stored di httpOnly cookie OR Authorization header (Bearer).
    """

    __tablename__ = "user_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
