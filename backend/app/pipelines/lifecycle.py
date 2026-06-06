"""Lifecycle job — auto-expire kupon yang lewat tanggal, tag expiring_soon."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from sqlalchemy import or_, update

from app.db import SessionLocal
from app.models import Coupon

logger = logging.getLogger(__name__)


def run_lifecycle() -> dict:
    """Update status kupon berdasarkan expiry.

    Returns:
        dict dengan counter: expired, expiring_soon, reactivated
    """
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        soon_threshold = now + timedelta(days=3)

        expired_count = db.execute(
            update(Coupon)
            .where(Coupon.status == "active")
            .where(Coupon.expires_at.is_not(None))
            .where(Coupon.expires_at < now)
            .values(status="expired")
        ).rowcount

        reactivated_count = db.execute(
            update(Coupon)
            .where(Coupon.status == "expiring_soon")
            .where(or_(Coupon.expires_at.is_(None), Coupon.expires_at > soon_threshold))
            .values(status="active")
        ).rowcount

        soon_count = db.execute(
            update(Coupon)
            .where(Coupon.status == "active")
            .where(Coupon.expires_at.is_not(None))
            .where(Coupon.expires_at >= now)
            .where(Coupon.expires_at < soon_threshold)
            .values(status="expiring_soon")
        ).rowcount

        db.commit()

        result = {
            "expired": expired_count,
            "expiring_soon": soon_count,
            "reactivated": reactivated_count,
            "ts": now.isoformat(),
        }
        logger.info(f"Lifecycle run: {result}")
        return result
    except Exception as e:
        db.rollback()
        logger.exception(f"Lifecycle job failed: {e}")
        return {"error": str(e)}
    finally:
        db.close()
