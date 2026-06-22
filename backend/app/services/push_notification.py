"""VAPID Web Push notification service.

Pakai pywebpush + cryptography (ECDSA P-256). No Firebase / FCM SDK —
browser native Push API ngomong langsung ke push service (FCM/Mozilla/Apple)
pake VAPID signed JWT.

Setup pertama:
  $ python -m app.services.push_notification
  → cetak VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY (URL-safe base64).
  → copy ke .env / Railway env vars.

Frontend nge-fetch GET /push/vapid-public-key buat subscribe.
Backend kirim push via send_push_to_all() — fire-and-forget background task,
auto-cleanup subscription yg expired (410 Gone) atau invalid (404).
"""
from __future__ import annotations

import base64
import json
import logging
from datetime import datetime
from typing import Optional

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal
from app.models import PushSubscription

logger = logging.getLogger(__name__)


# ---- Helpers ----------------------------------------------------------------

def _b64url(raw: bytes) -> str:
    """URL-safe base64 tanpa padding, format VAPID standar."""
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def generate_vapid_keys() -> dict[str, str]:
    """Generate fresh VAPID keypair (ECDSA P-256 / prime256v1).

    Returns:
        dict dengan key `public_key` (uncompressed point, 65 bytes b64url)
        dan `private_key` (raw 32-byte scalar b64url) — sesuai format yg
        diharapkan pywebpush + browser Push API.
    """
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()

    # Public: uncompressed point format (0x04 || X || Y), 65 bytes
    pub_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )
    # Private: raw 32-byte big-endian scalar
    priv_int = private_key.private_numbers().private_value
    priv_bytes = priv_int.to_bytes(32, "big")

    return {
        "public_key": _b64url(pub_bytes),
        "private_key": _b64url(priv_bytes),
    }


# ---- Subscription CRUD ------------------------------------------------------

def subscribe_push(
    endpoint: str,
    p256dh: str,
    auth: str,
    user_agent: Optional[str] = None,
    db: Optional[Session] = None,
) -> PushSubscription:
    """Simpan / refresh subscription dari browser. Idempotent by endpoint."""
    own_db = db is None
    if own_db:
        db = SessionLocal()
    try:
        existing = (
            db.query(PushSubscription)
            .filter(PushSubscription.endpoint == endpoint)
            .first()
        )
        if existing:
            existing.p256dh = p256dh
            existing.auth = auth
            if user_agent:
                existing.user_agent = user_agent[:500]
            db.commit()
            return existing

        sub = PushSubscription(
            endpoint=endpoint,
            p256dh=p256dh,
            auth=auth,
            user_agent=(user_agent or "")[:500] or None,
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)
        return sub
    finally:
        if own_db:
            db.close()


def unsubscribe_push(endpoint: str, db: Optional[Session] = None) -> bool:
    """Hapus subscription. Return True kalo ada yg ke-delete."""
    own_db = db is None
    if own_db:
        db = SessionLocal()
    try:
        deleted = (
            db.query(PushSubscription)
            .filter(PushSubscription.endpoint == endpoint)
            .delete(synchronize_session=False)
        )
        db.commit()
        return deleted > 0
    finally:
        if own_db:
            db.close()


# ---- Send -------------------------------------------------------------------

def send_push_to_all(
    title: str,
    body: str,
    url: str = "/",
    icon: Optional[str] = None,
    db: Optional[Session] = None,
) -> dict:
    """Broadcast push notification ke semua subscriber.

    Auto-cleanup: kalo push service balik 404 / 410 (subscription gak valid
    / udah di-uninstall), row di-delete dari DB.

    Returns:
        dict dengan counter sent / failed / cleaned + total subscribers.
    """
    if not settings.VAPID_PRIVATE_KEY or not settings.VAPID_PUBLIC_KEY:
        logger.warning("send_push_to_all skipped: VAPID keys belum di-set")
        return {"sent": 0, "failed": 0, "cleaned": 0, "total": 0, "error": "vapid_keys_missing"}

    # Lazy import — pywebpush optional dependency, jangan crash kalo gak ada
    try:
        from pywebpush import WebPushException, webpush
    except ImportError:
        logger.error("pywebpush belum ke-install — run `pip install pywebpush`")
        return {"sent": 0, "failed": 0, "cleaned": 0, "total": 0, "error": "pywebpush_missing"}

    own_db = db is None
    if own_db:
        db = SessionLocal()

    sent = 0
    failed = 0
    cleaned = 0
    payload = json.dumps({
        "title": title,
        "body": body,
        "url": url,
        "icon": icon or "/icon-192.png",
    })
    vapid_claims = {"sub": settings.VAPID_SUBJECT}

    try:
        subs = db.query(PushSubscription).all()
        total = len(subs)
        now = datetime.utcnow()

        for sub in subs:
            sub_info = {
                "endpoint": sub.endpoint,
                "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
            }
            try:
                webpush(
                    subscription_info=sub_info,
                    data=payload,
                    vapid_private_key=settings.VAPID_PRIVATE_KEY,
                    vapid_claims=dict(vapid_claims),  # pywebpush mutates dict
                    ttl=60 * 60 * 24,  # 24 jam — kalo browser offline lebih lama, drop
                )
                sub.last_sent_at = now
                sent += 1
            except WebPushException as exc:
                status = getattr(exc.response, "status_code", None) if exc.response else None
                if status in (404, 410):
                    # Subscription stale (uninstall / unsubscribe di browser)
                    db.delete(sub)
                    cleaned += 1
                    logger.info("Cleaned stale push subscription id=%s status=%s", sub.id, status)
                else:
                    failed += 1
                    logger.warning("Push failed sub_id=%s status=%s err=%s", sub.id, status, exc)
            except Exception as exc:  # noqa: BLE001 — defensive, jangan blok scraper
                failed += 1
                logger.exception("Unexpected push error sub_id=%s: %s", sub.id, exc)

        db.commit()
        return {"sent": sent, "failed": failed, "cleaned": cleaned, "total": total}
    finally:
        if own_db:
            db.close()


# ---- CLI helper -------------------------------------------------------------

if __name__ == "__main__":
    keys = generate_vapid_keys()
    print("# Add to .env / Railway env vars:")
    print(f"VAPID_PUBLIC_KEY={keys['public_key']}")
    print(f"VAPID_PRIVATE_KEY={keys['private_key']}")
    print(f"VAPID_SUBJECT=mailto:lim279614@gmail.com")
    print(f"PUSH_ENABLED=true")
