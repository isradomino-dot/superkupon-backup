"""Notifications endpoint — kupon baru + expiring warning + merchant filter."""
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.models import Coupon, Merchant
from app.schemas import CouponOut

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def get_notifications(
    db: Session = Depends(get_db),
    since: Optional[datetime] = Query(None, description="ISO timestamp — only return coupons after this"),
    merchant: Optional[str] = Query(None, description="Filter by merchant slug (e.g., 'shopee')"),
    within_days: int = Query(3, ge=1, le=30, description="Expiring within X days threshold"),
    limit_each: int = Query(20, ge=1, le=100),
):
    """Combined: kupon baru (since timestamp) + kupon expiring (within N days)."""
    now = datetime.utcnow()
    expiring_until = now + timedelta(days=within_days)

    base = (
        db.query(Coupon)
        .options(joinedload(Coupon.merchant), joinedload(Coupon.category))
        .filter(Coupon.status.in_(["active", "expiring_soon"]))
    )
    if merchant:
        base = base.join(Merchant).filter(Merchant.slug == merchant)

    # NEW: scraped after `since` (or all active if no since)
    new_q = base.filter(
        or_(Coupon.expires_at.is_(None), Coupon.expires_at >= now)
    )
    if since:
        new_q = new_q.filter(Coupon.scraped_at >= since)
    new_coupons = new_q.order_by(Coupon.scraped_at.desc()).limit(limit_each).all()

    # EXPIRING: has expiry between now and now+within_days
    expiring_coupons = (
        base.filter(
            and_(
                Coupon.expires_at.isnot(None),
                Coupon.expires_at >= now,
                Coupon.expires_at <= expiring_until,
            )
        )
        .order_by(Coupon.expires_at.asc())
        .limit(limit_each)
        .all()
    )

    def _serialize(c):
        return CouponOut.model_validate(c).model_dump(mode="json")

    return {
        "as_of": now.isoformat(),
        "new": [_serialize(c) for c in new_coupons],
        "expiring": [_serialize(c) for c in expiring_coupons],
        "counts": {
            "new": len(new_coupons),
            "expiring": len(expiring_coupons),
        },
        "filter": {
            "merchant": merchant,
            "within_days": within_days,
            "since": since.isoformat() if since else None,
        },
    }


@router.get("/badges")
def notification_badges(
    db: Session = Depends(get_db),
    since: Optional[datetime] = Query(None),
    merchant: Optional[str] = Query(None),
    within_days: int = Query(3, ge=1, le=30),
):
    """Lightweight count-only endpoint untuk polling badge — return cuma jumlah."""
    now = datetime.utcnow()
    expiring_until = now + timedelta(days=within_days)

    base = db.query(Coupon).filter(Coupon.status.in_(["active", "expiring_soon"]))
    if merchant:
        base = base.join(Merchant).filter(Merchant.slug == merchant)

    new_count = base.filter(
        or_(Coupon.expires_at.is_(None), Coupon.expires_at >= now)
    )
    if since:
        new_count = new_count.filter(Coupon.scraped_at >= since)
    new_total = new_count.count()

    expiring_total = base.filter(
        and_(
            Coupon.expires_at.isnot(None),
            Coupon.expires_at >= now,
            Coupon.expires_at <= expiring_until,
        )
    ).count()

    return {
        "as_of": now.isoformat(),
        "new": new_total,
        "expiring": expiring_total,
        "total": new_total + expiring_total,
    }
