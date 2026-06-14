/**
 * Affiliate Link Wrapper — Involve Asia
 *
 * Wraps merchant URLs with affiliate tracking when configuration is available.
 * Falls back to original URL when affiliate setup is incomplete.
 *
 * Setup steps (after Involve Asia approval):
 *   1. Set NEXT_PUBLIC_INVOLVE_ASIA_AFF_ID in .env.local + Vercel env
 *   2. Fill MERCHANT_OFFER_IDS map below with offer_id per merchant
 *      (get offer_id from Involve Asia dashboard after merchant approval)
 *   3. Optionally adjust LINK_BUILDER if Involve provides custom tracking URL
 */

const INVOLVE_ASIA_AFF_ID =
  process.env.NEXT_PUBLIC_INVOLVE_ASIA_AFF_ID || "";

/**
 * Map merchant slug → Involve Asia offer_id.
 * Diisi setelah merchant di-approve di dashboard Involve Asia.
 * Slug harus match dengan `merchant.slug` di backend (lowercase).
 */
const MERCHANT_OFFER_IDS: Record<string, string> = {
  // shopee: "12345",
  // tokopedia: "12346",
  // lazada: "12347",
  // traveloka: "12348",
  // tiket: "12349",
  // grab: "12350",
  // gojek: "12351",
  // agoda: "12352",
  // booking: "12353",
};

/**
 * Build sub_id untuk tracking per kupon.
 * Format: sk_<couponId> → bisa di-filter di Involve dashboard
 * untuk lihat kupon mana yang convert tinggi.
 */
function buildSubId(couponId?: string | number): string {
  if (couponId === undefined || couponId === null) return "sk_unknown";
  return `sk_${couponId}`;
}

/**
 * Wrap merchant URL dengan affiliate tracking link.
 *
 * @param merchantSlug - Slug merchant (contoh: "shopee", "tokopedia")
 * @param originalUrl - URL asli ke merchant
 * @param couponId - ID kupon untuk tracking konversi
 * @returns Affiliate URL (kalau config lengkap) atau original URL (fallback)
 */
export function wrapAffiliateLink(
  merchantSlug: string | undefined,
  originalUrl: string,
  couponId?: string | number,
): string {
  if (!merchantSlug) return originalUrl;

  const slug = merchantSlug.toLowerCase();
  const offerId = MERCHANT_OFFER_IDS[slug];

  if (!INVOLVE_ASIA_AFF_ID || !offerId) {
    return originalUrl;
  }

  const subId = buildSubId(couponId);
  const encodedUrl = encodeURIComponent(originalUrl);

  return `https://invl.io/?offer_id=${offerId}&aff_id=${INVOLVE_ASIA_AFF_ID}&sub_id=${subId}&url=${encodedUrl}`;
}

/**
 * Track outbound click ke merchant.
 * Fires event ke Vercel Analytics dan GA4 (kalau di-setup).
 * Call ini di onClick handler tombol "Buka merchant".
 */
export function trackOutbound(
  merchantSlug: string | undefined,
  couponId?: string | number,
): void {
  if (typeof window === "undefined") return;

  const eventData = {
    merchant: merchantSlug || "unknown",
    coupon_id: String(couponId ?? "unknown"),
  };

  const w = window as unknown as {
    va?: (event: string, data: Record<string, unknown>) => void;
    gtag?: (event: string, action: string, params: Record<string, unknown>) => void;
  };

  if (typeof w.va === "function") {
    w.va("event", { name: "outbound_click", data: eventData });
  }

  if (typeof w.gtag === "function") {
    w.gtag("event", "outbound_click", eventData);
  }
}

/**
 * Convenience: wrap + track dalam satu call.
 * Return URL untuk href, plus side-effect tracking.
 */
export function getAffiliateHref(
  merchantSlug: string | undefined,
  originalUrl: string,
  couponId?: string | number,
): string {
  return wrapAffiliateLink(merchantSlug, originalUrl, couponId);
}

export function isAffiliateConfigured(): boolean {
  return Boolean(INVOLVE_ASIA_AFF_ID) && Object.keys(MERCHANT_OFFER_IDS).length > 0;
}
