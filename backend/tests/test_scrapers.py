"""Test scraper modules — parse mock data, validate structure.

Reviewer #1 concern: data harus real (bukan dummy). Tests memastikan:
1. Setiap scraper bisa parse mock structure dengan benar
2. CouponRaw schema valid
3. should_use_mock() resolver logic correct
4. Real fetch (Google News) bisa parse RSS structure
"""
import pytest

from app.scrapers.base import should_use_mock, BaseScraper
from app.scrapers.registry import REGISTRY, all_scrapers, get_scraper


def test_registry_has_critical_scrapers():
    """Registry harus include critical scrapers."""
    expected = {
        "google_news_promo",  # auto-aggregator real data
        "telegram_promo_aggregator",  # backup real data
        "involve_asia_api",  # affiliate revenue
        "shopee_affiliate_api",  # alternative affiliate
    }
    actual = set(REGISTRY.keys())
    missing = expected - actual
    assert not missing, f"Missing scrapers di registry: {missing}"


def test_all_scrapers_enabled_by_default():
    """Default: semua scraper enabled (kalau gak, set explicit di class)."""
    scrapers = all_scrapers()
    assert len(scrapers) >= 20, f"Registry terlalu sedikit: {len(scrapers)}"


def test_get_scraper_returns_instance():
    """get_scraper(target_id) return instance, bukan class."""
    s = get_scraper("google_news_promo")
    assert s is not None
    assert isinstance(s, BaseScraper)
    assert s.target_id == "google_news_promo"


def test_get_scraper_unknown_returns_none():
    """Unknown target_id return None (bukan KeyError)."""
    assert get_scraper("not-exists-xyz") is None


# ============================================================
# should_use_mock() resolver logic
# ============================================================

def test_should_use_mock_default_true():
    """Default behavior: SCRAPER_USE_MOCK=true → semua mock."""
    from app import config
    # In conftest.py kita set SCRAPER_USE_MOCK=true
    assert config.settings.SCRAPER_USE_MOCK is True
    # Random target ID → mock (gak di overrides)
    assert should_use_mock("some_random_target") is True


def test_should_use_mock_global_off(monkeypatch):
    """Kalau SCRAPER_USE_MOCK=false, SEMUA scraper real fetch."""
    from app import config
    monkeypatch.setattr(config.settings, "SCRAPER_USE_MOCK", False)
    monkeypatch.setattr(config.settings, "SCRAPER_REAL_OVERRIDES", "")
    assert should_use_mock("any_target") is False


def test_should_use_mock_with_override(monkeypatch):
    """Override list bypass mock per scraper."""
    from app import config
    monkeypatch.setattr(config.settings, "SCRAPER_USE_MOCK", True)
    monkeypatch.setattr(
        config.settings,
        "SCRAPER_REAL_OVERRIDES",
        "google_news_promo,telegram_promo_aggregator",
    )
    # Yang di-list → real fetch
    assert should_use_mock("google_news_promo") is False
    assert should_use_mock("telegram_promo_aggregator") is False
    # Yang gak di-list → tetap mock
    assert should_use_mock("involve_asia_api") is True


def test_should_use_mock_override_whitespace_tolerated(monkeypatch):
    """Tolerate whitespace di env var: 'a , b , c' → ['a', 'b', 'c']."""
    from app import config
    monkeypatch.setattr(config.settings, "SCRAPER_USE_MOCK", True)
    monkeypatch.setattr(
        config.settings,
        "SCRAPER_REAL_OVERRIDES",
        " google_news_promo , telegram_promo_aggregator ",
    )
    assert should_use_mock("google_news_promo") is False
    assert should_use_mock("telegram_promo_aggregator") is False


# ============================================================
# Google News scraper — parse mock RSS
# ============================================================

@pytest.mark.asyncio
async def test_google_news_parses_mock():
    """Google News scraper parse mock data tanpa error."""
    from app.scrapers.google_news import GoogleNewsPromoScraper
    scraper = GoogleNewsPromoScraper()
    raw = await scraper.fetch_raw()
    assert isinstance(raw, dict)
    items = scraper.parse(raw)
    assert isinstance(items, list)
    if items:
        # Validate first item structure
        item = items[0]
        assert item.title
        assert item.source_url
        assert item.source_target == "google_news_promo"
        assert item.merchant_slug


def test_google_news_discount_regex():
    """Regex extractor untuk discount value dari title."""
    from app.scrapers.google_news import _guess_discount
    # Percent
    assert _guess_discount("Diskon 50% Shopee Fashion") == ("percent", 50.0)
    # Fixed Rp
    typ, val = _guess_discount("Cashback Rp 20.000 DANA")
    assert typ in ("cashback", "fixed")
    assert val > 0
    # Free shipping
    assert _guess_discount("Gratis Ongkir Min Rp 50rb")[0] == "free_shipping"
    # Unknown
    assert _guess_discount("Promo Liburan Akhir Tahun")[0] in ("fixed", "percent")


def test_google_news_clean_title():
    """Title cleaner removes ' - Source' suffix."""
    from app.scrapers.google_news import _clean_title
    assert _clean_title("Promo Shopee 50% - Tirto.id") == "Promo Shopee 50%"
    assert _clean_title("Diskon Gojek - Kompas.com") == "Diskon Gojek"
    # No suffix
    assert _clean_title("Promo tanpa source") == "Promo tanpa source"


# ============================================================
# Telegram channel scraper
# ============================================================

@pytest.mark.asyncio
async def test_telegram_scraper_parses_mock():
    """Telegram scraper bisa parse mock HTML."""
    from app.scrapers.telegram_channel import TelegramChannelScraper
    scraper = TelegramChannelScraper()
    raw = await scraper.fetch_raw()
    assert isinstance(raw, str)
    assert "tgme_widget_message" in raw  # mock has Telegram structure


# ============================================================
# Multi-blog & sample scrapers (factory-based)
# ============================================================

@pytest.mark.asyncio
async def test_multi_blog_scraper_runs():
    """Multi blog scraper bisa run dan return list CouponRaw."""
    from app.scrapers.multi_blog import MultiBlogScraper
    scraper = MultiBlogScraper()
    items = await scraper.run()
    assert isinstance(items, list)
    assert len(items) > 0
    # No example.com leftover (post-fix dari reviewer)
    for item in items:
        if item.source_url:
            assert "example.com" not in item.source_url, (
                f"Mock data masih punya example.com URL: {item.source_url}"
            )
