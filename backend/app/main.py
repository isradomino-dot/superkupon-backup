import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import init_db
from app.api import coupons, merchants, admin, recon, proxy_admin, stats, i18n as i18n_api, notifications, search as search_api
from app.i18n.middleware import LanguageMiddleware
from app.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} ({settings.APP_ENV})")
    init_db()
    _seed_taxonomy()
    start_scheduler()
    yield
    stop_scheduler()
    logger.info("Shutdown complete")


def _seed_taxonomy() -> None:
    """Seed kategori + merchant standar kalau DB masih kosong."""
    from app.db import SessionLocal
    from app.models import Category, Merchant

    db = SessionLocal()
    try:
        if db.query(Category).count() == 0:
            cats = [
                ("ecommerce", "E-commerce", "shopping-bag"),
                ("fashion", "Fashion", "shirt"),
                ("food", "Makanan & Minuman", "utensils"),
                ("transport", "Transportasi", "car"),
                ("entertainment", "Hiburan", "film"),
                ("bills", "Tagihan & Top-up", "receipt"),
            ]
            for slug, name, icon in cats:
                db.add(Category(slug=slug, name=name, icon=icon))

        seed_merchants = [
            ("shopee", "Shopee", "https://shopee.co.id", "/logos/shopee.png"),
            ("dana", "DANA", "https://www.dana.id", "/logos/dana.png"),
            ("ovo", "OVO", "https://www.ovo.id", "/logos/ovo.png"),
            ("tixid", "Tix ID", "https://www.tix.id", "/logos/tixid.png"),
            ("tokopedia", "Tokopedia", "https://www.tokopedia.com", "/logos/tokopedia.png"),
            ("traveloka", "Traveloka", "https://www.traveloka.com", "/logos/traveloka.png"),
            ("gojek", "Gojek", "https://www.gojek.com", "/logos/gojek.png"),
            ("grab", "Grab", "https://www.grab.com/id", "/logos/grab.png"),
            ("lazada", "Lazada", "https://www.lazada.co.id", "/logos/lazada.png"),
            ("zalora", "Zalora", "https://www.zalora.co.id", "/logos/zalora.png"),
            ("klook", "Klook", "https://www.klook.com", "/logos/klook.png"),
            ("tiket", "Tiket.com", "https://www.tiket.com", "/logos/tiket.png"),
            ("blibli", "Blibli", "https://www.blibli.com", "/logos/blibli.png"),
            ("bukalapak", "Bukalapak", "https://www.bukalapak.com", "/logos/bukalapak.png"),
            ("telkomsel", "Telkomsel", "https://www.telkomsel.com", "/logos/telkomsel.png"),
            ("indosat", "Indosat IM3", "https://im3.indosat.com", "/logos/indosat.png"),
            ("xl", "XL Axiata", "https://www.xl.co.id", "/logos/xl.png"),
            ("bca", "Bank BCA", "https://www.bca.co.id", "/logos/bca.png"),
            ("mandiri", "Bank Mandiri", "https://www.bankmandiri.co.id", "/logos/mandiri.png"),
            ("bri", "Bank BRI", "https://www.bri.co.id", "/logos/bri.png"),
            ("gopay", "GoPay", "https://www.gopay.co.id", "/logos/gopay.png"),
            ("linkaja", "LinkAja", "https://www.linkaja.id", "/logos/linkaja.png"),
        ]
        for slug, name, website, logo in seed_merchants:
            if not db.query(Merchant).filter_by(slug=slug).first():
                db.add(Merchant(slug=slug, name=name, website=website, logo_url=logo))

        db.commit()
    finally:
        db.close()


app = FastAPI(
    title=settings.APP_NAME,
    description="Coupon aggregator API — V1 MVP",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(LanguageMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Language"],
)

app.include_router(coupons.router)
app.include_router(merchants.router)
app.include_router(admin.router)
app.include_router(recon.router)
app.include_router(proxy_admin.router)
app.include_router(stats.router)
app.include_router(i18n_api.router)
app.include_router(notifications.router)
app.include_router(search_api.router)


@app.get("/")
def root():
    return {
        "name": settings.APP_NAME,
        "version": "0.1.0",
        "docs": "/docs",
        "endpoints": {
            "coupons": "/coupons",
            "merchants": "/merchants",
            "categories": "/categories",
            "admin": "/admin",
        },
    }


@app.get("/health")
def health():
    return {"status": "ok"}
