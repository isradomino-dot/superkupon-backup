"""Test rate limit pada POST /coupons/{id}/view & /redeem.

Reviewer #3 concern (bonus): angka view/redeem bisa dipalsuin → manipulate
ranking Hall of Fame / Trending. Fix: rate limit per IP.
"""
import pytest

# Default limits dari config.py
VIEW_PER_MIN = 30
REDEEM_PER_MIN = 10


def test_view_rate_limit_per_ip(client, reset_rate_limiter, db_session):
    """View endpoint rate-limited at 30/min/IP."""
    from app.models import Coupon, Merchant
    # Setup test coupon
    merchant = db_session.query(Merchant).first()
    if not merchant:
        merchant = Merchant(slug="test-merch", name="Test Merchant")
        db_session.add(merchant)
        db_session.commit()

    coupon = Coupon(
        code="TESTRATE",
        title="Test Rate Limit",
        discount_type="fixed",
        discount_value=10000,
        merchant_id=merchant.id,
        source_target="test",
        content_hash="test-hash-ratelimit-1",
        status="active",
    )
    db_session.add(coupon)
    db_session.commit()
    coupon_id = coupon.id

    # Hit endpoint 35 kali — harus ada yang 429
    hits_ok = 0
    hits_limited = 0
    for _ in range(35):
        r = client.post(f"/coupons/{coupon_id}/view")
        if r.status_code == 200:
            hits_ok += 1
        elif r.status_code == 429:
            hits_limited += 1

    # Toleransi: bisa 30 atau 30+1 OK karena timing
    assert hits_ok <= VIEW_PER_MIN + 1, f"Terlalu banyak yang lolos: {hits_ok}"
    assert hits_limited >= 4, f"Rate limit tidak aktif: cuma {hits_limited} ke-limit"


def test_redeem_rate_limit_stricter(client, reset_rate_limiter, db_session):
    """Redeem rate limit lebih ketat (10/min)."""
    from app.models import Coupon, Merchant
    merchant = db_session.query(Merchant).first()
    if not merchant:
        merchant = Merchant(slug="test-merch", name="Test Merchant")
        db_session.add(merchant)
        db_session.commit()

    coupon = Coupon(
        code="TESTREDEEM",
        title="Test Redeem Limit",
        discount_type="fixed",
        discount_value=10000,
        merchant_id=merchant.id,
        source_target="test",
        content_hash="test-hash-ratelimit-2",
        status="active",
    )
    db_session.add(coupon)
    db_session.commit()
    coupon_id = coupon.id

    # Hit redeem 15 kali — minimal 5 harus ke-limit
    hits_ok = 0
    hits_limited = 0
    for _ in range(15):
        r = client.post(f"/coupons/{coupon_id}/redeem")
        if r.status_code == 200:
            hits_ok += 1
        elif r.status_code == 429:
            hits_limited += 1

    assert hits_ok <= REDEEM_PER_MIN + 1
    assert hits_limited >= 4


def test_rate_limit_429_has_retry_after_header(client, reset_rate_limiter, db_session):
    """429 response harus include Retry-After header."""
    from app.models import Coupon, Merchant
    merchant = db_session.query(Merchant).first() or Merchant(slug="test-rl", name="Test")
    if not merchant.id:
        db_session.add(merchant)
        db_session.commit()

    coupon = Coupon(
        code="TESTRETRY",
        title="Test Retry-After",
        discount_type="fixed",
        discount_value=5000,
        merchant_id=merchant.id,
        source_target="test",
        content_hash="test-hash-retryafter",
        status="active",
    )
    db_session.add(coupon)
    db_session.commit()
    coupon_id = coupon.id

    # Spam sampai dapat 429
    last_response = None
    for _ in range(50):
        r = client.post(f"/coupons/{coupon_id}/view")
        if r.status_code == 429:
            last_response = r
            break

    assert last_response is not None, "Gagal trigger 429 in 50 attempts"
    assert "retry-after" in {k.lower() for k in last_response.headers.keys()}


def test_get_endpoints_not_rate_limited(client, reset_rate_limiter):
    """GET endpoints (yang read-only) gak boleh rate-limited buat browse."""
    # 50 GET cepat — semua harus 200
    for _ in range(50):
        r = client.get("/coupons?limit=1")
        assert r.status_code == 200, "GET shouldn't be rate limited"
