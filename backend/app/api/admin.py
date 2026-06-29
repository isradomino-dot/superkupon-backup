from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api._auth import require_admin
from app.db import get_db
from app.models import PasswordResetRequest, ScrapeLog, User, UserClaim, UserSession
from app.pipelines.dedup import upsert_coupons
from app.schemas import (
    AdminResetPasswordRequest,
    AdminUserOut,
    CouponRaw,
    ManualCouponBatch,
    ManualCouponResult,
    ScrapeLogOut,
)
from app.scrapers.registry import REGISTRY
from app.scheduler import run_scraper
from app.services.email_digest import send_weekly_digest
from app.utils.auth import hash_password

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


class DigestTestRequest(BaseModel):
    """Body untuk POST /admin/digest/send-test.

    recipients: optional override. Kalau None / [], pakai DIGEST_RECIPIENTS env.
                Pakai list[str] (bukan EmailStr) supaya error format gak block —
                send_weekly_digest yang validate akhirnya via Resend.
    """
    recipients: Optional[List[str]] = None


@router.get("/digest/env-check")
def digest_env_check():
    """Diagnostic: dump panjang + first 4 char dari env email digest.

    Aman: gak expose full secret value, cuma length + prefix buat verify:
    - len == 0 → env BELUM SET (atau nama whitespace di Railway)
    - len > 0 tapi prefix gak match expected → value salah (e.g. ada quotes)
    - len suspicious (e.g. 37 instead of 36) → trailing whitespace di value
    """
    from app.config import settings

    def _probe(v: str) -> dict:
        return {
            "len": len(v),
            "first4": v[:4] if v else "",
            "last2": v[-2:] if len(v) > 2 else "",
            "has_lead_space": v != v.lstrip() if v else False,
            "has_trail_space": v != v.rstrip() if v else False,
            "is_empty": not bool(v),
        }

    return {
        "RESEND_API_KEY": {**_probe(settings.RESEND_API_KEY), "expected_prefix": "re_x"},
        "DIGEST_RECIPIENTS": _probe(settings.DIGEST_RECIPIENTS),
        "DIGEST_ENABLED": {"value": settings.DIGEST_ENABLED, "type": type(settings.DIGEST_ENABLED).__name__},
        "DIGEST_FROM_EMAIL": _probe(settings.DIGEST_FROM_EMAIL),
        "DIGEST_PUBLIC_BASE_URL": _probe(settings.DIGEST_PUBLIC_BASE_URL),
    }


@router.post("/digest/send-test")
def send_digest_test(body: DigestTestRequest | None = None):
    """Trigger weekly email digest secara manual (bypass DIGEST_ENABLED gate).

    Use case: test template + Resend config sebelum nunggu cron Senin pagi.

    Behavior:
    - Kalau body.recipients di-supply → kirim ke list itu (bypass env).
    - Kalau body kosong → fallback ke settings.DIGEST_RECIPIENTS (csv).
    - Selalu bypass DIGEST_ENABLED (karena ini eksplisit dari admin).

    Returns 200 + result dict (ok + sent_to + message_id) on success,
    500 + error detail kalau Resend gagal / config invalid.
    """
    recipients = body.recipients if body else None
    # Sanitize: strip whitespace, drop empty
    if recipients:
        recipients = [r.strip() for r in recipients if r and r.strip()]
    result = send_weekly_digest(recipients=recipients or None)
    if not result.get("ok"):
        # Bedakan error vs skipped (skipped reason = gate)
        detail = result.get("error") or result.get("skipped_reason") or "Unknown failure"
        raise HTTPException(status_code=500, detail={"error": detail, "result": result})
    return result


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



# ============================================================
# Password Reset Requests — Admin Mediated Pattern
# ============================================================


class PasswordResetOut(BaseModel):
    id: int
    user_id: int
    username: str
    email_at_request: str
    token: str
    created_at: datetime
    expires_at: datetime
    used_at: Optional[datetime] = None
    requester_user_agent: Optional[str] = None
    minutes_remaining: int


@router.get("/password-resets", response_model=List[PasswordResetOut])
def list_password_resets(
    include_used: bool = False,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """List pending password reset requests untuk admin share token via WA."""
    q = db.query(PasswordResetRequest, User).join(User, PasswordResetRequest.user_id == User.id)
    if not include_used:
        q = q.filter(PasswordResetRequest.used_at.is_(None))
    q = q.order_by(PasswordResetRequest.created_at.desc()).limit(limit)

    now = datetime.utcnow()
    results = []
    for reset, user in q.all():
        delta = reset.expires_at - now
        minutes_remaining = max(0, int(delta.total_seconds() / 60))
        results.append(
            PasswordResetOut(
                id=reset.id,
                user_id=reset.user_id,
                username=user.username,
                email_at_request=reset.email_at_request,
                token=reset.token,
                created_at=reset.created_at,
                expires_at=reset.expires_at,
                used_at=reset.used_at,
                requester_user_agent=reset.requester_user_agent,
                minutes_remaining=minutes_remaining,
            )
        )
    return results


@router.delete("/password-resets/{reset_id}")
def cancel_password_reset(reset_id: int, db: Session = Depends(get_db)):
    """Cancel/delete password reset request — kalau admin curiga ada abuse atau
    udah selesai handle via WA tapi user gak pake."""
    reset = db.query(PasswordResetRequest).filter_by(id=reset_id).first()
    if not reset:
        raise HTTPException(404, "Reset request not found")
    db.delete(reset)
    db.commit()
    return {"ok": True, "deleted_id": reset_id}


# ============================================================
# Member User Management — Admin Endpoints
# ============================================================


@router.get("/users", response_model=List[AdminUserOut])
def list_users(db: Session = Depends(get_db)):
    """List semua member users + jumlah claim per user.

    Sorted by created_at DESC (newest first). Dipakai admin dashboard
    untuk monitor members, lihat aktivitas (claim_count proxy untuk
    engagement), dan trigger reset password kalau user lupa.
    """
    # Subquery: COUNT(*) per user_id dari user_claims
    claim_subq = (
        db.query(
            UserClaim.user_id.label("uid"),
            func.count(UserClaim.id).label("cnt"),
        )
        .group_by(UserClaim.user_id)
        .subquery()
    )

    rows = (
        db.query(User, func.coalesce(claim_subq.c.cnt, 0).label("claim_count"))
        .outerjoin(claim_subq, claim_subq.c.uid == User.id)
        .order_by(User.created_at.desc())
        .all()
    )

    results = []
    for user, claim_count in rows:
        results.append(
            AdminUserOut(
                id=user.id,
                email=user.email,
                username=user.username,
                role=user.role,
                status=user.status,
                created_at=user.created_at,
                last_login_at=user.last_login_at,
                claim_count=int(claim_count or 0),
            )
        )
    return results


@router.post("/users/{user_id}/reset-password")
def admin_reset_password(
    user_id: int,
    req: AdminResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """Manual reset password user — bypass email service.

    Use case: user lupa password, admin set password baru langsung dari
    dashboard, share via WA. Sekaligus invalidate semua session aktif
    user tersebut (force logout di semua device) untuk security.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

    user.password_hash = hash_password(req.new_password)

    # Invalidate semua sesi aktif — force logout di semua device
    deleted_sessions = (
        db.query(UserSession)
        .filter(UserSession.user_id == user_id)
        .delete(synchronize_session=False)
    )
    db.commit()

    return {
        "ok": True,
        "message": "Password reset successfully",
        "user_id": user_id,
        "username": user.username,
        "sessions_invalidated": int(deleted_sessions or 0),
    }
