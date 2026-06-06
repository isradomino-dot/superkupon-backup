from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_

from app.db import get_db
from app.models import Merchant, Category, Coupon
from app.schemas import MerchantOut, CategoryOut, CouponOut

router = APIRouter(tags=["taxonomy"])


@router.get("/merchants", response_model=List[MerchantOut])
def list_merchants(db: Session = Depends(get_db)):
    return db.query(Merchant).order_by(Merchant.name).all()


@router.get("/merchants/{slug}", response_model=MerchantOut)
def get_merchant(slug: str, db: Session = Depends(get_db)):
    m = db.query(Merchant).filter_by(slug=slug).first()
    if not m:
        raise HTTPException(404, "Merchant not found")
    return m


@router.get("/merchants/{slug}/stats")
def merchant_stats(slug: str, db: Session = Depends(get_db)):
    """Comprehensive per-merchant statistics."""
    m = db.query(Merchant).filter_by(slug=slug).first()
    if not m:
        raise HTTPException(404, "Merchant not found")

    now = datetime.utcnow()
    expiring_threshold = now + timedelta(days=7)

    base = db.query(Coupon).filter(
        Coupon.merchant_id == m.id,
        Coupon.status.in_(["active", "expiring_soon"]),
        or_(Coupon.expires_at.is_(None), Coupon.expires_at >= now),
    )

    total = base.count()
    avg_quality = db.query(func.avg(Coupon.quality_score)).filter(
        Coupon.merchant_id == m.id,
        Coupon.status.in_(["active", "expiring_soon"]),
    ).scalar() or 0

    max_discount = db.query(func.max(Coupon.discount_value)).filter(
        Coupon.merchant_id == m.id,
        Coupon.status.in_(["active", "expiring_soon"]),
    ).scalar() or 0

    expiring_count = db.query(Coupon).filter(
        Coupon.merchant_id == m.id,
        Coupon.status.in_(["active", "expiring_soon"]),
        Coupon.expires_at.isnot(None),
        Coupon.expires_at >= now,
        Coupon.expires_at <= expiring_threshold,
    ).count()

    total_views = db.query(func.sum(Coupon.view_count)).filter(
        Coupon.merchant_id == m.id,
    ).scalar() or 0
    total_redeems = db.query(func.sum(Coupon.redeem_count)).filter(
        Coupon.merchant_id == m.id,
    ).scalar() or 0

    by_type_rows = (
        db.query(Coupon.discount_type, func.count(Coupon.id))
        .filter(
            Coupon.merchant_id == m.id,
            Coupon.status.in_(["active", "expiring_soon"]),
        )
        .group_by(Coupon.discount_type)
        .all()
    )

    by_category_rows = (
        db.query(Category.slug, Category.name, func.count(Coupon.id))
        .join(Coupon, Coupon.category_id == Category.id)
        .filter(
            Coupon.merchant_id == m.id,
            Coupon.status.in_(["active", "expiring_soon"]),
        )
        .group_by(Category.id, Category.slug, Category.name)
        .order_by(func.count(Coupon.id).desc())
        .all()
    )

    top_by_discount = (
        base.options(joinedload(Coupon.merchant), joinedload(Coupon.category))
        .order_by(Coupon.discount_value.desc(), Coupon.quality_score.desc())
        .limit(3)
        .all()
    )

    excellent_count = base.filter(Coupon.quality_score >= 80).count()

    return {
        "merchant": MerchantOut.model_validate(m).model_dump(),
        "summary": {
            "total_active": total,
            "expiring_soon_7d": expiring_count,
            "excellent_quality": excellent_count,
            "avg_quality_score": round(float(avg_quality), 1),
            "max_discount_value": float(max_discount),
            "total_views": int(total_views),
            "total_redeems": int(total_redeems),
        },
        "by_discount_type": [
            {"type": t or "unknown", "count": int(c)} for t, c in by_type_rows
        ],
        "by_category": [
            {"slug": s, "name": n, "count": int(c)} for s, n, c in by_category_rows
        ],
        "top_by_discount": [
            CouponOut.model_validate(c).model_dump(mode="json") for c in top_by_discount
        ],
    }


@router.get("/categories", response_model=List[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(Category).order_by(Category.name).all()


@router.get("/merchants-with-counts")
def merchants_with_counts(db: Session = Depends(get_db)):
    rows = (
        db.query(
            Merchant.id,
            Merchant.slug,
            Merchant.name,
            Merchant.logo_url,
            func.count(Coupon.id).label("coupon_count"),
        )
        .outerjoin(Coupon, (Coupon.merchant_id == Merchant.id) & (Coupon.status == "active"))
        .group_by(Merchant.id)
        .order_by(func.count(Coupon.id).desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "slug": r.slug,
            "name": r.name,
            "logo_url": r.logo_url,
            "coupon_count": r.coupon_count,
        }
        for r in rows
    ]
