/**
 * Unified Analytics Helper — kirim event ke semua tracker yang aktif.
 *
 * Trackers yang di-support:
 * - Google Analytics 4 (window.gtag)
 * - Microsoft Clarity (window.clarity)
 * - Vercel Analytics (window.va)
 *
 * Pakai pattern:
 *   import { trackEvent } from "@/lib/analytics";
 *   trackEvent("coupon_click", { coupon_id: 123, merchant: "shopee" });
 *
 * Atau pake convenience helpers (lebih readable):
 *   trackCouponClick(123, "shopee");
 *   trackCopyCode(123, "DISC50");
 *   trackOutboundClick("shopee", 123);
 */

type EventParams = Record<string, string | number | boolean | undefined>;

interface AnalyticsWindow {
  gtag?: (event: string, action: string, params: EventParams) => void;
  clarity?: (event: string, name: string, data?: EventParams) => void;
  va?: (event: string, data: { name: string; data: EventParams }) => void;
}

/**
 * Track event ke semua active analytics tools.
 * Safe untuk dipanggil dari client component — auto-skip kalau gak ada window.
 */
export function trackEvent(name: string, params: EventParams = {}): void {
  if (typeof window === "undefined") return;

  const w = window as unknown as AnalyticsWindow;

  // Google Analytics 4 — primary tracker
  if (typeof w.gtag === "function") {
    try {
      w.gtag("event", name, params);
    } catch {
      // ignore — analytics jangan crash app
    }
  }

  // Microsoft Clarity — custom event tag (untuk filter session recording)
  if (typeof w.clarity === "function") {
    try {
      w.clarity("event", name);
    } catch {
      // ignore
    }
  }

  // Vercel Analytics — built-in event tracking
  if (typeof w.va === "function") {
    try {
      w.va("event", { name, data: params });
    } catch {
      // ignore
    }
  }
}

// ============================================================
// Convenience helpers — typed, readable, consistent naming
// ============================================================

/** User klik kupon card di list/grid. */
export function trackCouponClick(
  couponId: number | string,
  merchant?: string,
): void {
  trackEvent("coupon_click", {
    coupon_id: String(couponId),
    merchant: merchant ?? "unknown",
  });
}

/** User copy kode kupon (Salin button). */
export function trackCopyCode(
  couponId: number | string,
  code: string,
  merchant?: string,
): void {
  trackEvent("copy_code", {
    coupon_id: String(couponId),
    code,
    merchant: merchant ?? "unknown",
  });
}

/** User klik tombol Pakai di Merchant (outbound link). */
export function trackOutboundClick(
  merchantSlug: string | undefined,
  couponId?: number | string,
): void {
  trackEvent("outbound_click", {
    merchant: merchantSlug ?? "unknown",
    coupon_id: String(couponId ?? "unknown"),
  });
}

/** User pakai Smart Pick tool. */
export function trackSmartPick(category: string, nominal?: number): void {
  trackEvent("smart_pick_used", {
    category,
    nominal: nominal ?? 0,
  });
}

/** User pakai Cart Calculator. */
export function trackCartCalculator(
  cartTotal: number,
  couponCount: number,
): void {
  trackEvent("cart_calculator_used", {
    cart_total: cartTotal,
    coupon_count: couponCount,
  });
}

/** User redeem button click (track interest, not just view). */
export function trackRedeemIntent(
  couponId: number | string,
  merchant?: string,
): void {
  trackEvent("redeem_intent", {
    coupon_id: String(couponId),
    merchant: merchant ?? "unknown",
  });
}

/** User favorite/unfavorite kupon. */
export function trackFavorite(
  couponId: number | string,
  action: "add" | "remove",
): void {
  trackEvent("favorite_toggle", {
    coupon_id: String(couponId),
    action,
  });
}

/** Search query di-submit. */
export function trackSearch(query: string, resultCount?: number): void {
  trackEvent("search", {
    query: query.slice(0, 100), // cap biar gak overly long
    result_count: resultCount ?? 0,
  });
}

/** Share button diklik (WhatsApp, copy link, dll). */
export function trackShare(
  couponId: number | string,
  channel: string,
): void {
  trackEvent("share", {
    coupon_id: String(couponId),
    channel,
  });
}
