import logging
import re
import threading
from datetime import datetime
from typing import Iterable, List, Tuple
from sqlalchemy.orm import Session
from rapidfuzz import fuzz

from app.config import settings
from app.models import Coupon, Merchant, Category
from app.schemas import CouponRaw
from app.pipelines.normalizer import compute_content_hash
from app.pipelines.quality_scorer import score_coupon

logger = logging.getLogger(__name__)


def _get_or_create_merchant(db: Session, slug: str) -> Merchant:
    m = db.query(Merchant).filter_by(slug=slug).first()
    if m:
        return m
    m = Merchant(slug=slug, name=slug.replace("-", " ").title())
    db.add(m)
    db.flush()
    return m


def _get_or_create_category(db: Session, slug: str | None) -> Category | None:
    if not slug:
        return None
    c = db.query(Category).filter_by(slug=slug).first()
    if c:
        return c
    c = Category(slug=slug, name=slug.replace("-", " ").title())
    db.add(c)
    db.flush()
    return c


def _is_fuzzy_duplicate(raw: CouponRaw, existing: Coupon) -> bool:
    """Threshold fuzzy match — title sangat mirip = duplikat."""
    score = fuzz.token_set_ratio(raw.title.lower(), existing.title.lower())
    same_code = (raw.code or "") == (existing.code or "")
    return same_code and score >= 85


def _format_discount(raw: CouponRaw) -> str:
    """Human-readable discount string buat push notif title."""
    if raw.discount_type == "percent" and raw.discount_value:
        return f"Diskon {int(raw.discount_value)}%"
    if raw.discount_type == "fixed" and raw.discount_value:
        return f"Diskon Rp{int(raw.discount_value):,}".replace(",", ".")
    if raw.discount_type == "cashback" and raw.discount_value:
        return f"Cashback Rp{int(raw.discount_value):,}".replace(",", ".")
    if raw.discount_type == "free_shipping":
        return "Gratis Ongkir"
    if raw.discount_type == "bogo":
        return "Beli 1 Gratis 1"
    return "Promo Baru"


_SLUG_RE = re.compile(r"[^a-z0-9]+")


def _coupon_slug(coupon: Coupon) -> str:
    """Generate /coupon/{slug} URL fragment — match frontend slug shape."""
    base = coupon.code or coupon.title or "coupon"
    slug = _SLUG_RE.sub("-", base.lower()).strip("-")
    return f"{slug}-{coupon.id}" if slug else str(coupon.id)


def _fire_push_for_new(new_coupons: List[Tuple[str, str, str]]) -> None:
    """Background thread — kirim push notif ke semua subscriber.

    Fire-and-forget: scraper jangan ke-block sama latency push service.
    Threading dipake (bukan asyncio task) karena upsert_coupons sync function
    yang di-call dari sync scheduler context.
    """
    def _runner():
        try:
            from app.services.push_notification import send_push_to_all
            for title, body, url in new_coupons:
                send_push_to_all(title=title, body=body, url=url)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Background push notif failed: %s", exc)

    t = threading.Thread(target=_runner, daemon=True, name="push-notif")
    t.start()


def upsert_coupons(db: Session, items: Iterable[CouponRaw]) -> Tuple[int, int]:
    """Insert atau update kupon. Return (new_count, updated_count).

    Side effect: kalo settings.PUSH_ENABLED + ada new kupon, fire push notif
    ke semua subscriber (background thread, non-blocking).
    """
    new_count = 0
    updated_count = 0
    new_push_payloads: List[Tuple[str, str, str]] = []

    from app.scrapers.registry import REGISTRY

    for raw in items:
        chash = compute_content_hash(raw)
        merchant = _get_or_create_merchant(db, raw.merchant_slug)
        category = _get_or_create_category(db, raw.category_slug)

        scraper_cls = REGISTRY.get(raw.source_target)
        source_tier = getattr(scraper_cls, "tier", "public") if scraper_cls else "public"
        q_score = score_coupon(raw, source_tier=source_tier)

        existing = (
            db.query(Coupon)
            .filter_by(content_hash=chash, merchant_id=merchant.id)
            .first()
        )

        if existing:
            existing.verified_at = datetime.utcnow()
            # Don't override existing expires_at — set ONLY kalau belum ada.
            # Sebelumnya: raw.expires_at sering = "now + 3 days" dummy,
            # jadi setiap scrape ulang stuck di "3 hari lagi" forever.
            if not existing.expires_at and raw.expires_at:
                existing.expires_at = raw.expires_at
            existing.status = "active"
            existing.quality_score = max(existing.quality_score, q_score)
            # Refresh source_url + source_target di tiap upsert biar mock data updates
            # ke-pickup (e.g. ganti placeholder example.com → real source URL).
            existing.source_url = raw.source_url
            existing.source_target = raw.source_target
            updated_count += 1
            continue

        candidates = (
            db.query(Coupon)
            .filter_by(merchant_id=merchant.id, status="active")
            .filter(Coupon.code == (raw.code or None))
            .all()
            if raw.code
            else []
        )
        if any(_is_fuzzy_duplicate(raw, c) for c in candidates):
            updated_count += 1
            continue

        coupon = Coupon(
            code=raw.code,
            title=raw.title,
            description=raw.description,
            discount_type=raw.discount_type,
            discount_value=raw.discount_value,
            min_spend=raw.min_spend,
            max_discount=raw.max_discount,
            merchant_id=merchant.id,
            category_id=category.id if category else None,
            expires_at=raw.expires_at,
            source_url=raw.source_url,
            source_target=raw.source_target,
            region=raw.region,
            content_hash=chash,
            verified_at=datetime.utcnow(),
            status="active",
            quality_score=q_score,
        )
        db.add(coupon)
        db.flush()  # populate coupon.id buat slug URL
        new_count += 1

        # Build push notif payload — kirim setelah commit sukses.
        # Quality filter: hanya kupon dengan quality_score >= threshold yang
        # trigger push, biar user gak spam (27 new/hari → ~6 setelah filter).
        if q_score < settings.PUSH_MIN_QUALITY_SCORE:
            logger.debug(
                "Skip push for coupon id=%s (quality=%d < threshold=%d)",
                coupon.id, q_score, settings.PUSH_MIN_QUALITY_SCORE,
            )
        else:
            try:
                discount_str = _format_discount(raw)
                push_title = f"\U0001F39F️ {merchant.name}: {discount_str}"
                push_body = (raw.title or "")[:140]
                push_url = f"/coupon/{_coupon_slug(coupon)}"
                new_push_payloads.append((push_title, push_body, push_url))
            except Exception as exc:  # noqa: BLE001 — push payload prep harus gak ganggu upsert
                logger.warning("Skip push payload build for coupon id=%s: %s", coupon.id, exc)

    db.commit()

    # Fire push notif setelah commit sukses + ada new kupon + feature enabled
    if new_count > 0 and new_push_payloads and settings.PUSH_ENABLED:
        _fire_push_for_new(new_push_payloads)

    return new_count, updated_count
