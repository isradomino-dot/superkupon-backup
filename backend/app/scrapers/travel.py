"""Travel & entertainment promo — Traveloka, Tiket.com, Klook, Airy.

Sumber legal & publik:
  - Landing promo di website (kategori weekend escape, last minute, dll)
  - Newsletter sign-up (kalau ada feed RSS)
  - Affiliate API via Involve Asia / Travelpayouts
"""
from app.scrapers._factory import make_promo_scraper, days_from_now


_TRAVELOKA = [
    {
        "code": "TRVHOTEL15",
        "title": "Traveloka — Diskon 15% Hotel",
        "description": "Diskon 15% max Rp 250.000 untuk booking hotel di Indonesia. Min nilai Rp 500.000.",
        "discount_type": "percent",
        "discount_value": 15,
        "min_spend": 500000,
        "max_discount": 250000,
        "category_slug": "entertainment",
        "expires_at": days_from_now(28),
        "merchant_slug": "traveloka",
    },
    {
        "code": "TRVFLIGHT8",
        "title": "Traveloka — Diskon 8% Tiket Pesawat Domestik",
        "description": "Diskon hingga Rp 150.000. Berlaku semua maskapai domestik.",
        "discount_type": "percent",
        "discount_value": 8,
        "max_discount": 150000,
        "category_slug": "entertainment",
        "expires_at": days_from_now(14),
        "merchant_slug": "traveloka",
    },
]

_TIKET = [
    {
        "code": "TIKETHOTEL12",
        "title": "Tiket.com — Diskon 12% Booking Hotel",
        "description": "Min booking Rp 400.000. Max diskon Rp 200.000.",
        "discount_type": "percent",
        "discount_value": 12,
        "min_spend": 400000,
        "max_discount": 200000,
        "category_slug": "entertainment",
        "expires_at": days_from_now(21),
        "merchant_slug": "tiket",
    },
]

_KLOOK = [
    {
        "code": "KLOOK10",
        "title": "Klook — Diskon 10% Tiket Atraksi Asia",
        "description": "Diskon 10% min booking Rp 200.000 untuk tiket atraksi Asia (Singapura, Bangkok, Tokyo, dll).",
        "discount_type": "percent",
        "discount_value": 10,
        "min_spend": 200000,
        "max_discount": 100000,
        "category_slug": "entertainment",
        "expires_at": days_from_now(30),
        "merchant_slug": "klook",
        "region": "international",
    },
    {
        "code": "KLOOKID",
        "title": "Klook — Cashback Rp 50.000 Wisata Indonesia",
        "description": "Cashback untuk booking atraksi domestik. Min Rp 300.000.",
        "discount_type": "cashback",
        "discount_value": 50000,
        "min_spend": 300000,
        "category_slug": "entertainment",
        "expires_at": days_from_now(45),
        "merchant_slug": "klook",
    },
]


TravelokaScraper = make_promo_scraper(
    target_id="traveloka_promo",
    merchant_slug="traveloka",
    name="Traveloka — Public Promo",
    url="https://www.traveloka.com/id-id/promotion",
    mock_data=_TRAVELOKA,
    interval_minutes=360,
    category_default="entertainment",
)

TiketComScraper = make_promo_scraper(
    target_id="tiketcom_promo",
    merchant_slug="tiket",
    name="Tiket.com — Public Promo",
    url="https://www.tiket.com/promo",
    mock_data=_TIKET,
    interval_minutes=360,
    category_default="entertainment",
)

KlookScraper = make_promo_scraper(
    target_id="klook_promo",
    merchant_slug="klook",
    name="Klook — Public Promo",
    url="https://www.klook.com/id/promo/",
    mock_data=_KLOOK,
    interval_minutes=360,
    category_default="entertainment",
)
