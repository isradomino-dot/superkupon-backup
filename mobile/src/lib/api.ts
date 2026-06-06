import Constants from "expo-constants";
import type {
  Coupon,
  Merchant,
  Category,
  MerchantWithCount,
} from "./types";

const API_BASE =
  (Constants.expoConfig?.extra as { apiBase?: string })?.apiBase ??
  "http://10.0.2.2:8000";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${path}`);
  }
  return res.json();
}

export interface CouponFilters {
  merchant?: string;
  category?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export async function listCoupons(filters: CouponFilters = {}): Promise<Coupon[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  });
  return get<Coupon[]>(`/coupons?${params.toString()}`);
}

export async function getCoupon(id: number): Promise<Coupon> {
  return get<Coupon>(`/coupons/${id}`);
}

export async function listMerchants(): Promise<MerchantWithCount[]> {
  return get<MerchantWithCount[]>(`/merchants-with-counts`);
}

export async function getMerchant(slug: string): Promise<Merchant> {
  return get<Merchant>(`/merchants/${slug}`);
}

export async function listCategories(): Promise<Category[]> {
  return get<Category[]>(`/categories`);
}

export function formatDiscount(c: Coupon): string {
  switch (c.discount_type) {
    case "percent":
      return `${c.discount_value}%`;
    case "fixed":
      return `Rp ${c.discount_value.toLocaleString("id-ID")}`;
    case "cashback":
      return c.discount_value < 100
        ? `Cashback ${c.discount_value}%`
        : `Cashback Rp ${c.discount_value.toLocaleString("id-ID")}`;
    case "free_shipping":
      return "Gratis Ongkir";
    case "bogo":
      return "Buy 1 Get 1";
    default:
      return c.discount_value > 0
        ? `Rp ${c.discount_value.toLocaleString("id-ID")}`
        : "Promo";
  }
}

export function formatExpiry(iso?: string | null): string {
  if (!iso) return "Tanpa batas";
  const d = new Date(iso);
  const diff = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "Berakhir";
  if (diff === 0) return "Hari ini";
  if (diff <= 7) return `${diff} hari lagi`;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
