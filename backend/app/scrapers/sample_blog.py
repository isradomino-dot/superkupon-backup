"""
Sample blog scraper — contoh real HTTP fetch + BeautifulSoup parse.
Pakai ini sebagai template untuk scraper blog kupon Indonesia mana pun.
"""
from datetime import datetime, timedelta
from typing import List
from bs4 import BeautifulSoup

from app.config import settings
from app.scrapers.base import BaseScraper
from app.schemas import CouponRaw
from app.pipelines.normalizer import normalize_discount


# Mock HTML — simulasi struktur blog kupon Indonesia umum
_MOCK_HTML = """
<html><body>
  <article class="coupon-item">
    <h2 class="coupon-title">Promo Tokopedia: Diskon Rp 100.000 Pengguna Baru</h2>
    <div class="coupon-code">NEWBIE100K</div>
    <p class="coupon-desc">Min. belanja Rp 500.000. Berlaku untuk akun yang baru daftar.</p>
    <span class="coupon-merchant">tokopedia</span>
    <span class="coupon-category">ecommerce</span>
    <time datetime="2026-06-30">30 Juni 2026</time>
  </article>
  <article class="coupon-item">
    <h2 class="coupon-title">Traveloka: Diskon 12% Hotel</h2>
    <div class="coupon-code">HOTEL12</div>
    <p class="coupon-desc">Berlaku untuk semua kota di Indonesia. Max diskon Rp 200.000.</p>
    <span class="coupon-merchant">traveloka</span>
    <span class="coupon-category">entertainment</span>
    <time datetime="2026-07-15">15 Juli 2026</time>
  </article>
  <article class="coupon-item">
    <h2 class="coupon-title">Gojek: Cashback Rp 15.000 GoFood</h2>
    <div class="coupon-code">GOFOODCB</div>
    <p class="coupon-desc">Min. order Rp 50.000. Berlaku 2x per user per minggu.</p>
    <span class="coupon-merchant">gojek</span>
    <span class="coupon-category">food</span>
    <time datetime="2026-06-20">20 Juni 2026</time>
  </article>
</body></html>
"""


class SampleBlogScraper(BaseScraper):
    target_id = "kuponsegar_blog"
    merchant_slug = "multi"
    name = "Sample Coupon Blog"
    interval_minutes = 60
    tier = "public"

    async def fetch_raw(self) -> str:
        if settings.SCRAPER_USE_MOCK:
            return _MOCK_HTML
        # Production: from app.anti_detect.fetcher import fetch
        # resp = await fetch("https://example.com/coupons")
        # return resp.text
        raise NotImplementedError("Set SCRAPER_USE_MOCK=true untuk PoC")

    def parse(self, raw: str) -> List[CouponRaw]:
        soup = BeautifulSoup(raw, "lxml")
        results: List[CouponRaw] = []

        for art in soup.select("article.coupon-item"):
            title_el = art.select_one(".coupon-title")
            code_el = art.select_one(".coupon-code")
            desc_el = art.select_one(".coupon-desc")
            merchant_el = art.select_one(".coupon-merchant")
            cat_el = art.select_one(".coupon-category")
            time_el = art.select_one("time")

            if not title_el:
                continue

            title = title_el.get_text(strip=True)
            disc_type, disc_value = normalize_discount(title)

            expires_at = None
            if time_el and time_el.get("datetime"):
                try:
                    expires_at = datetime.strptime(time_el["datetime"], "%Y-%m-%d")
                except ValueError:
                    pass

            results.append(
                CouponRaw(
                    code=code_el.get_text(strip=True) if code_el else None,
                    title=title,
                    description=desc_el.get_text(strip=True) if desc_el else None,
                    discount_type=disc_type,
                    discount_value=disc_value,
                    merchant_slug=merchant_el.get_text(strip=True) if merchant_el else "multi",
                    category_slug=cat_el.get_text(strip=True) if cat_el else None,
                    expires_at=expires_at,
                    source_url="https://example.com/coupons",
                    source_target=self.target_id,
                )
            )

        return results
