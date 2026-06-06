"""Food delivery promo — GoFood, GrabFood, ShopeeFood."""
from app.scrapers._factory import make_promo_scraper, days_from_now


_GOFOOD = [
    {
        "code": "GOFOOD25",
        "title": "GoFood Diskon Rp 25.000",
        "description": "Min order Rp 50.000. Berlaku semua restoran. 2x per hari per user.",
        "discount_type": "fixed",
        "discount_value": 25000,
        "min_spend": 50000,
        "category_slug": "food",
        "expires_at": days_from_now(7),
        "merchant_slug": "gojek",
        "region": "national",
    },
    {
        "code": "GFJKT50",
        "title": "GoFood Jakarta — Diskon Rp 50.000 Restoran SCBD",
        "description": "Khusus restoran area SCBD/Sudirman/Kuningan Jakarta. Min order Rp 100.000.",
        "discount_type": "fixed",
        "discount_value": 50000,
        "min_spend": 100000,
        "category_slug": "food",
        "expires_at": days_from_now(14),
        "merchant_slug": "gojek",
        "region": "jakarta",
    },
    {
        "code": "GFNEW10",
        "title": "Cashback 10% GoFood Pengguna Baru",
        "description": "Min order Rp 40.000. Cashback ke GoPay (max Rp 15.000).",
        "discount_type": "cashback",
        "discount_value": 10,
        "min_spend": 40000,
        "max_discount": 15000,
        "category_slug": "food",
        "expires_at": days_from_now(30),
        "merchant_slug": "gojek",
        "region": "national",
    },
]

_GRABFOOD = [
    {
        "code": "GFKULINER",
        "title": "GrabFood — Diskon 30rb Min 70rb",
        "description": "Berlaku untuk restoran partner lokal. 1x per user per minggu.",
        "discount_type": "fixed",
        "discount_value": 30000,
        "min_spend": 70000,
        "category_slug": "food",
        "expires_at": days_from_now(14),
        "merchant_slug": "grab",
        "region": "national",
    },
    {
        "code": "GRABJKT",
        "title": "GrabFood Jakarta — Diskon Rp 40rb Resto Premium",
        "description": "Promo khusus area Jakarta Pusat & Selatan. Min Rp 80.000.",
        "discount_type": "fixed",
        "discount_value": 40000,
        "min_spend": 80000,
        "category_slug": "food",
        "expires_at": days_from_now(10),
        "merchant_slug": "grab",
        "region": "jakarta",
    },
]

_SHOPEEFOOD = [
    {
        "code": "SPF15K",
        "title": "ShopeeFood — Cashback Rp 15.000 Pertama",
        "description": "Min order Rp 35.000. Cashback ke ShopeePay. 1x per user.",
        "discount_type": "cashback",
        "discount_value": 15000,
        "min_spend": 35000,
        "category_slug": "food",
        "expires_at": days_from_now(21),
        "merchant_slug": "shopee",
    },
]


GoFoodScraper = make_promo_scraper(
    target_id="gofood_promo",
    merchant_slug="gojek",
    name="GoFood — Public Promo",
    url="https://gofood.co.id/promo",
    mock_data=_GOFOOD,
    interval_minutes=180,
    category_default="food",
)

GrabFoodScraper = make_promo_scraper(
    target_id="grabfood_promo",
    merchant_slug="grab",
    name="GrabFood — Public Promo",
    url="https://food.grab.com/id",
    mock_data=_GRABFOOD,
    interval_minutes=180,
    category_default="food",
)

ShopeeFoodScraper = make_promo_scraper(
    target_id="shopeefood_promo",
    merchant_slug="shopee",
    name="ShopeeFood — Public Promo",
    url="https://shopee.co.id/m/shopeefood-promo",
    mock_data=_SHOPEEFOOD,
    interval_minutes=180,
    category_default="food",
)
