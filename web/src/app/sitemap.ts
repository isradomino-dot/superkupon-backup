import type { MetadataRoute } from "next";

import { listCategories, listMerchants } from "@/lib/api";
import { couponSlug } from "@/lib/coupon-slug";

const SITE_URL = "https://superkupon.vercel.app";
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://superkupon-backend-production.up.railway.app";

// Force fully dynamic — no cache. Sitemap regen tiap request.
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface CouponSitemapData {
  id: number;
  title?: string | null;
  expires_at?: string | null;
  scraped_at?: string | null;
  merchant?: { name?: string | null } | null;
}

interface FetchDebug {
  status: number | "error";
  error?: string;
  count: number;
}

/**
 * Direct fetch bypass api.ts Next.js cache layer.
 * Return both data + debug info untuk troubleshooting kalau gagal di prod.
 */
async function fetchAllCoupons(): Promise<{
  data: CouponSitemapData[];
  debug: FetchDebug;
}> {
  try {
    // Backend max limit = 200 (per Pydantic validator di /coupons endpoint).
    // Kalau ke depannya kupon > 200, perlu paginasi.
    const url = `${API_BASE}/coupons?limit=200`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return { data: [], debug: { status: res.status, count: 0 } };
    }
    const raw = await res.json();
    let arr: CouponSitemapData[] = [];
    if (Array.isArray(raw)) arr = raw;
    else if (raw && Array.isArray(raw.items)) arr = raw.items;
    return { data: arr, debug: { status: res.status, count: arr.length } };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { data: [], debug: { status: "error", error: msg, count: 0 } };
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "hourly", priority: 1.0 },
    { url: `${SITE_URL}/decide`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/kombo`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/pilihan`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/event`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/mood`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/poster`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/hall-of-fame`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/keranjang`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/install`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/stats`, lastModified: now, changeFrequency: "daily", priority: 0.5 },
    { url: `${SITE_URL}/favorites`, lastModified: now, changeFrequency: "weekly", priority: 0.4 },
    { url: `${SITE_URL}/belanja-hemat`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/tentang`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/privasi`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/syarat`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const [merchants, categories, couponsResult] = await Promise.all([
    listMerchants().catch(() => []),
    listCategories().catch(() => []),
    fetchAllCoupons(),
  ]);

  const merchantRoutes: MetadataRoute.Sitemap = merchants.map((m) => ({
    url: `${SITE_URL}/merchant/${m.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE_URL}/category/${c.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  // Individual coupon URLs — core content untuk SEO discovery.
  // Skip expired coupons biar Google gak indeks halaman invalid.
  // Pakai slugged form via couponSlug() biar URL SEO-friendly:
  // /coupon/{id}-{merchant-slug}-{title-slug}
  const couponRoutes: MetadataRoute.Sitemap = couponsResult.data
    .filter((c) => !c.expires_at || new Date(c.expires_at) > now)
    .map((c) => ({
      url: `${SITE_URL}/coupon/${couponSlug({
        id: c.id,
        title: c.title ?? "",
        merchant: { name: c.merchant?.name ?? "" },
      })}`,
      lastModified: c.scraped_at ? new Date(c.scraped_at) : now,
      changeFrequency: "daily" as const,
      priority: 0.9,
    }));

  // Debug marker — cuma tampil kalau ada masalah fetch (count=0 atau status non-200).
  // Healthy state: sitemap rapi tanpa marker. Broken state: marker auto-appear.
  const isHealthy =
    couponsResult.debug.status === 200 && couponsResult.debug.count > 0;
  const debugRoute: MetadataRoute.Sitemap = isHealthy
    ? []
    : [
        {
          url: `${SITE_URL}/_debug-sitemap-status-${couponsResult.debug.status}-count-${couponsResult.debug.count}${couponsResult.debug.error ? `-err-${encodeURIComponent(couponsResult.debug.error).slice(0, 50)}` : ""}`,
          lastModified: now,
          changeFrequency: "never" as const,
          priority: 0.0,
        },
      ];

  return [
    ...staticRoutes,
    ...merchantRoutes,
    ...categoryRoutes,
    ...couponRoutes,
    ...debugRoute,
  ];
}
