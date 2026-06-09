"""Enhanced stats endpoints — premium dashboard data."""
from __future__ import annotations

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Coupon, Merchant, Category, ScrapeLog
from app.pipelines.source_health import compute_source_health

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/overview")
def overview(db: Session = Depends(get_db)):
    total = db.query(Coupon).count()
    active = db.query(Coupon).filter(Coupon.status == "active").count()
    expiring_soon = db.query(Coupon).filter(Coupon.status == "expiring_soon").count()
    expired = db.query(Coupon).filter(Coupon.status == "expired").count()

    excellent = db.query(Coupon).filter(Coupon.quality_score >= 80).count()
    good = db.query(Coupon).filter(Coupon.quality_score >= 60, Coupon.quality_score < 80).count()
    fair = db.query(Coupon).filter(Coupon.quality_score >= 40, Coupon.quality_score < 60).count()
    poor = db.query(Coupon).filter(Coupon.quality_score < 40).count()

    return {
        "total": total,
        "by_status": {
            "active": active,
            "expiring_soon": expiring_soon,
            "expired": expired,
        },
        "by_quality": {
            "excellent": excellent,
            "good": good,
            "fair": fair,
            "poor": poor,
        },
        "merchant_count": db.query(Merchant).count(),
        "category_count": db.query(Category).count(),
    }


@router.get("/by-merchant")
def by_merchant(db: Session = Depends(get_db)):
    rows = (
        db.query(
            Merchant.slug,
            Merchant.name,
            func.count(Coupon.id).label("total"),
            func.avg(Coupon.quality_score).label("avg_quality"),
            func.max(Coupon.scraped_at).label("last_scraped"),
        )
        .outerjoin(Coupon, (Coupon.merchant_id == Merchant.id) & (Coupon.status == "active"))
        .group_by(Merchant.id)
        .order_by(func.count(Coupon.id).desc())
        .all()
    )
    return [
        {
            "slug": r.slug,
            "name": r.name,
            "active_coupons": r.total,
            "avg_quality": round(float(r.avg_quality or 0), 1),
            "last_scraped": r.last_scraped.isoformat() if r.last_scraped else None,
        }
        for r in rows
    ]


@router.get("/by-category")
def by_category(db: Session = Depends(get_db)):
    rows = (
        db.query(
            Category.slug,
            Category.name,
            func.count(Coupon.id).label("total"),
        )
        .outerjoin(Coupon, (Coupon.category_id == Category.id) & (Coupon.status == "active"))
        .group_by(Category.id)
        .order_by(func.count(Coupon.id).desc())
        .all()
    )
    return [
        {"slug": r.slug, "name": r.name, "active_coupons": r.total}
        for r in rows
    ]


@router.get("/source-health")
def source_health(db: Session = Depends(get_db)):
    return compute_source_health(db, days=7)


@router.get("/public")
def public_stats(db: Session = Depends(get_db)):
    """Aggregated public stats — buat halaman /stats credibility page.

    Combine: counts, total potential savings, growth, top merchants.
    """
    now = datetime.utcnow()
    yesterday = now - timedelta(hours=24)
    week_ago = now - timedelta(days=7)

    total_active = db.query(Coupon).filter(Coupon.status.in_(["active", "expiring_soon"])).count()
    new_24h = (
        db.query(Coupon)
        .filter(Coupon.scraped_at >= yesterday)
        .filter(Coupon.status.in_(["active", "expiring_soon"]))
        .count()
    )
    new_7d = (
        db.query(Coupon)
        .filter(Coupon.scraped_at >= week_ago)
        .filter(Coupon.status.in_(["active", "expiring_soon"]))
        .count()
    )

    # Total potential savings (sum of fixed/cashback discount + max_discount)
    total_savings = (
        db.query(
            func.coalesce(
                func.sum(
                    func.coalesce(Coupon.max_discount, 0)
                    + func.coalesce(Coupon.discount_value, 0)
                ),
                0,
            )
        )
        .filter(Coupon.status.in_(["active", "expiring_soon"]))
        .scalar()
    )

    total_views = db.query(func.coalesce(func.sum(Coupon.view_count), 0)).scalar()
    total_redeems = db.query(func.coalesce(func.sum(Coupon.redeem_count), 0)).scalar()

    top_merchants = (
        db.query(Merchant.slug, Merchant.name, func.count(Coupon.id).label("c"))
        .outerjoin(Coupon, (Coupon.merchant_id == Merchant.id) & Coupon.status.in_(["active", "expiring_soon"]))
        .group_by(Merchant.id)
        .order_by(func.count(Coupon.id).desc())
        .limit(8)
        .all()
    )

    excellent = db.query(Coupon).filter(
        Coupon.quality_score >= 80,
        Coupon.status.in_(["active", "expiring_soon"]),
    ).count()

    return {
        "total_active": total_active,
        "merchant_count": db.query(Merchant).count(),
        "category_count": db.query(Category).count(),
        "new_24h": new_24h,
        "new_7d": new_7d,
        "total_views": int(total_views or 0),
        "total_redeems": int(total_redeems or 0),
        "total_potential_savings": int(total_savings or 0),
        "excellent_quality_count": excellent,
        "top_merchants": [
            {"slug": s, "name": n, "count": int(c)} for s, n, c in top_merchants if c > 0
        ],
        "last_updated": now.isoformat(),
    }


@router.get("/timeline")
def timeline(db: Session = Depends(get_db), days: int = 7):
    """Daily new-coupon count untuk last N days."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    rows = (
        db.query(
            func.date(Coupon.scraped_at).label("date"),
            func.count(Coupon.id).label("count"),
        )
        .filter(Coupon.scraped_at >= cutoff)
        .group_by(func.date(Coupon.scraped_at))
        .order_by(func.date(Coupon.scraped_at))
        .all()
    )
    return [{"date": str(r.date), "count": r.count} for r in rows]
