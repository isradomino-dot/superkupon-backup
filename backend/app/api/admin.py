from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api._auth import require_admin
from app.db import get_db
from app.models import ScrapeLog
from app.pipelines.dedup import upsert_coupons
from app.schemas import (
    CouponRaw,
    ManualCouponBatch,
    ManualCouponResult,
    ScrapeLogOut,
)
from app.scrapers.registry import REGISTRY
from app.scheduler import run_scraper

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_admin)],
)


@router.get("/scrapers")
def list_scrapers():
    return [
        {
            "target_id": cls.target_id,
            "name": cls.name,
            "merchant_slug": cls.merchant_slug,
            "interval_minutes": cls.interval_minutes,
            "tier": cls.tier,
            "enabled": cls.enabled,
        }
        for cls in REGISTRY.values()
    ]


@router.post("/scrape/{target_id}")
async def trigger_scrape(target_id: str):
    if target_id not in REGISTRY:
        raise HTTPException(404, f"Unknown target_id: {target_id}")
    return await run_scraper(target_id)


@router.post("/scrape-all")
async def trigger_scrape_all():
    results = []
    for target_id in REGISTRY.keys():
        results.append(await run_scraper(target_id))
    return {"results": results}


@router.get("/scrape-logs", response_model=List[ScrapeLogOut])
def list_logs(limit: int = 50, db: Session = Depends(get_db)):
    return (
        db.query(ScrapeLog)
        .order_by(ScrapeLog.started_at.desc())
        .limit(limit)
        .all()
    )


@router.post("/coupons/manual-add", response_model=ManualCouponResult)
def manual_add_coupons(
    batch: ManualCouponBatch,
    db: Session = Depends(get_db),
):
    """Bulk insert kupon real yang udah di-verify manual oleh curator/admin.

    Use case: sambil nunggu Involve Asia affiliate approval, curator browse
    promo publik di Shopee/Tokopedia/Grab/Gojek, verify works, lalu add ke DB
    lewat endpoint ini. Real data berkualitas vs mock data yg gak bisa redeem.

    Authentication: WAJIB header X-API-Key (lihat ADMIN_API_KEY env).

    Setiap kupon yang masuk di-tag:
    - source_target = "manual_curation"
    - verified_at = now() (artinya: curator udah test works)
    - quality_score = 95 (sangat tinggi karena verified manual)

    Dedup: upsert via content_hash + merchant_id. Kupon dengan code+title
    yang sama → di-update bukan dobel.
    """
    raw_items: list[CouponRaw] = []
    errors: list[str] = []
    skipped = 0

    for idx, c in enumerate(batch.coupons):
        # Basic validation
        if not c.code or not c.code.strip():
            errors.append(f"#{idx + 1}: code is required")
            skipped += 1
            continue
        if not c.merchant_slug or not c.merchant_slug.strip():
            errors.append(f"#{idx + 1} ({c.code}): merchant_slug is required")
            skipped += 1
            continue
        if not c.source_url or not c.source_url.startswith(("http://", "https://")):
            errors.append(f"#{idx + 1} ({c.code}): source_url must be valid HTTP URL")
            skipped += 1
            continue
        if c.discount_type not in {"percent", "fixed", "cashback", "bogo", "free_shipping"}:
            errors.append(f"#{idx + 1} ({c.code}): invalid discount_type")
            skipped += 1
            continue

        raw_items.append(
            CouponRaw(
                code=c.code.strip().upper(),  # normalize code uppercase
                title=c.title.strip(),
                description=c.description.strip() if c.description else None,
                discount_type=c.discount_type,
                discount_value=c.discount_value,
                min_spend=c.min_spend,
                max_discount=c.max_discount,
                merchant_slug=c.merchant_slug.strip().lower(),
                category_slug=c.category_slug.strip().lower() if c.category_slug else None,
                expires_at=c.expires_at,
                source_url=c.source_url.strip(),
                source_target="manual_curation",
                region=c.region or "national",
            )
        )

    if not raw_items:
        return ManualCouponResult(added=0, updated=0, skipped=skipped, errors=errors)

    try:
        new_count, updated_count = upsert_coupons(db, raw_items)
        # Boost quality_score buat manual coupons (verified by human curator)
        from app.models import Coupon
        db.query(Coupon).filter(
            Coupon.source_target == "manual_curation",
            Coupon.quality_score < 95,
        ).update({Coupon.quality_score: 95}, synchronize_session=False)
        db.commit()

        return ManualCouponResult(
            added=new_count,
            updated=updated_count,
            skipped=skipped,
            errors=errors,
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Failed to insert: {str(e)}")


@router.delete("/coupons/manual/{coupon_id}")
def delete_manual_coupon(coupon_id: int, db: Session = Depends(get_db)):
    """Delete kupon manual yg udah expired / gak relevan.

    Hanya bisa delete kupon dengan source_target='manual_curation'.
    Buat scraped coupons, biarin lifecycle job auto-expire.
    """
    from app.models import Coupon

    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(404, "Coupon not found")
    if coupon.source_target != "manual_curation":
        raise HTTPException(
            400,
            "Endpoint ini hanya untuk manual coupons. "
            "Scraped coupons di-handle oleh lifecycle job.",
        )

    db.delete(coupon)
    db.commit()
    return {"ok": True, "deleted_id": coupon_id}


@router.post("/coupons/{coupon_id}/archive")
def archive_coupon(coupon_id: int, db: Session = Depends(get_db)):
    """Soft-archive kupon — set status='archived'. Tidak tampil di public list,
    tapi history tetap ada di DB. Pakai ini buat mock data residue / broken items
    yang gak boleh keulang lewat upsert (next scrape akan ke-block karena
    content_hash sama → status di-update active lagi, jadi tetep keliatan).
    """
    from app.models import Coupon

    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(404, "Coupon not found")
    coupon.status = "archived"
    db.commit()
    return {"ok": True, "archived_id": coupon_id, "title": coupon.title}


@router.post("/coupons/cleanup-by-source")
def cleanup_by_source(
    source_target: str,
    db: Session = Depends(get_db),
):
    """Bulk archive semua kupon dari source_target tertentu.
    Gunakan setelah identifikasi source yang return mock / placeholder data
    (e.g. involve_asia_api dengan endpoint deprecated).

    Returns list of archived coupon IDs + count.
    """
    from app.models import Coupon

    coupons = (
        db.query(Coupon)
        .filter(Coupon.source_target == source_target, Coupon.status == "active")
        .all()
    )
    archived_ids = []
    for c in coupons:
        c.status = "archived"
        archived_ids.append(c.id)
    db.commit()
    return {
        "ok": True,
        "source_target": source_target,
        "archived_count": len(archived_ids),
        "archived_ids": archived_ids,
    }


@router.delete("/coupons/{coupon_id}/force")
def force_delete_coupon(coupon_id: int, db: Session = Depends(get_db)):
    """Force-delete kupon by ID — bypass source_target restriction.
    Pakai HANYA untuk cleanup data corruption / fake placeholder items.
    Untuk soft removal, pakai /admin/coupons/{id}/archive.
    """
    from app.models import Coupon

    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(404, "Coupon not found")
    title = coupon.title
    source = coupon.source_target
    db.delete(coupon)
    db.commit()
    return {
        "ok": True,
        "deleted_id": coupon_id,
        "title": title,
        "source_target": source,
    }
