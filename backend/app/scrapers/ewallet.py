"""E-wallet aggregator — GoPay, LinkAja, ShopeePay (selain DANA/OVO yg sudah).

GoPay & LinkAja banyak punya promo merchant partner publik di landing page.
"""
from app.scrapers._factory import make_promo_scraper, days_from_now


_GOPAY = [
    {
        "code": "GOPAY20",
        "title": "GoPay — Diskon 20% Bayar di Merchant Partner",
        "description": "Max diskon Rp 30.000. Berlaku di kategori F&B & lifestyle.",
        "discount_type": "percent",
        "discount_value": 20,
        "max_discount": 30000,
        "category_slug": "food",
        "expires_at": days_from_now(10),
        "merchant_slug": "gopay",
    },
    {
        "code": None,
        "title": "GoPay PayLater — Diskon Bunga 0% 3 Bulan",
        "description": "Cicilan PayLater 3x tanpa bunga untuk pembelian Rp 200rb–2jt.",
        "discount_type": "free_shipping",
        "discount_value": 0,
        "category_slug": "bills",
        "expires_at": days_from_now(30),
        "merchant_slug": "gopay",
    },
]

_LINKAJA = [
    {
        "code": "LINKAJAPLN",
        "title": "LinkAja — Cashback Rp 10.000 Bayar PLN",
        "description": "Min pembayaran PLN Rp 100.000. Berlaku 1x per user per bulan.",
        "discount_type": "cashback",
        "discount_value": 10000,
        "min_spend": 100000,
        "category_slug": "bills",
        "expires_at": days_from_now(14),
        "merchant_slug": "linkaja",
    },
]


GoPayScraper = make_promo_scraper(
    target_id="gopay_promo",
    merchant_slug="gopay",
    name="GoPay — Public Promo",
    url="https://www.gopay.co.id/promo",
    mock_data=_GOPAY,
    interval_minutes=240,
    category_default="bills",
)

LinkAjaScraper = make_promo_scraper(
    target_id="linkaja_promo",
    merchant_slug="linkaja",
    name="LinkAja — Public Promo",
    url="https://www.linkaja.id/promo",
    mock_data=_LINKAJA,
    interval_minutes=240,
    category_default="bills",
)
