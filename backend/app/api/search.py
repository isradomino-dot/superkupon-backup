"""Search autocomplete + recommendations endpoints."""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.db import get_db, is_postgres
from app.models import Coupon, Merchant, Category
from app.schemas import CouponOut

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/autocomplete")
def autocomplete(
    q: str = Query("", min_length=0, max_length=64),
    limit_per_type: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
):
    """Return suggestion dropdown items: merchants, categories, code matches.

    Usage: `GET /search/autocomplete?q=tok` → suggests Tokopedia + related codes.
    """
    query = q.strip()
    if not query:
        return {"merchants": [], "categories": [], "codes": [], "query": ""}

    pattern = f"%{query.lower()}%"
    prefix = f"{query.lower()}%"

    merchants = (
        db.query(Merchant.slug, Merchant.name, func.count(Coupon.id).label("count"))
        .outerjoin(Coupon, (Coupon.merchant_id == Merchant.id) & (Coupon.status == "active"))
        .filter(
            or_(
                func.lower(Merchant.slug).like(prefix),
                func.lower(Merchant.name).like(pattern),
            )
        )
        .group_by(Merchant.id, Merchant.slug, Merchant.name)
        .order_by(func.count(Coupon.id).desc(), Merchant.name)
        .limit(limit_per_type)
        .all()
    )

    # Fuzzy fallback (pg_trgm) kalau substring ga nemu apa-apa — handle typo spt "shoope".
    # Threshold 0.5 + length check supaya "shopeeovo" gak salah cocokin Shopee.
    if not merchants and is_postgres() and len(query) >= 4:
        sim = func.similarity(func.lower(Merchant.name), query.lower())
        candidates = (
            db.query(Merchant.slug, Merchant.name, func.count(Coupon.id).label("count"), sim.label("score"))
            .outerjoin(Coupon, (Coupon.merchant_id == Merchant.id) & (Coupon.status == "active"))
            .filter(sim >= 0.5)
            .group_by(Merchant.id, Merchant.slug, Merchant.name)
            .order_by(sim.desc())
            .limit(limit_per_type * 2)
            .all()
        )
        # Reject panjang yg terlalu beda — anti-overreach (mis. "shopeeovo" jangan match Shopee)
        merchants = [c for c in candidates if abs(len(c[1]) - len(query)) <= 2][:limit_per_type]

    categories = (
        db.query(Category.slug, Category.name, func.count(Coupon.id).label("count"))
        .outerjoin(Coupon, (Coupon.category_id == Category.id) & (Coupon.status == "active"))
        .filter(or_(func.lower(Category.slug).like(prefix), func.lower(Category.name).like(pattern)))
        .group_by(Category.id, Category.slug, Category.name)
        .order_by(func.count(Coupon.id).desc(), Category.name)
        .limit(limit_per_type)
        .all()
    )

    codes = (
        db.query(Coupon)
        .options(joinedload(Coupon.merchant))
        .filter(Coupon.status.in_(["active", "expiring_soon"]))
        .filter(Coupon.code.isnot(None))
        .filter(func.lower(Coupon.code).like(pattern))
        .order_by(Coupon.quality_score.desc())
        .limit(limit_per_type)
        .all()
    )

    return {
        "query": query,
        "merchants": [
            {"slug": s, "name": n, "count": int(c)} for s, n, c in merchants if c > 0
        ],
        "categories": [
            {"slug": s, "name": n, "count": int(c)} for s, n, c in categories if c > 0
        ],
        "codes": [
            {
                "id": c.id,
                "code": c.code,
                "title": c.title,
                "merchant_slug": c.merchant.slug if c.merchant else None,
                "merchant_name": c.merchant.name if c.merchant else None,
            }
            for c in codes
        ],
    }


@router.get("/recommendations", response_model=list[CouponOut])
def recommendations(
    category: Optional[str] = Query(None, description="Filter by category slug (e.g., 'food')"),
    merchant: Optional[str] = Query(None),
    limit: int = Query(8, ge=1, le=30),
    db: Session = Depends(get_db),
):
    """Top coupons by ranking: quality_score * 0.7 + log(view_count + 1) * 10 * 0.3.

    Default: top across all. Pass `category=food` for food recommendations.
    """
    from datetime import datetime
    now = datetime.utcnow()

    query = (
        db.query(Coupon)
        .options(joinedload(Coupon.merchant), joinedload(Coupon.category))
        .filter(Coupon.status.in_(["active", "expiring_soon"]))
        .filter(or_(Coupon.expires_at.is_(None), Coupon.expires_at >= now))
    )

    if category:
        query = query.join(Category).filter(Category.slug == category)
    if merchant:
        query = query.join(Merchant).filter(Merchant.slug == merchant)

    score = (Coupon.quality_score * 0.7) + (func.coalesce(Coupon.view_count, 0) * 0.05) + (Coupon.discount_value * 0.001)
    return (
        query.order_by(score.desc(), Coupon.scraped_at.desc())
        .limit(limit)
        .all()
    )
