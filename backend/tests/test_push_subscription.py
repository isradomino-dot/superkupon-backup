"""Test push subscription endpoints + admin send-test.

Coverage:
- GET  /push/vapid-public-key — returns env value (or 503 kalau kosong)
- POST /push/subscribe — creates DB row, dedupes on duplicate endpoint (upsert)
- POST /push/unsubscribe — removes row
- POST /admin/push/send-test — requires auth, send flow with mocked pywebpush
"""
from __future__ import annotations

import sys
import types
from unittest.mock import MagicMock

import pytest


# ============================================================
# GET /push/vapid-public-key
# ============================================================

def test_vapid_public_key_returns_env_value(client):
    """VAPID_PUBLIC_KEY ke-set → 200 + value."""
    from app import config
    original = config.settings.VAPID_PUBLIC_KEY
    config.settings.VAPID_PUBLIC_KEY = "BFAKE_PUBLIC_KEY_b64url_value"
    try:
        response = client.get("/push/vapid-public-key")
        assert response.status_code == 200
        body = response.json()
        assert body["public_key"] == "BFAKE_PUBLIC_KEY_b64url_value"
    finally:
        config.settings.VAPID_PUBLIC_KEY = original


def test_vapid_public_key_returns_503_if_not_configured(client):
    """Kosong → 503 (push gak available)."""
    from app import config
    original = config.settings.VAPID_PUBLIC_KEY
    config.settings.VAPID_PUBLIC_KEY = ""
    try:
        response = client.get("/push/vapid-public-key")
        assert response.status_code == 503
        body = response.json()
        assert "VAPID_PUBLIC_KEY" in body["detail"]
    finally:
        config.settings.VAPID_PUBLIC_KEY = original


# ============================================================
# POST /push/subscribe — creates row, idempotent on dup endpoint
# ============================================================

def _sub_payload(endpoint="https://fcm.googleapis.com/fcm/send/abc123"):
    return {
        "endpoint": endpoint,
        "keys": {
            "p256dh": "BFAKEp256dhKEY_b64url",
            "auth": "fakeAuth_b64url",
        },
        "user_agent": "Mozilla/5.0 (Test) PyTest/1.0",
    }


def test_push_subscribe_creates_db_row(client, db_session):
    """First subscribe → insert PushSubscription row."""
    from app.models import PushSubscription

    endpoint = "https://fcm.googleapis.com/fcm/send/test_create_1"
    # Cleanup any leftover from previous runs
    db_session.query(PushSubscription).filter_by(endpoint=endpoint).delete()
    db_session.commit()

    response = client.post("/push/subscribe", json=_sub_payload(endpoint))
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["ok"] is True
    assert isinstance(body["id"], int)

    # Verify row exists di DB
    db_session.expire_all()
    row = db_session.query(PushSubscription).filter_by(endpoint=endpoint).first()
    assert row is not None
    assert row.p256dh == "BFAKEp256dhKEY_b64url"
    assert row.auth == "fakeAuth_b64url"


def test_push_subscribe_dedup_upsert(client, db_session):
    """Same endpoint dipanggil 2x → row tetap 1, keys ke-update."""
    from app.models import PushSubscription

    endpoint = "https://fcm.googleapis.com/fcm/send/test_dedup_2"
    db_session.query(PushSubscription).filter_by(endpoint=endpoint).delete()
    db_session.commit()

    # First call
    r1 = client.post("/push/subscribe", json=_sub_payload(endpoint))
    assert r1.status_code == 200
    first_id = r1.json()["id"]

    # Second call dengan keys baru
    new_payload = _sub_payload(endpoint)
    new_payload["keys"]["p256dh"] = "BUPDATED_p256dh_value"
    new_payload["keys"]["auth"] = "updatedAuth"
    r2 = client.post("/push/subscribe", json=new_payload)
    assert r2.status_code == 200
    second_id = r2.json()["id"]

    # Same row reused (same id)
    assert first_id == second_id

    db_session.expire_all()
    rows = db_session.query(PushSubscription).filter_by(endpoint=endpoint).all()
    assert len(rows) == 1
    assert rows[0].p256dh == "BUPDATED_p256dh_value"
    assert rows[0].auth == "updatedAuth"


def test_push_unsubscribe_removes_row(client, db_session):
    """Subscribe → unsubscribe → row gone."""
    from app.models import PushSubscription

    endpoint = "https://fcm.googleapis.com/fcm/send/test_unsub_3"
    db_session.query(PushSubscription).filter_by(endpoint=endpoint).delete()
    db_session.commit()

    # Subscribe first
    r = client.post("/push/subscribe", json=_sub_payload(endpoint))
    assert r.status_code == 200

    # Now unsubscribe
    r2 = client.post("/push/unsubscribe", json={"endpoint": endpoint})
    assert r2.status_code == 200
    body = r2.json()
    assert body["ok"] is True
    assert body["deleted"] is True

    db_session.expire_all()
    row = db_session.query(PushSubscription).filter_by(endpoint=endpoint).first()
    assert row is None


def test_push_unsubscribe_nonexistent_returns_deleted_false(client):
    """Unsubscribe endpoint yang gak ada → ok=True, deleted=False."""
    response = client.post(
        "/push/unsubscribe",
        json={"endpoint": "https://fcm.googleapis.com/fcm/send/does-not-exist-xyz"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["deleted"] is False


# ============================================================
# POST /admin/push/send-test — auth + mocked pywebpush
# ============================================================

def test_admin_push_send_test_requires_auth(client):
    """No X-API-Key → 401."""
    response = client.post(
        "/admin/push/send-test",
        json={"title": "Test", "body": "Hello"},
    )
    assert response.status_code == 401


def test_admin_push_send_test_wrong_key_blocked(client):
    """Wrong key → 401."""
    response = client.post(
        "/admin/push/send-test",
        json={"title": "Test", "body": "Hello"},
        headers={"X-API-Key": "definitely-wrong"},
    )
    assert response.status_code == 401


def test_admin_push_send_test_with_mocked_pywebpush(
    client, admin_headers, db_session
):
    """Auth OK + mocked pywebpush → 200, webpush called per subscriber."""
    from app.models import PushSubscription
    from app import config

    # Seed satu subscription
    endpoint = "https://fcm.googleapis.com/fcm/send/send_test_1"
    db_session.query(PushSubscription).filter_by(endpoint=endpoint).delete()
    db_session.commit()
    db_session.add(PushSubscription(
        endpoint=endpoint,
        p256dh="BFAKEp256",
        auth="fakeAuth",
    ))
    db_session.commit()

    # Mock VAPID keys (required by send_push_to_all gate)
    original_pub = config.settings.VAPID_PUBLIC_KEY
    original_priv = config.settings.VAPID_PRIVATE_KEY
    config.settings.VAPID_PUBLIC_KEY = "BFAKE_PUB"
    config.settings.VAPID_PRIVATE_KEY = "fake_priv_b64url"

    # Inject fake pywebpush module
    fake_webpush = MagicMock(return_value=None)

    class FakeWebPushException(Exception):
        def __init__(self, msg, response=None):
            super().__init__(msg)
            self.response = response

    fake_pywebpush = types.ModuleType("pywebpush")
    fake_pywebpush.webpush = fake_webpush
    fake_pywebpush.WebPushException = FakeWebPushException
    sys.modules["pywebpush"] = fake_pywebpush

    try:
        response = client.post(
            "/admin/push/send-test",
            json={
                "title": "Promo Baru!",
                "body": "Cek diskon Shopee hari ini",
                "url": "/coupons",
            },
            headers=admin_headers,
        )
    finally:
        sys.modules.pop("pywebpush", None)
        config.settings.VAPID_PUBLIC_KEY = original_pub
        config.settings.VAPID_PRIVATE_KEY = original_priv
        # Cleanup seeded sub
        db_session.query(PushSubscription).filter_by(endpoint=endpoint).delete()
        db_session.commit()

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["ok"] is True
    assert body["sent"] >= 1
    assert body["total"] >= 1
    # webpush dipanggil minimal sekali
    assert fake_webpush.called


def test_admin_push_send_test_no_vapid_keys_returns_error(
    client, admin_headers
):
    """VAPID kosong → send return error 'vapid_keys_missing', tapi endpoint tetep 200."""
    from app import config

    original_pub = config.settings.VAPID_PUBLIC_KEY
    original_priv = config.settings.VAPID_PRIVATE_KEY
    config.settings.VAPID_PUBLIC_KEY = ""
    config.settings.VAPID_PRIVATE_KEY = ""
    try:
        response = client.post(
            "/admin/push/send-test",
            json={"title": "T", "body": "B"},
            headers=admin_headers,
        )
    finally:
        config.settings.VAPID_PUBLIC_KEY = original_pub
        config.settings.VAPID_PRIVATE_KEY = original_priv

    # send_push_to_all return dict with error — endpoint wraps as 200
    assert response.status_code == 200
    body = response.json()
    assert body.get("error") == "vapid_keys_missing"
