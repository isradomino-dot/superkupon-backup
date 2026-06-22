import type { Coupon, Merchant, Category, MerchantWithCount } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001";

export interface FetchOptions {
  lang?: string;
  signal?: AbortSignal;
}

async function get<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const headers: HeadersInit = {};
  if (opts.lang) headers["Accept-Language"] = opts.lang;

  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    signal: opts.signal,
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${path}`);
  }
  return res.json();
}

export interface CouponFilters {
  merchant?: string;
  category?: string;
  q?: string;
  limit?: number;
  offset?: number;
  min_quality?: number;
  sort?: "newest" | "popular" | "discount" | "expiring" | "quality";
  discount_type?: string;
  min_discount?: number;
  region?: string;
}

export async function listCoupons(
  filters: CouponFilters = {},
  opts: FetchOptions = {},
): Promise<Coupon[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  });
  return get<Coupon[]>(`/coupons?${params.toString()}`, opts);
}

export async function getCoupon(id: number, opts: FetchOptions = {}): Promise<Coupon> {
  return get<Coupon>(`/coupons/${id}`, opts);
}

export async function listMerchants(opts: FetchOptions = {}): Promise<MerchantWithCount[]> {
  return get<MerchantWithCount[]>(`/merchants-with-counts`, opts);
}

export async function getMerchant(slug: string, opts: FetchOptions = {}): Promise<Merchant> {
  return get<Merchant>(`/merchants/${slug}`, opts);
}

export interface MerchantStatsResponse {
  merchant: Merchant;
  summary: {
    total_active: number;
    expiring_soon_7d: number;
    excellent_quality: number;
    avg_quality_score: number;
    max_discount_value: number;
    total_views: number;
    total_redeems: number;
  };
  by_discount_type: { type: string; count: number }[];
  by_category: { slug: string; name: string; count: number }[];
  top_by_discount: Coupon[];
}

export async function getMerchantStats(
  slug: string,
  opts: FetchOptions = {},
): Promise<MerchantStatsResponse> {
  return get<MerchantStatsResponse>(`/merchants/${slug}/stats`, opts);
}

export async function listCategories(opts: FetchOptions = {}): Promise<Category[]> {
  return get<Category[]>(`/categories`, opts);
}

export async function getCouponsByIds(
  ids: number[],
  opts: FetchOptions = {},
): Promise<Coupon[]> {
  if (ids.length === 0) return [];
  const csv = ids.join(",");
  return get<Coupon[]>(`/coupons/by-ids?ids=${encodeURIComponent(csv)}`, opts);
}

export interface AutocompleteResponse {
  query: string;
  merchants: { slug: string; name: string; count: number }[];
  categories: { slug: string; name: string; count: number }[];
  codes: {
    id: number;
    code: string | null;
    title: string;
    merchant_slug: string | null;
    merchant_name: string | null;
  }[];
}

export async function getAutocomplete(
  q: string,
  opts: FetchOptions = {},
): Promise<AutocompleteResponse> {
  return get<AutocompleteResponse>(
    `/search/autocomplete?q=${encodeURIComponent(q)}&limit_per_type=5`,
    opts,
  );
}

export async function getTrendingNow(
  limit = 8,
  opts: FetchOptions = {},
): Promise<Coupon[]> {
  return get<Coupon[]>(`/coupons/trending/now?limit=${limit}`, opts);
}

export async function getRecommendations(
  filters: {
    category?: string;
    merchant?: string;
    limit?: number;
  } = {},
  opts: FetchOptions = {},
): Promise<Coupon[]> {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.merchant) params.set("merchant", filters.merchant);
  if (filters.limit) params.set("limit", String(filters.limit));
  return get<Coupon[]>(`/search/recommendations?${params.toString()}`, opts);
}

/**
 * Fire-and-forget — never throws, no abort needed.
 */
export async function trackView(id: number): Promise<void> {
  try {
    await fetch(`${API_BASE}/coupons/${id}/view`, { method: "POST" });
  } catch {}
}

export async function trackRedeem(id: number): Promise<void> {
  try {
    await fetch(`${API_BASE}/coupons/${id}/redeem`, { method: "POST" });
  } catch {}
}

export interface CouponVoteCounts {
  coupon_id: number;
  works_24h: number;
  expired_24h: number;
  archived: boolean;
}

export async function voteCoupon(
  id: number,
  value: "works" | "expired",
): Promise<CouponVoteCounts | null> {
  try {
    const r = await fetch(`${API_BASE}/coupons/${id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    if (!r.ok) return null;
    return (await r.json()) as CouponVoteCounts;
  } catch {
    return null;
  }
}

export async function getCouponVotes(
  id: number,
  opts: FetchOptions = {},
): Promise<CouponVoteCounts | null> {
  try {
    return await get<CouponVoteCounts>(`/coupons/${id}/votes`, opts);
  } catch {
    return null;
  }
}

/**
 * Helper: identify AbortError so callers can swallow it silently.
 */
export function isAbortError(e: unknown): boolean {
  return e instanceof Error && (e.name === "AbortError" || e.name === "DOMException");
}

type DiscountVars = Record<string, string | number>;
type Translate = (key: string, vars?: DiscountVars) => string;

export function formatDiscount(c: Coupon, t?: Translate): string {
  const tr: Translate =
    t ??
    ((key, vars) => {
      const fallback: Record<string, string> = {
        "coupon.discount_percent": `${vars?.value ?? 0}%`,
        "coupon.discount_fixed": `Rp ${vars?.value ?? 0}`,
        "coupon.discount_cashback_pct": `Cashback ${vars?.value ?? 0}%`,
        "coupon.discount_cashback_amount": `Cashback Rp ${vars?.value ?? 0}`,
        "coupon.discount_free_shipping": "Gratis Ongkir",
        "coupon.discount_bogo": "Buy 1 Get 1",
        "coupon.discount_generic": "Promo",
      };
      return fallback[key] ?? key;
    });

  if (
    (!c.discount_value || c.discount_value <= 0) &&
    c.discount_type !== "free_shipping" &&
    c.discount_type !== "bogo"
  ) {
    return tr("coupon.discount_generic");
  }

  const num = c.discount_value.toLocaleString("id-ID");
  switch (c.discount_type) {
    case "percent":
      return tr("coupon.discount_percent", { value: c.discount_value });
    case "fixed":
      return tr("coupon.discount_fixed", { value: num });
    case "cashback":
      return c.discount_value < 100
        ? tr("coupon.discount_cashback_pct", { value: c.discount_value })
        : tr("coupon.discount_cashback_amount", { value: num });
    case "free_shipping":
      return tr("coupon.discount_free_shipping");
    case "bogo":
      return tr("coupon.discount_bogo");
    default:
      return c.discount_value > 0 ? tr("coupon.discount_fixed", { value: num }) : tr("coupon.discount_generic");
  }
}

export function formatExpiry(iso?: string | null, t?: Translate): string {
  const tr: Translate =
    t ??
    ((key, vars) => {
      const fallback: Record<string, string> = {
        "coupon.no_expiry": "Tanpa batas waktu",
        "coupon.expired": "Sudah berakhir",
        "coupon.expires_today": "Berakhir hari ini",
        "coupon.expires_in_days": `${vars?.n ?? 0} hari lagi`,
      };
      return fallback[key] ?? key;
    });

  if (!iso) return tr("coupon.no_expiry");
  const d = new Date(iso);
  const now = new Date();
  // Use floor for accurate countdown: 2.83 days remaining → "2 hari lagi" (not "3").
  // Ceil bikin user bingung kenapa "3 hari lagi" gak pernah turun ke "2".
  const diffDays = Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return tr("coupon.expired");
  if (diffDays === 0) return tr("coupon.expires_today");
  if (diffDays <= 7) return tr("coupon.expires_in_days", { n: diffDays });
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}
