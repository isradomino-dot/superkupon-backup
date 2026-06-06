"""Translation catalog — server-side strings + category/merchant display names.

Supported languages:
  - id (Indonesian, default)
  - en (English)
  - ms (Malay)

Untuk frontend client strings: gunakan dictionary di web/src/i18n + mobile/src/i18n
sehingga tidak roundtrip API tiap render.
"""
from __future__ import annotations

from typing import Any

DEFAULT_LANG = "id"
AVAILABLE_LANGS = ("id", "en", "ms")


CATALOG: dict[str, dict[str, str]] = {
    "id": {
        "site.name": "SuperKupon",
        "site.tagline": "Kumpulan kupon digital Indonesia",
        "ui.search.placeholder": "Cari kupon, merchant, atau kode...",
        "ui.search.button": "Cari",
        "ui.coupon.copy": "Salin",
        "ui.coupon.copied": "Tersalin!",
        "ui.coupon.expires_no_limit": "Tanpa batas waktu",
        "ui.coupon.expires_today": "Berakhir hari ini",
        "ui.coupon.expired": "Sudah berakhir",
        "ui.coupon.expires_in_days": "{n} hari lagi",
        "ui.filter.sort.newest": "Terbaru",
        "ui.filter.sort.popular": "Terpopuler",
        "ui.filter.sort.expiring": "Hampir berakhir",
        "ui.filter.sort.quality": "Kualitas terbaik",
        "ui.filter.quality": "Min. kualitas",
        "ui.filter.all_merchants": "Semua merchant",
        "ui.filter.all_categories": "Semua kategori",
        "ui.section.merchants": "Merchant",
        "ui.section.latest_coupons": "Kupon terbaru",
        "ui.empty.no_coupons": "Belum ada kupon",
        "ui.error.backend_unreachable": "Gagal terhubung ke backend",
        "footer.disclaimer": "Kupon di-aggregate dari halaman promo publik & channel resmi merchant. Validitas dapat berubah sewaktu-waktu.",
        "category.ecommerce": "E-commerce",
        "category.food": "Makanan & Minuman",
        "category.transport": "Transportasi",
        "category.entertainment": "Hiburan",
        "category.bills": "Tagihan & Top-up",
        "discount.free_shipping": "Gratis Ongkir",
        "discount.bogo": "Buy 1 Get 1",
        "discount.percent": "{value}%",
        "discount.cashback_pct": "Cashback {value}%",
        "discount.cashback_amount": "Cashback Rp {value}",
        "discount.fixed": "Rp {value}",
        "discount.generic": "Promo",
    },
    "en": {
        "site.name": "SuperKupon",
        "site.tagline": "Indonesian digital coupon aggregator",
        "ui.search.placeholder": "Search coupons, merchants, or codes...",
        "ui.search.button": "Search",
        "ui.coupon.copy": "Copy",
        "ui.coupon.copied": "Copied!",
        "ui.coupon.expires_no_limit": "No expiry",
        "ui.coupon.expires_today": "Ends today",
        "ui.coupon.expired": "Expired",
        "ui.coupon.expires_in_days": "{n} days left",
        "ui.filter.sort.newest": "Newest",
        "ui.filter.sort.popular": "Most popular",
        "ui.filter.sort.expiring": "Expiring soon",
        "ui.filter.sort.quality": "Highest quality",
        "ui.filter.quality": "Min. quality",
        "ui.filter.all_merchants": "All merchants",
        "ui.filter.all_categories": "All categories",
        "ui.section.merchants": "Merchants",
        "ui.section.latest_coupons": "Latest coupons",
        "ui.empty.no_coupons": "No coupons yet",
        "ui.error.backend_unreachable": "Failed to connect to backend",
        "footer.disclaimer": "Coupons are aggregated from public promo pages & official merchant channels. Validity may change anytime.",
        "category.ecommerce": "E-commerce",
        "category.food": "Food & Beverage",
        "category.transport": "Transportation",
        "category.entertainment": "Entertainment",
        "category.bills": "Bills & Top-up",
        "discount.free_shipping": "Free Shipping",
        "discount.bogo": "Buy 1 Get 1",
        "discount.percent": "{value}%",
        "discount.cashback_pct": "{value}% Cashback",
        "discount.cashback_amount": "Rp {value} Cashback",
        "discount.fixed": "Rp {value}",
        "discount.generic": "Promo",
    },
    "ms": {
        "site.name": "SuperKupon",
        "site.tagline": "Pengagregat kupon digital Indonesia",
        "ui.search.placeholder": "Cari kupon, peniaga, atau kod...",
        "ui.search.button": "Cari",
        "ui.coupon.copy": "Salin",
        "ui.coupon.copied": "Disalin!",
        "ui.coupon.expires_no_limit": "Tiada had masa",
        "ui.coupon.expires_today": "Tamat hari ini",
        "ui.coupon.expired": "Telah tamat",
        "ui.coupon.expires_in_days": "{n} hari lagi",
        "ui.filter.sort.newest": "Terbaru",
        "ui.filter.sort.popular": "Paling popular",
        "ui.filter.sort.expiring": "Hampir tamat",
        "ui.filter.sort.quality": "Kualiti terbaik",
        "ui.filter.quality": "Kualiti min.",
        "ui.filter.all_merchants": "Semua peniaga",
        "ui.filter.all_categories": "Semua kategori",
        "ui.section.merchants": "Peniaga",
        "ui.section.latest_coupons": "Kupon terkini",
        "ui.empty.no_coupons": "Tiada kupon",
        "ui.error.backend_unreachable": "Gagal menyambung ke backend",
        "footer.disclaimer": "Kupon dikumpulkan daripada halaman promosi awam & saluran rasmi peniaga. Kesahihan boleh berubah pada bila-bila masa.",
        "category.ecommerce": "E-dagang",
        "category.food": "Makanan & Minuman",
        "category.transport": "Pengangkutan",
        "category.entertainment": "Hiburan",
        "category.bills": "Bil & Tambah Nilai",
        "discount.free_shipping": "Penghantaran Percuma",
        "discount.bogo": "Beli 1 Percuma 1",
        "discount.percent": "{value}%",
        "discount.cashback_pct": "Pulangan tunai {value}%",
        "discount.cashback_amount": "Pulangan tunai Rp {value}",
        "discount.fixed": "Rp {value}",
        "discount.generic": "Promosi",
    },
}


def translate(key: str, lang: str = DEFAULT_LANG, **kwargs: Any) -> str:
    """Lookup string. Fallback ke default lang kalau key tidak ada di lang tujuan."""
    if lang not in CATALOG:
        lang = DEFAULT_LANG

    val = CATALOG[lang].get(key)
    if val is None:
        val = CATALOG[DEFAULT_LANG].get(key, key)

    if kwargs:
        try:
            return val.format(**kwargs)
        except (KeyError, ValueError):
            return val
    return val


def available_languages() -> list[dict[str, str]]:
    return [
        {"code": "id", "name": "Bahasa Indonesia", "flag": "🇮🇩"},
        {"code": "en", "name": "English", "flag": "🇬🇧"},
        {"code": "ms", "name": "Bahasa Melayu", "flag": "🇲🇾"},
    ]


def parse_accept_language(header: str | None) -> str:
    """Parse Accept-Language header, return best matching lang code."""
    if not header:
        return DEFAULT_LANG

    parts = header.split(",")
    preferences: list[tuple[float, str]] = []
    for part in parts:
        tokens = part.split(";")
        lang = tokens[0].strip().lower().split("-")[0]
        q = 1.0
        for token in tokens[1:]:
            token = token.strip()
            if token.startswith("q="):
                try:
                    q = float(token[2:])
                except ValueError:
                    pass
        preferences.append((q, lang))

    preferences.sort(reverse=True)
    for _q, lang in preferences:
        if lang in AVAILABLE_LANGS:
            return lang

    return DEFAULT_LANG
