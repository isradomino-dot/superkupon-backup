"""Test email digest service + admin send-test endpoint.

Coverage:
- build_weekly_digest_html returns valid HTML string with key content
- POST /admin/digest/send-test requires auth (X-API-Key)
- Send flow mocked — gak actually hit Resend API
"""
from __future__ import annotations

from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest


# ============================================================
# build_weekly_digest_html — pure function, no I/O
# ============================================================

def _fake_merchant(slug="shopee", name="Shopee", logo_url=None):
    m = MagicMock()
    m.slug = slug
    m.name = name
    m.logo_url = logo_url
    return m


def _fake_coupon(
    coupon_id=1,
    title="Diskon 50% All Items",
    discount_type="percent",
    discount_value=50,
    expires_at=None,
    merchant=None,
):
    c = MagicMock()
    c.id = coupon_id
    c.title = title
    c.discount_type = discount_type
    c.discount_value = discount_value
    c.expires_at = expires_at
    c.merchant = merchant or _fake_merchant()
    return c


def test_build_weekly_digest_html_returns_valid_html():
    """HTML output harus include doctype, key sections, dan data dari stats."""
    from app.services.email_digest import build_weekly_digest_html

    as_of = datetime(2026, 6, 22, 8, 0, 0)
    stats = {
        "total_active": 116,
        "new_7d": 25,
        "total_views": 1234,
        "top_merchants": [
            {"slug": "shopee", "name": "Shopee", "count": 30},
            {"slug": "tokopedia", "name": "Tokopedia", "count": 20},
        ],
        "as_of": as_of,
    }
    top_coupons = [
        _fake_coupon(coupon_id=1, title="Promo Spesial Shopee"),
        _fake_coupon(coupon_id=2, title="Cashback Tokopedia",
                     discount_type="cashback", discount_value=10000,
                     merchant=_fake_merchant("tokopedia", "Tokopedia")),
    ]
    expiring = [
        _fake_coupon(
            coupon_id=3,
            title="Hampir Expire",
            expires_at=as_of + timedelta(days=2),
        ),
    ]

    html = build_weekly_digest_html(stats, top_coupons, expiring)

    assert isinstance(html, str)
    assert html.startswith("<!doctype html>")
    assert "</html>" in html
    # Key sections
    assert "SuperKupon Weekly" in html
    assert "Top 5 Kupon Pilihan" in html
    assert "Expire Dalam 3 Hari" in html
    # KPI values rendered
    assert "116" in html  # total_active
    assert "+25" in html  # new_7d (prefix '+')
    # Merchant data rendered
    assert "Shopee" in html
    assert "Tokopedia" in html
    # Coupon titles rendered
    assert "Promo Spesial Shopee" in html
    assert "Hampir Expire" in html
    # Date label Indonesian format
    assert "Juni" in html
    assert "2026" in html


def test_build_weekly_digest_html_handles_empty_lists():
    """Kalau gak ada coupon, fallback message muncul."""
    from app.services.email_digest import build_weekly_digest_html

    stats = {
        "total_active": 0,
        "new_7d": 0,
        "total_views": 0,
        "top_merchants": [],
        "as_of": datetime(2026, 6, 22),
    }
    html = build_weekly_digest_html(stats, [], [])

    assert isinstance(html, str)
    assert "Belum ada kupon aktif" in html
    assert "Gak ada kupon yang expire" in html
    assert "Belum ada data merchant" in html


def test_build_weekly_digest_html_escapes_html_in_title():
    """XSS guard — title yang mengandung <script> harus di-escape."""
    from app.services.email_digest import build_weekly_digest_html

    malicious = _fake_coupon(title="<script>alert('xss')</script>Promo")
    html = build_weekly_digest_html(
        {"total_active": 1, "new_7d": 0, "total_views": 0,
         "top_merchants": [], "as_of": datetime(2026, 6, 22)},
        [malicious],
        [],
    )
    # Raw <script> should NOT appear — must be escaped
    assert "<script>alert" not in html
    assert "&lt;script&gt;" in html


# ============================================================
# Admin endpoint POST /admin/digest/send-test — auth + flow
# ============================================================

def test_digest_send_test_requires_auth(client):
    """No X-API-Key → 401."""
    response = client.post("/admin/digest/send-test", json={})
    assert response.status_code == 401


def test_digest_send_test_wrong_key_blocked(client):
    """Wrong X-API-Key → 401."""
    response = client.post(
        "/admin/digest/send-test",
        json={},
        headers={"X-API-Key": "wrong-key-xxx"},
    )
    assert response.status_code == 401


def test_digest_send_test_with_mocked_resend_success(client, admin_headers):
    """Correct auth + mocked Resend → 200, recipient explicit override."""
    fake_send = MagicMock(return_value={"id": "msg_abc123"})

    # Patch BEFORE making request: patch resend.Emails.send via sys.modules
    # Karena resend di-lazy-import di dalam send_weekly_digest, kita inject
    # fake module ke sys.modules.
    import sys
    import types

    fake_resend = types.ModuleType("resend")
    fake_resend.api_key = None
    fake_resend.Emails = MagicMock()
    fake_resend.Emails.send = fake_send
    sys.modules["resend"] = fake_resend

    try:
        # Set RESEND_API_KEY supaya gak ke-block sama "key belum di-set" check
        from app import config
        original_key = config.settings.RESEND_API_KEY
        config.settings.RESEND_API_KEY = "re_test_fake_12345"
        try:
            response = client.post(
                "/admin/digest/send-test",
                json={"recipients": ["test@example.com"]},
                headers=admin_headers,
            )
        finally:
            config.settings.RESEND_API_KEY = original_key

        assert response.status_code == 200, response.text
        body = response.json()
        assert body["ok"] is True
        assert body["sent_to"] == ["test@example.com"]
        assert body.get("message_id") == "msg_abc123"
        # Resend was actually invoked
        assert fake_send.called
    finally:
        sys.modules.pop("resend", None)


def test_digest_send_test_missing_resend_key_returns_500(client, admin_headers):
    """Kalau RESEND_API_KEY kosong, send_weekly_digest return ok=False → 500."""
    from app import config
    original_key = config.settings.RESEND_API_KEY
    config.settings.RESEND_API_KEY = ""
    try:
        response = client.post(
            "/admin/digest/send-test",
            json={"recipients": ["test@example.com"]},
            headers=admin_headers,
        )
    finally:
        config.settings.RESEND_API_KEY = original_key

    assert response.status_code == 500
    body = response.json()
    assert "RESEND_API_KEY" in str(body)


def test_digest_send_test_no_recipients_returns_500(client, admin_headers):
    """No recipient (body kosong + env empty) → 500 dengan error message."""
    from app import config
    original_recipients = config.settings.DIGEST_RECIPIENTS
    original_key = config.settings.RESEND_API_KEY
    config.settings.DIGEST_RECIPIENTS = ""
    config.settings.RESEND_API_KEY = "re_test_fake"
    try:
        response = client.post(
            "/admin/digest/send-test",
            json={},
            headers=admin_headers,
        )
    finally:
        config.settings.DIGEST_RECIPIENTS = original_recipients
        config.settings.RESEND_API_KEY = original_key

    assert response.status_code == 500
    body = response.json()
    assert "recipient" in str(body).lower()
