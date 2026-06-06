from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional


class MerchantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    slug: str
    name: str
    logo_url: Optional[str] = None
    website: Optional[str] = None


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    slug: str
    name: str
    icon: Optional[str] = None


class CouponOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: Optional[str] = None
    title: str
    description: Optional[str] = None
    discount_type: str
    discount_value: float
    min_spend: Optional[float] = None
    max_discount: Optional[float] = None
    merchant: MerchantOut
    category: Optional[CategoryOut] = None
    expires_at: Optional[datetime] = None
    source_url: Optional[str] = None
    source_target: str
    scraped_at: datetime
    status: str
    quality_score: int = 0
    view_count: int = 0
    redeem_count: int = 0
    region: str = "national"


class CouponRaw(BaseModel):
    """Output mentah dari scraper sebelum normalize."""
    code: Optional[str] = None
    title: str
    description: Optional[str] = None
    discount_type: str = "fixed"
    discount_value: float = 0
    min_spend: Optional[float] = None
    max_discount: Optional[float] = None
    merchant_slug: str
    category_slug: Optional[str] = None
    expires_at: Optional[datetime] = None
    source_url: Optional[str] = None
    source_target: str
    region: str = "national"


class ScrapeLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    target_id: str
    started_at: datetime
    finished_at: Optional[datetime] = None
    status: str
    items_found: int
    items_new: int
    items_updated: int
    error: Optional[str] = None
