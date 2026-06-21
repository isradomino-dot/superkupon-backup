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
  // PRIORITY merchants (lo udah punya kupon di DB):
  // shopee: "FILL_ME",          // Shopee Indonesia (21 kupon)
  // tokopedia: "FILL_ME",       // Tokopedia (14 kupon)
  // tiket-com: "FILL_ME",       // Tiket.com (10 kupon)
  // grab: "FILL_ME",            // Grab (10 kupon)
  // traveloka: "FILL_ME",       // Traveloka (10 kupon)
  // lazada: "FILL_ME",          // Lazada (9 kupon)
  // blibli: "FILL_ME",          // Blibli (9 kupon)
  // klook: "FILL_ME",           // Klook (2 kupon)

  // FEATURED OFFERS (instant-approve di Involve dashboard):
  // tiktok-shop: "FILL_ME",     // TikTok Shop ID (47% commission)
  // wegic: "FILL_ME",           // Wegic AI (31.5% commission)
  // ninja-wifi: "FILL_ME",      // Ninja Wifi (7% commission)
  //
  // Pas dapet offer_id real dari Involve dashboard:
  // 1. Uncomment baris di atas
  // 2. Ganti "FILL_ME" dengan offer_id (digit-digit doang, e.g. "12345")
  // 3. Commit + push -> Vercel auto-deploy
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
 * Re-export dari @/lib/analytics buat backward compat — actual impl di analytics.ts
 * (centralized tracking ke GA4 + Clarity + Vercel Analytics).
 */
export { trackOutboundClick as trackOutbound } from "./analytics";

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
