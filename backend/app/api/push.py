"""Push notification API — VAPID Web Push subscribe/unsubscribe + admin test send.

Endpoints:
  GET  /push/vapid-public-key       — frontend butuh ini buat browser subscribe
  POST /push/subscribe              — simpan subscription dari browser
  POST /push/unsubscribe            — hapus subscription
  POST /admin/push/send-test        — admin auth, broadcast notif ke semua subs

Note: send-test pake prefix /admin/* + require_admin biar konsisten sama
endpoint admin lain (X-API-Key header). Subscribe/unsubscribe public karena
tiap browser subscription endpoint udah secret (256-bit random URL).
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api._auth import require_admin
from app.config import settings
from app.db import get_db
from app.services.push_notification import (
    send_push_to_all,
    subscribe_push,
    unsubscribe_push,
)

router = APIRouter(tags=["push"])


# ---- Schemas ---------------------------------------------------------------

class PushSubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionPayload(BaseModel):
    """Match shape `PushSubscription.toJSON()` dari browser Push API."""
    endpoint: str = Field(..., max_length=500)
    keys: PushSubscriptionKeys
    user_agent: Optional[str] = Field(None, max_length=500)


class UnsubscribePayload(BaseModel):
    endpoint: str = Field(..., max_length=500)


class TestPushPayload(BaseModel):
    title: str = Field(..., max_length=120)
    body: str = Field(..., max_length=400)
    url: str = Field("/", max_length=500)
    icon: Optional[str] = Field(None, max_length=500)


# ---- Public endpoints ------------------------------------------------------

@router.get("/push/vapid-public-key")
def get_vapid_public_key():
    """Frontend fetch ini saat init Push API subscribe flow."""
    if not settings.VAPID_PUBLIC_KEY:
        raise HTTPException(
            503,
            "Push notifications belum di-configure: VAPID_PUBLIC_KEY belum di-set di server env.",
        )
    return {"public_key": settings.VAPID_PUBLIC_KEY}


@router.post("/push/subscribe")
def push_subscribe(
    payload: PushSubscriptionPayload,
    request: Request,
    db: Session = Depends(get_db),
):
    """Simpan subscription dari browser. Idempotent — endpoint unique."""
    ua = payload.user_agent or request.headers.get("user-agent")
    sub = subscribe_push(
        endpoint=payload.endpoint,
        p256dh=payload.keys.p256dh,
        auth=payload.keys.auth,
        user_agent=ua,
        db=db,
    )
    return {"ok": True, "id": sub.id}


@router.post("/push/unsubscribe")
def push_unsubscribe(payload: UnsubscribePayload, db: Session = Depends(get_db)):
    deleted = unsubscribe_push(payload.endpoint, db=db)
    return {"ok": True, "deleted": deleted}


# ---- Admin --------------------------------------------------------------

@router.post("/admin/push/send-test", dependencies=[Depends(require_admin)])
def admin_send_test(payload: TestPushPayload):
    """Broadcast test notif ke semua subscriber. Auth: X-API-Key header."""
    result = send_push_to_all(
        title=payload.title,
        body=payload.body,
        url=payload.url,
        icon=payload.icon,
    )
    return {"ok": True, **result}
