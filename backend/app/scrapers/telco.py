"""Telco promo aggregator — Telkomsel, Indosat, XL, Tri, Smartfren.

Sumber publik biasanya:
  - Landing promo di website operator
  - In-app "Promo" tab via API publik
  - Channel Telegram resmi @TelkomselOfficial dll.
"""
from app.scrapers._factory import make_promo_scraper, days_from_now


_TELKOMSEL = [
    {
        "code": "TSEL30",
        "title": "Diskon 30% Paket Data Telkomsel",
        "description": "Kuota 25GB Rp 50.000 (normal Rp 75.000). Via MyTelkomsel app.",
        "discount_type": "percent",
        "discount_value": 30,
        "min_spend": 50000,
        "max_discount": 25000,
        "category_slug": "bills",
        "expires_at": days_from_now(14),
        "merchant_slug": "telkomsel",
    },
    {
        "code": "TSELPULSA10",
        "title": "Cashback Rp 10.000 Pulsa Telkomsel",
        "description": "Min pembelian pulsa Rp 50.000 via DANA / GoPay.",
        "discount_type": "cashback",
        "discount_value": 10000,
        "min_spend": 50000,
        "category_slug": "bills",
        "expires_at": days_from_now(7),
        "merchant_slug": "telkomsel",
    },
]


_INDOSAT = [
    {
        "code": "IM3FUN",
        "title": "Indosat IM3 — Freedom Internet 20GB Rp 55.000",
        "description": "Promo hemat untuk pengguna baru. Berlaku 30 hari.",
        "discount_type": "fixed",
        "discount_value": 20000,
        "category_slug": "bills",
        "expires_at": days_from_now(20),
        "merchant_slug": "indosat",
    },
]


_XL = [
    {
        "code": "XLAXIS5K",
        "title": "Cashback Rp 5.000 Top-up XL Axiata",
        "description": "Top-up min Rp 50.000. Berlaku via OVO & ShopeePay.",
        "discount_type": "cashback",
        "discount_value": 5000,
        "min_spend": 50000,
        "category_slug": "bills",
        "expires_at": days_from_now(10),
        "merchant_slug": "xl",
    },
]


TelkomselScraper = make_promo_scraper(
    target_id="telkomsel_promo",
    merchant_slug="telkomsel",
    name="Telkomsel — Public Promo",
    url="https://www.telkomsel.com/promo",
    mock_data=_TELKOMSEL,
    interval_minutes=240,
    category_default="bills",
)

IndosatScraper = make_promo_scraper(
    target_id="indosat_promo",
    merchant_slug="indosat",
    name="Indosat IM3 — Public Promo",
    url="https://im3.indosat.com/promo",
    mock_data=_INDOSAT,
    interval_minutes=240,
    category_default="bills",
)

XLScraper = make_promo_scraper(
    target_id="xl_promo",
    merchant_slug="xl",
    name="XL Axiata — Public Promo",
    url="https://www.xl.co.id/promo",
    mock_data=_XL,
    interval_minutes=240,
    category_default="bills",
)
