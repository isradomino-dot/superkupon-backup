"""Test /admin/coupons archive + force-delete + cleanup-by-source endpoints."""


def _make_coupon(db, code, source_target="manual_curation", merchant_slug="shopee"):
    """Helper bikin kupon di DB langsung biar test endpoint cleanup."""
    from app.models import Coupon, Merchant
    from datetime import datetime

    m = db.query(Merchant).filter_by(slug=merchant_slug).first()
    if not m:
        m = Merchant(slug=merchant_slug, name=merchant_slug.title())
        db.add(m)
        db.flush()

    c = Coupon(
        code=code,
        title=f"Test {code}",
        description="Test",
        discount_type="percent",
        discount_value=10,
        merchant_id=m.id,
        source_target=source_target,
        source_url="https://example.com/test",
        content_hash=f"hash-{code}",
        status="active",
        quality_score=50,
        verified_at=datetime.utcnow(),
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def test_archive_coupon_requires_auth(client):
    r = client.post("/admin/coupons/9999/archive")
    assert r.status_code == 401


def test_archive_coupon_not_found(client, admin_headers):
    r = client.post("/admin/coupons/999999/archive", headers=admin_headers)
    assert r.status_code == 404


def test_archive_coupon_success(client, admin_headers, db_session):
    c = _make_coupon(db_session, "ARCH1")
    cid = c.id

    r = client.post(f"/admin/coupons/{cid}/archive", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["archived_id"] == cid

    db_session.expire_all()
    from app.models import Coupon
    updated = db_session.query(Coupon).filter_by(id=cid).first()
    assert updated.status == "archived"


def test_force_delete_coupon_success(client, admin_headers, db_session):
    c = _make_coupon(db_session, "FORCE1", source_target="scraped_source")
    cid = c.id

    r = client.delete(f"/admin/coupons/{cid}/force", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["deleted_id"] == cid

    from app.models import Coupon
    deleted = db_session.query(Coupon).filter_by(id=cid).first()
    assert deleted is None


def test_force_delete_not_found(client, admin_headers):
    r = client.delete("/admin/coupons/999999/force", headers=admin_headers)
    assert r.status_code == 404


def test_cleanup_by_source_archives_matching(client, admin_headers, db_session):
    # Bikin 3 kupon dengan source_target sama
    for code in ["CLEAN1", "CLEAN2", "CLEAN3"]:
        _make_coupon(db_session, code, source_target="cleanup_test_source")

    r = client.post(
        "/admin/coupons/cleanup-by-source",
        params={"source_target": "cleanup_test_source"},
        headers=admin_headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["source_target"] == "cleanup_test_source"
    assert body["archived_count"] == 3

    from app.models import Coupon
    db_session.expire_all()
    rows = db_session.query(Coupon).filter_by(
        source_target="cleanup_test_source", status="active"
    ).all()
    assert len(rows) == 0


def test_cleanup_by_source_skips_already_archived(client, admin_headers, db_session):
    c1 = _make_coupon(db_session, "SKIP1", source_target="skip_test_source")
    c1.status = "archived"
    db_session.commit()
    _make_coupon(db_session, "SKIP2", source_target="skip_test_source")

    r = client.post(
        "/admin/coupons/cleanup-by-source",
        params={"source_target": "skip_test_source"},
        headers=admin_headers,
    )
    assert r.status_code == 200
    assert r.json()["archived_count"] == 1
