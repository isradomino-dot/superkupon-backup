from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
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


class ManualCouponIn(BaseModel):
    """Input untuk manual curation endpoint.

    Curator (admin/atasan) udah verify kupon ini works di merchant asli,
    terus add ke DB lewat endpoint /admin/coupons/manual-add.

    Field wajib: code, title, discount_type, discount_value, merchant_slug, source_url.
    expires_at WAJIB ISO format: "2026-06-30T23:59:59" (atau dengan tz: "...Z" / "+07:00").
    """
    code: str  # kupon manual WAJIB ada kode (utama buat user copy-paste)
    title: str
    description: Optional[str] = None
    discount_type: str = "fixed"  # percent | fixed | cashback | bogo | free_shipping
    discount_value: float = 0
    min_spend: Optional[float] = None
    max_discount: Optional[float] = None
    merchant_slug: str  # contoh: "shopee", "tokopedia", "grab", "gojek"
    category_slug: Optional[str] = None  # contoh: "fashion", "food-delivery", "ecommerce"
    expires_at: Optional[datetime] = None
    source_url: str  # URL halaman promo merchant (bukti kupon real)
    region: str = "national"


class ManualCouponBatch(BaseModel):
    """Bulk insert multiple kupon manual sekaligus.

    Contoh body:
    {
      "coupons": [
        {"code": "SHOPEEFASHION99", "title": "...", "merchant_slug": "shopee", ...},
        {"code": "TOKOPED50K", "title": "...", "merchant_slug": "tokopedia", ...}
      ]
    }
    """
    coupons: list[ManualCouponIn]


class ManualCouponResult(BaseModel):
    """Response dari manual-add endpoint."""
    added: int
    updated: int
    skipped: int
    errors: list[str] = []


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


class CouponVoteIn(BaseModel):
    """Body POST /coupons/{id}/vote."""
    value: str  # "works" | "expired"


class CouponVoteResponse(BaseModel):
    """Response GET /coupons/{id}/votes + POST /coupons/{id}/vote.

    Returns 24h rolling counts (older votes excluded — stale signal).
    `archived` true kalau kupon baru saja auto-archived via vote ini.
    """
    coupon_id: int
    works_24h: int
    expired_24h: int
    archived: bool = False


class AdminUserOut(BaseModel):
    """Admin-only view of a member user, includes claim_count aggregate."""
    id: int
    email: str
    username: str
    role: str
    status: str
    created_at: datetime
    last_login_at: Optional[datetime] = None
    claim_count: int = 0  # COUNT(*) from user_claims
    model_config = ConfigDict(from_attributes=True)


class AdminResetPasswordRequest(BaseModel):
    """Body untuk POST /admin/users/{user_id}/reset-password."""
    new_password: str = Field(min_length=6, max_length=128)
