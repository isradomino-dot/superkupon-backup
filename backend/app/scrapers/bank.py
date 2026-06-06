"""Bank promo aggregator — BCA, Mandiri, BRI, BNI.

Bank promo umumnya:
  - Cashback kartu kredit/debit di merchant partner
  - Diskon di marketplace (Shopee/Tokopedia) pakai metode bayar bank tsb
  - Bonus poin / cashback transaksi tertentu
"""
from app.scrapers._factory import make_promo_scraper, days_from_now


_BCA = [
    {
        "title": "BCA Cashback 10% di Shopee",
        "description": "Cashback 10% max Rp 50.000 untuk pembayaran via BCA Virtual Account / OneKlik. Min belanja Rp 100.000.",
        "discount_type": "cashback",
        "discount_value": 10,
        "min_spend": 100000,
        "max_discount": 50000,
        "category_slug": "ecommerce",
        "expires_at": days_from_now(15),
        "merchant_slug": "bca",
    },
    {
        "title": "BCA Diskon Rp 25.000 di Grab Transport",
        "description": "Bayar pakai BCA OneKlik di Grab dapat diskon Rp 25.000. Min trip Rp 75.000.",
        "discount_type": "fixed",
        "discount_value": 25000,
        "min_spend": 75000,
        "category_slug": "transport",
        "expires_at": days_from_now(20),
        "merchant_slug": "bca",
    },
    {
        "title": "BCA Reward x2 Travel — Booking Hotel & Pesawat",
        "description": "Reward poin BCA 2x lipat untuk transaksi Traveloka & Tiket.com via kartu kredit.",
        "discount_type": "cashback",
        "discount_value": 2,
        "category_slug": "entertainment",
        "expires_at": days_from_now(30),
        "merchant_slug": "bca",
    },
]


_MANDIRI = [
    {
        "title": "Mandiri Livin' — Cashback Rp 30.000 Tokopedia",
        "description": "Cashback Rp 30.000 untuk pembayaran via Livin' by Mandiri. Min belanja Rp 150.000.",
        "discount_type": "fixed",
        "discount_value": 30000,
        "min_spend": 150000,
        "category_slug": "ecommerce",
        "expires_at": days_from_now(14),
        "merchant_slug": "mandiri",
    },
    {
        "title": "Mandiri Diskon 15% Tix ID — Tiket Bioskop",
        "description": "Diskon 15% max Rp 25.000 pakai kartu Mandiri di Tix ID.",
        "discount_type": "percent",
        "discount_value": 15,
        "max_discount": 25000,
        "category_slug": "entertainment",
        "expires_at": days_from_now(28),
        "merchant_slug": "mandiri",
    },
]


_BRI = [
    {
        "title": "BRImo — Cashback Rp 15.000 Belanja",
        "description": "Cashback Rp 15.000 untuk transaksi pertama via BRImo. Min belanja Rp 100.000.",
        "discount_type": "fixed",
        "discount_value": 15000,
        "min_spend": 100000,
        "category_slug": "ecommerce",
        "expires_at": days_from_now(10),
        "merchant_slug": "bri",
    },
]


BCAScraper = make_promo_scraper(
    target_id="bca_promo",
    merchant_slug="bca",
    name="BCA — Public Promo",
    url="https://www.bca.co.id/id/individu/sarana/promo",
    mock_data=_BCA,
    interval_minutes=360,
    category_default="ecommerce",
)

MandiriScraper = make_promo_scraper(
    target_id="mandiri_promo",
    merchant_slug="mandiri",
    name="Mandiri Livin' — Public Promo",
    url="https://www.bankmandiri.co.id/promo",
    mock_data=_MANDIRI,
    interval_minutes=360,
    category_default="ecommerce",
)

BRIScraper = make_promo_scraper(
    target_id="bri_promo",
    merchant_slug="bri",
    name="BRI — Public Promo",
    url="https://promo.bri.co.id/",
    mock_data=_BRI,
    interval_minutes=360,
    category_default="ecommerce",
)
