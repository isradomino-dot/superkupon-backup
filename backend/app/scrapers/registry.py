from typing import Dict, Type

from app.scrapers.base import BaseScraper
from app.scrapers.shopee import ShopeePromoScraper
from app.scrapers.dana import DanaPromoScraper
from app.scrapers.ovo import OvoPromoScraper
from app.scrapers.tixid import TixidPromoScraper
from app.scrapers.sample_blog import SampleBlogScraper
from app.scrapers.involve_asia import InvolveAsiaScraper
from app.scrapers.shopee_affiliate import ShopeeAffiliateScraper
from app.scrapers.telegram_channel import TelegramChannelScraper
from app.scrapers.google_news import GoogleNewsPromoScraper
from app.scrapers.social_media import SocialMediaScraper
from app.scrapers.telco import TelkomselScraper, IndosatScraper, XLScraper
from app.scrapers.bank import BCAScraper, MandiriScraper, BRIScraper
from app.scrapers.food_delivery import GoFoodScraper, GrabFoodScraper, ShopeeFoodScraper
from app.scrapers.travel import TravelokaScraper, TiketComScraper, KlookScraper
from app.scrapers.ewallet import GoPayScraper, LinkAjaScraper
from app.scrapers.multi_blog import MultiBlogScraper


_ALL_SCRAPERS = [
    ShopeePromoScraper,
    DanaPromoScraper,
    OvoPromoScraper,
    TixidPromoScraper,
    SampleBlogScraper,
    InvolveAsiaScraper,
    ShopeeAffiliateScraper,
    TelegramChannelScraper,
    GoogleNewsPromoScraper,
    SocialMediaScraper,
    TelkomselScraper,
    IndosatScraper,
    XLScraper,
    BCAScraper,
    MandiriScraper,
    BRIScraper,
    GoFoodScraper,
    GrabFoodScraper,
    ShopeeFoodScraper,
    TravelokaScraper,
    TiketComScraper,
    KlookScraper,
    GoPayScraper,
    LinkAjaScraper,
    MultiBlogScraper,
]


REGISTRY: Dict[str, Type[BaseScraper]] = {cls.target_id: cls for cls in _ALL_SCRAPERS}


def all_scrapers() -> list[BaseScraper]:
    return [cls() for cls in REGISTRY.values() if cls.enabled]


def get_scraper(target_id: str) -> BaseScraper | None:
    cls = REGISTRY.get(target_id)
    return cls() if cls else None
