"use client";

import { useEffect, useState } from "react";

import { isAbortError, listCoupons, formatDiscount } from "@/lib/api";
import type { Coupon } from "@/lib/types";
import { useI18n } from "@/i18n/provider";
import { MerchantLogo } from "@/components/MerchantLogo";
import { SmartLink } from "@/components/SmartLink";
import { useExpiryCountdown } from "@/lib/use-expiry-countdown";
import { couponSlug } from "@/lib/coupon-slug";

/**
 * Top-of-page big featured hero card. Pulls top-quality coupon with highest discount.
 * Falls back gracefully if no good candidate exists.
 */
export function HeroCardSection() {
  const { t } = useI18n();
  const [featured, setFeatured] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    listCoupons({ sort: "discount", limit: 1, min_quality: 80 }, { signal: ctrl.signal })
      .then((list) => {
        if (ctrl.signal.aborted) return;
        setFeatured(list[0] ?? null);
      })
      .catch((e) => {
        if (!isAbortError(e)) setFeatured(null);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, []);

  if (loading) {
    return (
      <section className="overflow-hidden rounded-2xl border-2 border-violet-500/30 bg-gradient-to-br from-violet-900/30 to-blue-900/30 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3">
          <div className="h-48 bg-violet-500/20" />
          <div className="col-span-2 space-y-3 p-6">
            <div className="h-3 w-32 rounded bg-white/10" />
            <div className="h-8 w-3/4 rounded bg-white/10" />
            <div className="h-4 w-full rounded bg-white/10" />
            <div className="h-12 w-full rounded bg-white/10" />
          </div>
        </div>
      </section>
    );
  }

  if (!featured) return null;
  return <HeroCard coupon={featured} t={t} />;
}

function HeroCard({
  coupon,
  t,
}: {
  coupon: Coupon;
  t: ReturnType<typeof useI18n>["t"];
}) {
  const expiry = useExpiryCountdown(coupon.expires_at);
  return (
    <SmartLink
      href={`/coupon/${couponSlug(coupon)}`}
      className="group block overflow-hidden rounded-2xl border-2 border-violet-400/40 bg-gradient-to-br from-violet-700/30 via-purple-700/20 to-blue-700/30 shadow-2xl transition hover:-translate-y-1 hover:shadow-violet-500/30 animate-slide-up"
    >
      <div className="grid grid-cols-1 md:grid-cols-3">
        {/* Left: big discount badge */}
        <div className="relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-violet-500 via-purple-600 to-blue-700 p-6 text-white">
          <div className="absolute -right-6 -top-6 text-7xl opacity-10" aria-hidden>✨</div>
          <div className="absolute -bottom-4 -left-4 text-6xl opacity-10" aria-hidden>🎟️</div>
          <MerchantLogo merchant={coupon.merchant} size={56} rounded="md" className="mb-2 shadow-xl" />
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-100">
            ✨ FEATURED
          </div>
          <div className="mt-1 text-5xl font-black sm:text-6xl">{formatDiscount(coupon, t)}</div>
          {coupon.quality_score >= 90 && (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-400/30 px-2 py-0.5 text-[10px] font-bold text-amber-100">
              ⭐ Quality {coupon.quality_score}
            </div>
          )}
        </div>

        {/* Right: info + CTA */}
        <div className="col-span-2 space-y-3 p-6">
          <div className="text-xs font-bold uppercase tracking-wider text-violet-300">
            {coupon.merchant.name}
            {coupon.category && <> · {coupon.category.name}</>}
          </div>
          <h2 className="text-2xl font-black text-white sm:text-3xl">
            {coupon.title}
          </h2>
          {coupon.description && (
            <p className="line-clamp-2 text-sm text-gray-200">{coupon.description}</p>
          )}

          {coupon.code && (
            <div className="flex items-center gap-2 rounded-lg border-2 border-dashed border-violet-300/60 bg-violet-500/15 p-3">
              <span className="flex-1 font-mono text-lg font-black tracking-wider text-violet-100">
                {coupon.code}
              </span>
              <span className="rounded-md bg-white px-4 py-2 text-sm font-bold text-violet-700 shadow group-hover:bg-violet-50">
                Detail →
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-violet-200">
            <span>
              ⏰{" "}
              <span className={expiry.urgency === "critical" ? "font-bold text-amber-300" : ""}>
                {expiry.text}
              </span>
            </span>
            <span className="text-gray-300">
              {coupon.view_count ?? 0} dilihat · {coupon.redeem_count ?? 0} disalin
            </span>
          </div>
        </div>
      </div>
    </SmartLink>
  );
}
