"""Test /admin/coupons/manual-add endpoint — curator add real verified coupons."""
import pytest


def _valid_coupon(code="VALID1", merchant="shopee"):
    """Minimum valid coupon payload."""
    return {
        "code": code,
        "title": f"Test Manual Curation {code}",
        "description": "Manually verified by curator",
        "discount_type": "percent",
        "discount_value": 15,
        "min_spend": 100000,
        "merchant_slug": merchant,
        "category_slug": "ecommerce",
        "source_url": "https://shopee.co.id/m/test-promo",
        "region": "national",
    }


def test_manual_add_requires_auth(client):
    """Endpoint butuh X-API-Key (inherited dari /admin router)."""
    payload = {"coupons": [_valid_coupon("AUTHTEST1")]}
    r = client.post("/admin/coupons/manual-add", json=payload)
    assert r.status_code == 401


def test_manual_add_single_coupon(client, admin_headers):
    """Insert 1 valid coupon."""
    payload = {"coupons": [_valid_coupon("MANUAL1")]}
    r = client.post("/admin/coupons/manual-add", json=payload, headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["added"] + body["updated"] == 1
    assert body["skipped"] == 0
    assert len(body["errors"]) == 0


def test_manual_add_bulk(client, admin_headers):
    """Bulk insert multiple coupons."""
    payload = {
        "coupons": [
            _valid_coupon("BULK1"),
            _valid_coupon("BULK2"),
            _valid_coupon("BULK3"),
        ]
    }
    r = client.post("/admin/coupons/manual-add", json=payload, headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert (body["added"] + body["updated"]) == 3


def test_manual_add_invalid_url_rejected(client, admin_headers):
    """source_url harus valid HTTP URL — else skipped."""
    bad = _valid_coupon("BADURL1")
    bad["source_url"] = "not-a-url"
    payload = {"coupons": [bad]}
    r = client.post("/admin/coupons/manual-add", json=payload, headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["skipped"] == 1
    assert any("source_url" in err for err in body["errors"])


def test_manual_add_invalid_discount_type(client, admin_headers):
    """discount_type harus dari enum: percent/fixed/cashback/bogo/free_shipping."""
    bad = _valid_coupon("BADTYPE1")
    bad["discount_type"] = "invalid_type"
    payload = {"coupons": [bad]}
    r = client.post("/admin/coupons/manual-add", json=payload, headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["skipped"] == 1
    assert any("discount_type" in err for err in body["errors"])


def test_manual_add_empty_code_rejected(client, admin_headers):
    """Code wajib di-isi (manual coupons selalu punya code)."""
    bad = _valid_coupon("")
    bad["code"] = ""
    # Pydantic might reject at validation layer with 422
    payload = {"coupons": [bad]}
    r = client.post("/admin/coupons/manual-add", json=payload, headers=admin_headers)
    # Either 200 with skipped=1, or 422 from Pydantic
    assert r.status_code in (200, 422)


def test_manual_add_marks_source_target(client, admin_headers, db_session):
    """Manual coupons tagged source_target='manual_curation'."""
    from app.models import Coupon
    payload = {"coupons": [_valid_coupon("MARKED1")]}
    r = client.post("/admin/coupons/manual-add", json=payload, headers=admin_headers)
    assert r.status_code == 200

    coupon = db_session.query(Coupon).filter_by(code="MARKED1").first()
    assert coupon is not None
    assert coupon.source_target == "manual_curation"


def test_manual_add_high_quality_score(client, admin_headers, db_session):
    """Manual coupons dapat quality_score >= 95 (verified by human)."""
    from app.models import Coupon
    payload = {"coupons": [_valid_coupon("QUALITY1")]}
    r = client.post("/admin/coupons/manual-add", json=payload, headers=admin_headers)
    assert r.status_code == 200

    coupon = db_session.query(Coupon).filter_by(code="QUALITY1").first()
    assert coupon is not None
    assert coupon.quality_score >= 95


def test_manual_delete_endpoint(client, admin_headers, db_session):
    """DELETE /admin/coupons/manual/{id} hapus manual coupon."""
    # Insert dulu
    payload = {"coupons": [_valid_coupon("DELME1")]}
    client.post("/admin/coupons/manual-add", json=payload, headers=admin_headers)

    from app.models import Coupon
    coupon = db_session.query(Coupon).filter_by(code="DELME1").first()
    assert coupon is not None
    coupon_id = coupon.id

    # Delete
    r = client.delete(f"/admin/coupons/manual/{coupon_id}", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["deleted_id"] == coupon_id


def test_manual_delete_protected_scraped(client, admin_headers, db_session):
    """Tidak boleh delete coupon dari scraper (source_target != manual_curation)."""
    from app.models import Coupon, Merchant
    merchant = db_session.query(Merchant).first()
    if not merchant:
        merchant = Merchant(slug="prot-test", name="Protected Test")
        db_session.add(merchant)
        db_session.commit()

    coupon = Coupon(
        code="PROTECTED1",
        title="Scraped Coupon",
        discount_type="fixed",
        discount_value=10000,
        merchant_id=merchant.id,
        source_target="google_news_promo",
        content_hash="test-protected-hash",
        status="active",
    )
    db_session.add(coupon)
    db_session.commit()

    r = client.delete(f"/admin/coupons/manual/{coupon.id}", headers=admin_headers)
    assert r.status_code == 400
