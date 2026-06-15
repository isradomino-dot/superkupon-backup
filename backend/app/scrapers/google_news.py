"""Google News Indonesia Promo Aggregator — scraper otomatis berita kupon/promo.

Strategy:
- Pakai Google News RSS Indonesia (hl=id, gl=ID, ceid=ID:id) sebagai discovery layer
- Query per-merchant biar dapat coupage relevan (shopee, tokopedia, grab, gojek, dll)
- Sumber: Tirto.id, Kompas.com, Mojok.co, Bank Mega Syariah, dll (publisher tepercaya)
- Update otomatis tiap jam via scheduler

Output: news article sebagai "promo entry" dengan:
- title = news article title (e.g., "Diskon 50% Shopee Mall Liburan")
- source_url = link artikel asli (user klik → baca → dapet kode di artikel)
- code = None (Google News gak expose code spesifik; user lihat di artikel)
- discount_value/type = parsed dari title via regex

Legal: Google News RSS adalah publik feed yg memang disediakan Google untuk
syndication. Bukan scraping anti-bot. Aman buat production.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime
from typing import List
from xml.etree import ElementTree as ET

import httpx

from app.config import settings
from app.scrapers.base import BaseScraper, should_use_mock
from app.schemas import CouponRaw

logger = logging.getLogger(__name__)


# Query string per merchant — di-encode untuk Google News RSS API
# Format: (merchant_slug, kategori_default, search_query)
_QUERIES: list[tuple[str, str, str]] = [
    ("shopee", "ecommerce", "promo+shopee+kode"),
    ("tokopedia", "ecommerce", "voucher+tokopedia"),
    ("lazada", "ecommerce", "promo+lazada"),
    ("blibli", "ecommerce", "voucher+blibli"),
    ("grab", "transport", "promo+grab+kode"),
    ("gojek", "transport", "kode+promo+gojek"),
    ("traveloka", "travel", "diskon+traveloka"),
    ("tiket-com", "travel", "promo+tiket.com"),
    ("dana", "ewallet", "cashback+dana"),
    ("ovo", "ewallet", "promo+ovo"),
    ("gopay", "ewallet", "promo+gopay"),
    ("linkaja", "ewallet", "promo+linkaja"),
]

_RSS_BASE = "https://news.google.com/rss/search?q={q}&hl=id&gl=ID&ceid=ID:id"

# Mock data buat dev / SCRAPER_USE_MOCK=true
_MOCK_DATA: dict[str, str] = {
    "shopee": """<?xml version="1.0"?>
<rss version="2.0"><channel>
<title>Google News - promo+shopee+kode</title>
<item>
  <title>Diskon Shopee Mall Liburan 50% Pakai Kode SHOPEELEBARAN - Tirto.id</title>
  <link>https://tirto.id/diskon-shopee-mall-liburan-50-persen-aBC123</link>
  <pubDate>Sun, 15 Jun 2026 10:00:00 GMT</pubDate>
</item>
<item>
  <title>Cashback 30rb Shopee Pengguna Baru Min 100rb - Kompas.com</title>
  <link>https://www.kompas.com/promo-shopee-pengguna-baru-xyz</link>
  <pubDate>Sat, 14 Jun 2026 14:00:00 GMT</pubDate>
</item>
</channel></rss>""",
}


# Regex patterns buat ekstrak discount info dari title
_PERCENT_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s*%", re.IGNORECASE)
_RUPIAH_RE = re.compile(
    r"(?:rp|rupiah|idr)\s*([\d.]+(?:rb|ribu|k|jt|juta)?)",
    re.IGNORECASE,
)
_FREE_SHIPPING_RE = re.compile(
    r"(?:gratis|free)\s*(?:ongkir|shipping|ongkos\s*kirim)",
    re.IGNORECASE,
)
_CASHBACK_RE = re.compile(r"cashback", re.IGNORECASE)


def _parse_rupiah_to_int(s: str) -> int:
    """Convert 'Rp 50.000' / '50rb' / '1jt' → integer rupiah."""
    s = s.lower().replace(".", "").replace(",", "").strip()
    multiplier = 1
    if "rb" in s or "ribu" in s or s.endswith("k"):
        multiplier = 1000
    elif "jt" in s or "juta" in s:
        multiplier = 1_000_000
    digits = re.sub(r"[^\d]", "", s)
    if not digits:
        return 0
    return int(digits) * multiplier


def _guess_discount(title: str) -> tuple[str, float]:
    """Coba detect discount type + value dari article title.

    Returns: (discount_type, discount_value)
    Default: ("fixed", 0) kalau gak ke-detect.
    """
    if _FREE_SHIPPING_RE.search(title):
        return ("free_shipping", 0)

    pct_match = _PERCENT_RE.search(title)
    if pct_match:
        try:
            return ("percent", float(pct_match.group(1).replace(",", ".")))
        except ValueError:
            pass

    rp_match = _RUPIAH_RE.search(title)
    if rp_match:
        value = _parse_rupiah_to_int(rp_match.group(1))
        if value > 0:
            disc_type = "cashback" if _CASHBACK_RE.search(title) else "fixed"
            return (disc_type, float(value))

    return ("fixed", 0)


def _clean_title(title: str) -> str:
    """Bersihin title dari ' - SourceName' suffix Google News."""
    # Pattern: "...title... - Source Name"
    parts = title.rsplit(" - ", 1)
    if len(parts) == 2 and len(parts[1]) < 50:
        return parts[0].strip()
    return title.strip()


def _extract_source_name(title: str) -> str | None:
    """Extract publisher dari ' - Tirto.id' suffix."""
    parts = title.rsplit(" - ", 1)
    if len(parts) == 2 and len(parts[1]) < 50:
        return parts[1].strip()
    return None


class GoogleNewsPromoScraper(BaseScraper):
    """Aggregator news kupon/promo Indonesia via Google News RSS."""

    target_id = "google_news_promo"
    merchant_slug = "multi"
    name = "Google News Indonesia Promo Aggregator"
    interval_minutes = 60  # update tiap 1 jam
    tier = "public"
    url = "https://news.google.com/rss/search"

    # Cap jumlah item per merchant biar gak bloat DB
    MAX_ITEMS_PER_MERCHANT = 5

    async def fetch_raw(self) -> dict[str, str]:
        if should_use_mock(self.target_id):
            return _MOCK_DATA

        results: dict[str, str] = {}
        async with httpx.AsyncClient(
            timeout=settings.SCRAPER_TIMEOUT_SECONDS,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; SuperKuponBot/1.0; +https://superkupon.vercel.app)",
                "Accept": "application/rss+xml, application/xml, text/xml",
            },
            follow_redirects=True,
        ) as client:
            for merchant_slug, _cat, query in _QUERIES:
                url = _RSS_BASE.format(q=query)
                try:
                    resp = await client.get(url)
                    if resp.status_code == 200:
                        results[merchant_slug] = resp.text
                    else:
                        logger.warning(
                            f"Google News RSS {merchant_slug}: HTTP {resp.status_code}"
                        )
                except Exception as e:
                    logger.warning(f"Failed fetch {merchant_slug}: {e}")

        logger.info(
            f"Google News fetched: {len(results)}/{len(_QUERIES)} merchant queries"
        )
        return results

    def parse(self, raw: dict[str, str]) -> List[CouponRaw]:
        items: List[CouponRaw] = []

        # Map merchant_slug → category for lookup
        category_map = {m: cat for m, cat, _ in _QUERIES}

        for merchant_slug, xml_text in raw.items():
            try:
                root = ET.fromstring(xml_text)
                count = 0
                for item in root.iter("item"):
                    if count >= self.MAX_ITEMS_PER_MERCHANT:
                        break

                    raw_title = item.findtext("title") or ""
                    link = item.findtext("link") or ""
                    pub_date_str = item.findtext("pubDate")

                    if not raw_title or not link:
                        continue

                    clean_title = _clean_title(raw_title)
                    source = _extract_source_name(raw_title)
                    discount_type, discount_value = _guess_discount(clean_title)

                    description = (
                        f"Sumber: {source}. Klik untuk baca selengkapnya."
                        if source
                        else "Klik link untuk lihat detail promo."
                    )

                    # Parse pubDate (RFC 2822 format)
                    pub_date = None
                    if pub_date_str:
                        try:
                            from email.utils import parsedate_to_datetime
                            pub_date = parsedate_to_datetime(pub_date_str)
                            # Strip tz untuk consistency dgn datetime utcnow di lifecycle
                            if pub_date.tzinfo:
                                pub_date = pub_date.replace(tzinfo=None)
                        except Exception:
                            pass

                    items.append(
                        CouponRaw(
                            code=None,  # Google News doesn't expose codes — user reads article
                            title=clean_title[:240],
                            description=description,
                            discount_type=discount_type,
                            discount_value=discount_value,
                            merchant_slug=merchant_slug,
                            category_slug=category_map.get(merchant_slug),
                            expires_at=None,  # news articles don't expire formally
                            source_url=link,
                            source_target=self.target_id,
                            region="national",
                        )
                    )
                    count += 1
            except ET.ParseError as e:
                logger.warning(f"XML parse error for {merchant_slug}: {e}")
            except Exception as e:
                logger.warning(f"Parse error for {merchant_slug}: {e}")

        logger.info(f"Google News parsed: {len(items)} promo items")
        return items
