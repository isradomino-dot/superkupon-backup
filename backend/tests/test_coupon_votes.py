"""Test /coupons/{id}/vote + /coupons/{id}/votes endpoints + auto-archive logic."""
from datetime import datetime, timedelta


def _make_coupon(db, code="VOTE1", merchant_slug="shopee"):
    from app.models import Coupon, Merchant

    m = db.query(Merchant).filter_by(slug=merchant_slug).first()
    if not m:
        m = Merchant(slug=merchant_slug, name=merchant_slug.title())
        db.add(m)
        db.flush()

    c = Coupon(
        code=code,
        title=f"Vote Test {code}",
        description="Test",
        discount_type="percent",
        discount_value=10,
        merchant_id=m.id,
        source_target="manual_curation",
        source_url="https://example.com/test",
        content_hash=f"hash-vote-{code}",
        status="active",
        quality_score=50,
        verified_at=datetime.utcnow(),
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def test_vote_requires_valid_value(client, db_session):
    c = _make_coupon(db_session, "INVALID1")
    r = client.post(f"/coupons/{c.id}/vote", json={"value": "maybe"})
    assert r.status_code == 422


def test_vote_works_records_count(client, db_session):
    c = _make_coupon(db_session, "WORKS1")
    r = client.post(f"/coupons/{c.id}/vote", json={"value": "works"})
    assert r.status_code == 200
    body = r.json()
    assert body["coupon_id"] == c.id
    assert body["works_24h"] == 1
    assert body["expired_24h"] == 0
    assert body["archived"] is False


def test_vote_not_found_returns_404(client):
    r = client.post("/coupons/999999/vote", json={"value": "works"})
    assert r.status_code == 404


def test_vote_dedup_same_ip_updates_existing(client, db_session):
    c = _make_coupon(db_session, "DEDUP1")
    # First vote: works
    r1 = client.post(f"/coupons/{c.id}/vote", json={"value": "works"})
    assert r1.json()["works_24h"] == 1
    # Same IP votes expired — should update, not double
    r2 = client.post(f"/coupons/{c.id}/vote", json={"value": "expired"})
    body = r2.json()
    assert body["works_24h"] == 0
    assert body["expired_24h"] == 1


def test_get_votes_returns_current_counts(client, db_session):
    c = _make_coupon(db_session, "GET1")
    client.post(f"/coupons/{c.id}/vote", json={"value": "works"})
    r = client.get(f"/coupons/{c.id}/votes")
    assert r.status_code == 200
    body = r.json()
    assert body["works_24h"] == 1
    assert body["expired_24h"] == 0


def test_auto_archive_after_3_expired_votes(client, db_session):
    """Coupon should auto-archive when 3 unique IPs vote expired in 24h."""
    from app.models import Coupon, CouponVote
    from app.api.coupons import _hash_ip

    c = _make_coupon(db_session, "ARCHIVE1")
    cid = c.id

    # Seed 2 expired votes from different IPs (bypass IP dedup by inserting directly)
    now = datetime.utcnow()
    for i, ip in enumerate(["10.0.0.1", "10.0.0.2"]):
        db_session.add(
            CouponVote(
                coupon_id=cid,
                value="expired",
                reporter_ip_hash=_hash_ip(ip),
                created_at=now - timedelta(minutes=10 * (i + 1)),
            )
        )
    db_session.commit()

    # 3rd expired vote via endpoint (test client IP) — triggers auto-archive
    r = client.post(f"/coupons/{cid}/vote", json={"value": "expired"})
    body = r.json()
    assert body["expired_24h"] == 3
    assert body["archived"] is True

    # Verify coupon status updated in DB
    db_session.expire_all()
    refreshed = db_session.query(Coupon).filter_by(id=cid).first()
    assert refreshed.status == "archived"


def test_auto_archive_skipped_if_works_vote_exists(client, db_session):
    """If any 'works' vote exists in 24h window, expired votes do NOT archive."""
    from app.models import Coupon, CouponVote
    from app.api.coupons import _hash_ip

    c = _make_coupon(db_session, "PROTECTED1")
    cid = c.id
    now = datetime.utcnow()

    # Seed 1 'works' vote + 2 'expired' votes from different IPs
    db_session.add(
        CouponVote(
            coupon_id=cid,
            value="works",
            reporter_ip_hash=_hash_ip("10.0.0.99"),
            created_at=now - timedelta(hours=1),
        )
    )
    for i, ip in enumerate(["10.0.0.1", "10.0.0.2"]):
        db_session.add(
            CouponVote(
                coupon_id=cid,
                value="expired",
                reporter_ip_hash=_hash_ip(ip),
                created_at=now - timedelta(minutes=10 * (i + 1)),
            )
        )
    db_session.commit()

    # 3rd expired vote — should NOT archive because works exists
    r = client.post(f"/coupons/{cid}/vote", json={"value": "expired"})
    body = r.json()
    assert body["archived"] is False

    db_session.expire_all()
    refreshed = db_session.query(Coupon).filter_by(id=cid).first()
    assert refreshed.status == "active"


def test_old_votes_not_counted_in_24h_window(client, db_session):
    """Votes older than 24h should not count toward archive threshold."""
    from app.models import CouponVote
    from app.api.coupons import _hash_ip

    c = _make_coupon(db_session, "OLD1")
    cid = c.id
    old = datetime.utcnow() - timedelta(hours=48)

    # 2 old expired votes (48h ago)
    for ip in ["10.0.0.1", "10.0.0.2"]:
        db_session.add(
            CouponVote(
                coupon_id=cid,
                value="expired",
                reporter_ip_hash=_hash_ip(ip),
                created_at=old,
            )
        )
    db_session.commit()

    # New expired vote — should report only 1 (current) in 24h window
    r = client.post(f"/coupons/{cid}/vote", json={"value": "expired"})
    body = r.json()
    assert body["expired_24h"] == 1
    assert body["archived"] is False
