export interface Merchant {
  id: number;
  slug: string;
  name: string;
  logo_url?: string | null;
  website?: string | null;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  icon?: string | null;
}

export interface Coupon {
  id: number;
  code?: string | null;
  title: string;
  description?: string | null;
  discount_type:
    | "percent"
    | "fixed"
    | "cashback"
    | "bogo"
    | "free_shipping"
    | string;
  discount_value: number;
  min_spend?: number | null;
  max_discount?: number | null;
  merchant: Merchant;
  category?: Category | null;
  expires_at?: string | null;
  source_url?: string | null;
  source_target: string;
  scraped_at: string;
  status: string;
}

export interface MerchantWithCount extends Merchant {
  coupon_count: number;
}
