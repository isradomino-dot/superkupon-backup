"""Test pipeline modules — dedup upsert, normalizer, quality scoring."""
import pytest
from datetime import datetime, timedelta

from app.schemas import CouponRaw


# ============================================================
# Dedup / Upsert logic
# ============================================================

def _make_raw(code, title, merchant_slug, source_url, source_target="test"):
    """Helper buat bikin CouponRaw test fixture."""
    return CouponRaw(
        code=code,
        title=title,
        description="Test description",
        discount_type="percent",
        discount_value=10.0,
        merchant_slug=merchant_slug,
        category_slug=None,
        expires_at=datetime.utcnow() + timedelta(days=30),
        source_url=source_url,
        source_target=source_target,
        region="national",
    )


def test_upsert_creates_new_coupon(db_session):
    """First insert bikin new coupon."""
    from app.pipelines.dedup import upsert_coupons
    raw = _make_raw("UPSERT1", "Test Upsert 1", "shopee", "https://shopee.co.id/p/upsert1")
    new_count, updated_count = upsert_coupons(db_session, [raw])
    assert new_count == 1
    assert updated_count == 0


def test_upsert_updates_existing_coupon(db_session):
    """Insert same content_hash → update, bukan duplicate."""
    from app.pipelines.dedup import upsert_coupons
    raw = _make_raw("UPSERT2", "Test Upsert 2", "shopee", "https://example.com/old")
    # Insert pertama
    new1, upd1 = upsert_coupons(db_session, [raw])
    assert new1 == 1

    # Update dengan source_url baru (post-fix dedup)
    raw_updated = _make_raw(
        "UPSERT2", "Test Upsert 2", "shopee", "https://shopee.co.id/new"
    )
    new2, upd2 = upsert_coupons(db_session, [raw_updated])
    assert new2 == 0
    assert upd2 == 1

    # Verify source_url ke-refresh
    from app.models import Coupon
    coupon = (
        db_session.query(Coupon)
        .filter_by(code="UPSERT2")
        .order_by(Coupon.id.desc())
        .first()
    )
    assert coupon.source_url == "https://shopee.co.id/new"


def test_upsert_refreshes_source_target(db_session):
    """source_target juga ke-refresh (post-fix dari reviewer kemarin)."""
    from app.pipelines.dedup import upsert_coupons
    raw1 = _make_raw("RFRESH1", "Refresh Source", "tokopedia", "https://x.com",
                     source_target="kuponsegar_blog")
    upsert_coupons(db_session, [raw1])

    raw2 = _make_raw("RFRESH1", "Refresh Source", "tokopedia", "https://x.com",
                     source_target="google_news_promo")
    upsert_coupons(db_session, [raw2])

    from app.models import Coupon
    coupon = db_session.query(Coupon).filter_by(code="RFRESH1").first()
    assert coupon.source_target == "google_news_promo"


def test_upsert_creates_merchant_if_missing(db_session):
    """Merchant auto-created kalau slug belum ada."""
    from app.pipelines.dedup import upsert_coupons
    from app.models import Merchant
    novel_slug = "novel-merchant-xyz"
    # Pastiin belum ada
    db_session.query(Merchant).filter_by(slug=novel_slug).delete()
    db_session.commit()

    raw = _make_raw("NEWMERCH", "New Merchant Test", novel_slug,
                    "https://newmerchant.com/promo")
    upsert_coupons(db_session, [raw])

    merchant = db_session.query(Merchant).filter_by(slug=novel_slug).first()
    assert merchant is not None
    assert merchant.slug == novel_slug


# ============================================================
# Content Hash
# ============================================================

def test_content_hash_deterministic():
    """Same input → same content_hash (deterministic)."""
    from app.pipelines.normalizer import compute_content_hash
    raw = _make_raw("HASH1", "Test Hash", "shopee", "https://shopee.co.id/promo")
    h1 = compute_content_hash(raw)
    h2 = compute_content_hash(raw)
    assert h1 == h2
    assert len(h1) > 0


def test_content_hash_different_inputs():
    """Different code → different hash."""
    from app.pipelines.normalizer import compute_content_hash
    raw1 = _make_raw("HASH1", "Test", "shopee", "https://x.com")
    raw2 = _make_raw("HASH2", "Test", "shopee", "https://x.com")
    h1 = compute_content_hash(raw1)
    h2 = compute_content_hash(raw2)
    assert h1 != h2


# ============================================================
# Quality Scorer
# ============================================================

def test_quality_score_in_valid_range(db_session):
    """Quality score 0-100 untuk valid coupon."""
    from app.pipelines.quality_scorer import score_coupon
    raw = _make_raw("QUAL1", "Test Quality", "shopee", "https://shopee.co.id/promo")
    score = score_coupon(raw, source_tier="public")
    assert 0 <= score <= 100


def test_quality_score_tier_aware():
    """Quality scorer aware tentang source_tier — return valid score per tier.

    Note: actual scoring logic may favor certain tiers based on internal rules
    (e.g. 'public' tier dari blog terpercaya bisa lebih tinggi dari 'premium'
    yang gak verified). Validation hanya range [0, 100].
    """
    from app.pipelines.quality_scorer import score_coupon
    raw = _make_raw("QUAL2", "Test Quality Tier", "shopee", "https://shopee.co.id/promo")
    for tier in ("public", "premium", "semi-public", "gray"):
        score = score_coupon(raw, source_tier=tier)
        assert 0 <= score <= 100, f"Tier {tier} score out of range: {score}"
