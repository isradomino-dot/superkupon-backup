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
 * PRIORITY 1 — Direct deeplinks dari Involve Asia "Buat Deeplink" generator.
 * Format: invl.me/xxx atau invl.us/xxx (URL pendek pre-generated).
 *
 * Cara nambah: login app.involve.asia → Direktori Advertiser → klik merchant
 * → klik "Promosikan" (biru/ungu) → paste URL target → "Menghasilkan" →
 * copy short URL (invl.me/...) → paste di sini.
 *
 * Catatan: deeplink ini STATIS (1 link per merchant), gak bisa di-tag per kupon.
 * Untuk per-kupon tracking, butuh offer_id (PRIORITY 2 below).
 *
 * Saved permanent di memory: project_coupon_aggregator_affiliate_links.md
 */
const MERCHANT_DEEPLINKS: Record<string, string> = {
  traveloka: "https://invl.me/clnkv8k", // Traveloka ID — 3.47% komisi (approved 2026-06-25)
  trainpal: "https://invl.us/clnkvqt", // TrainPal — 1.4% komisi (instant approve 2026-06-25)
  // Tambah brand baru setelah approved di Involve Asia dashboard:
  // tripcom: "https://invl.me/xxxxx",        // Trip.com 5.60% — pending
  // airalo: "https://invl.me/xxxxx",         // Airalo Codes 14% — pending (HIGHEST)
  // accor: "https://invl.me/xxxxx",          // Accor SE Asia 4.2% — pending
  // malaysia-airlines: "https://invl.me/xxxxx", // 1.4% — pending
  // airasia: "https://invl.me/xxxxx",        // AirAsia Travel 3.5% — pending
  // air-india: "https://invl.me/xxxxx",      // 0.53% + USD 0.91 — pending
  // bangkok-airways: "https://invl.me/xxxxx", // 3.5% — pending
  // hopegoo: "https://invl.me/xxxxx",        // 4% — pending
};

/**
 * PRIORITY 2 — Programmatic offer_id (API style).
 * Map merchant slug → Involve Asia offer_id.
 * Diisi setelah merchant di-approve di dashboard Involve Asia.
 * Slug harus match dengan `merchant.slug` di backend (lowercase).
 *
 * Kelebihan vs PRIORITY 1: bisa per-kupon tracking (sub_id),
 * stats lebih granular di Involve dashboard.
 */
const MERCHANT_OFFER_IDS: Record<string, string> = {
  // PRIORITY merchants (lo udah punya kupon di DB):
  // shopee: "FILL_ME",          // Shopee Indonesia (21 kupon)
  // tokopedia: "FILL_ME",       // Tokopedia (14 kupon)
  // tiket-com: "FILL_ME",       // Tiket.com (10 kupon)
  // grab: "FILL_ME",            // Grab (10 kupon)
  // lazada: "FILL_ME",          // Lazada (9 kupon)
  // blibli: "FILL_ME",          // Blibli (9 kupon)
  // klook: "FILL_ME",           // Klook (2 kupon)
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
 * Strategi 2-tier:
 *   1. Cek MERCHANT_DEEPLINKS dulu (direct deeplink, no env needed)
 *   2. Fallback ke MERCHANT_OFFER_IDS (programmatic, butuh aff_id env)
 *   3. Last resort: original URL (no tracking)
 *
 * @param merchantSlug - Slug merchant (contoh: "shopee", "traveloka")
 * @param originalUrl - URL asli ke merchant (fallback)
 * @param couponId - ID kupon untuk tracking konversi (cuma kepake di tier 2)
 * @returns Affiliate URL atau original URL
 */
export function wrapAffiliateLink(
  merchantSlug: string | undefined,
  originalUrl: string,
  couponId?: string | number,
): string {
  if (!merchantSlug) return originalUrl;

  const slug = merchantSlug.toLowerCase();

  // TIER 1: Direct deeplink (e.g. invl.me/clnkv8k) — no env needed, instant active
  const directDeeplink = MERCHANT_DEEPLINKS[slug];
  if (directDeeplink) {
    return directDeeplink;
  }

  // TIER 2: Programmatic offer_id (per-kupon sub_id tracking)
  const offerId = MERCHANT_OFFER_IDS[slug];
  if (INVOLVE_ASIA_AFF_ID && offerId) {
    const subId = buildSubId(couponId);
    const encodedUrl = encodeURIComponent(originalUrl);
    return `https://invl.io/?offer_id=${offerId}&aff_id=${INVOLVE_ASIA_AFF_ID}&sub_id=${subId}&url=${encodedUrl}`;
  }

  // TIER 3: Fallback — no affiliate config, just visit merchant directly
  return originalUrl;
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
  const hasDeeplinks = Object.keys(MERCHANT_DEEPLINKS).length > 0;
  const hasOfferIds = Boolean(INVOLVE_ASIA_AFF_ID) && Object.keys(MERCHANT_OFFER_IDS).length > 0;
  return hasDeeplinks || hasOfferIds;
}
