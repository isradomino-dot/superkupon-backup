from datetime import datetime
from typing import Iterable, Tuple
from sqlalchemy.orm import Session
from rapidfuzz import fuzz

from app.models import Coupon, Merchant, Category
from app.schemas import CouponRaw
from app.pipelines.normalizer import compute_content_hash
from app.pipelines.quality_scorer import score_coupon


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


def upsert_coupons(db: Session, items: Iterable[CouponRaw]) -> Tuple[int, int]:
    """Insert atau update kupon. Return (new_count, updated_count)."""
    new_count = 0
    updated_count = 0

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
            existing.expires_at = raw.expires_at or existing.expires_at
            existing.status = "active"
            existing.quality_score = max(existing.quality_score, q_score)
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
        new_count += 1

    db.commit()
    return new_count, updated_count
