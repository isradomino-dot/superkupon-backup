"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { formatDiscount, isAbortError, listCoupons } from "@/lib/api";
import type { Coupon } from "@/lib/types";
import { useI18n } from "@/i18n/provider";
import { useExpiryCountdown } from "@/lib/use-expiry-countdown";
import { MerchantLogo } from "@/components/MerchantLogo";

const CARD_WIDTH = 260;
const FETCH_LIMIT = 12;

export function TopDealsCarousel() {
  const { t } = useI18n();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    listCoupons(
      { sort: "discount", limit: FETCH_LIMIT, min_quality: 70, status: undefined },
      { signal: ctrl.signal },
    )
      .then((data) => {
        if (ctrl.signal.aborted) return;
        // Filter to only percent/cashback-percent (where discount_value is comparable)
        // OR just use all — backend sort by discount handles it
        setCoupons(data);
      })
      .catch((e) => {
        if (!isAbortError(e)) setCoupons([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, []);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 8);
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  const scrollBy = (offset: number) => {
    scrollRef.current?.scrollBy({ left: offset, behavior: "smooth" });
  };

  if (!loading && coupons.length === 0) return null;

  return (
    <section className="space-y-3 rounded-2xl border-2 border-amber-400/20 bg-gradient-to-br from-amber-500/8 via-rose-500/5 to-orange-500/8 p-5 shadow-lg animate-slide-up">
      <header className="flex items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-2xl shadow-md">
            🔥
          </div>
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black text-white">
              Top Deals Hari Ini
              <span className="rounded-full bg-amber-500/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-200">
                Hot
              </span>
            </h2>
            <p className="mt-0.5 text-xs text-gray-300">
              Diskon terbesar yang lagi aktif · sort by discount
            </p>
          </div>
        </div>
      </header>

      <div className="relative">
        {/* Left arrow */}
        {showLeft && !loading && (
          <button
            type="button"
            onClick={() => scrollBy(-(CARD_WIDTH + 12) * 2)}
            aria-label="Scroll left"
            className="absolute -left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-700 bg-gray-900/95 text-lg text-white shadow-xl backdrop-blur transition hover:bg-gray-800 hover:scale-110"
          >
            ←
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-gray-600/40 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-track]:bg-transparent"
        >
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
            : coupons.map((c, i) => (
                <DealCard key={c.id} coupon={c} rank={i + 1} t={t} />
              ))}
        </div>

        {/* Right arrow */}
        {showRight && !loading && coupons.length > 3 && (
          <button
            type="button"
            onClick={() => scrollBy((CARD_WIDTH + 12) * 2)}
            aria-label="Scroll right"
            className="absolute -right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-700 bg-gray-900/95 text-lg text-white shadow-xl backdrop-blur transition hover:bg-gray-800 hover:scale-110"
          >
            →
          </button>
        )}
      </div>
    </section>
  );
}

function DealCard({
  coupon,
  rank,
  t,
}: {
  coupon: Coupon;
  rank: number;
  t: ReturnType<typeof useI18n>["t"];
}) {
  const expiry = useExpiryCountdown(coupon.expires_at);
  const isPercent = coupon.discount_type === "percent";

  return (
    <Link
      href={`/coupon/${coupon.id}`}
      className="group relative flex h-[200px] w-[260px] flex-none snap-start flex-col overflow-hidden rounded-xl border-2 border-gray-700 bg-gray-900/70 shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-amber-400 hover:shadow-2xl hover:shadow-amber-500/20"
      style={{ width: CARD_WIDTH }}
    >
      {/* Rank badge top-left */}
      {rank <= 3 && (
        <div
          className={[
            "absolute left-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black shadow-lg",
            rank === 1
              ? "bg-gradient-to-br from-amber-400 to-orange-500 text-amber-900"
              : rank === 2
                ? "bg-gradient-to-br from-slate-300 to-slate-500 text-slate-900"
                : "bg-gradient-to-br from-amber-700 to-amber-900 text-amber-200",
          ].join(" ")}
        >
          {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
        </div>
      )}

      {/* Top: big discount on colored bg */}
      <div className="relative flex flex-1 items-center justify-center bg-gradient-to-br from-amber-500/15 via-orange-500/15 to-rose-500/15 p-4">
        {/* Decorative blob */}
        <div className="pointer-events-none absolute -right-4 -top-4 text-7xl opacity-10" aria-hidden>
          🎟️
        </div>

        <div className="relative text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
            {isPercent ? "Diskon" : coupon.discount_type === "cashback" ? "Cashback" : "Promo"}
          </div>
          <div
            className={[
              "mt-0.5 font-black leading-none text-white drop-shadow-md",
              isPercent ? "text-5xl" : "text-3xl",
            ].join(" ")}
          >
            {formatDiscount(coupon, t)}
          </div>
          {coupon.max_discount && coupon.max_discount > 0 && isPercent && (
            <div className="mt-1 text-[10px] text-amber-200/80">
              Max Rp {coupon.max_discount.toLocaleString("id-ID")}
            </div>
          )}
        </div>
      </div>

      {/* Bottom: merchant + title + expiry */}
      <div className="border-t border-gray-700 bg-gray-900/80 p-3 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <MerchantLogo merchant={coupon.merchant} size={18} rounded="sm" />
          <span className="truncate text-[11px] font-bold uppercase tracking-wide text-brand-400">
            {coupon.merchant.name}
          </span>
          {coupon.quality_score >= 90 && (
            <span className="ml-auto rounded-full bg-emerald-500/20 px-1.5 py-0 text-[9px] font-bold text-emerald-300">
              ★ {coupon.quality_score}
            </span>
          )}
        </div>

        <p className="line-clamp-1 text-xs font-semibold text-gray-100">{coupon.title}</p>

        <div className="flex items-center justify-between text-[10px]">
          <span
            className={
              expiry.urgency === "critical"
                ? "font-bold text-rose-400 animate-pulse"
                : expiry.urgency === "warning"
                  ? "font-semibold text-amber-400"
                  : "text-gray-500"
            }
          >
            {expiry.urgency === "critical" ? "🔥" : "⏰"}{" "}
            {expiry.isLive ? <span className="font-mono">{expiry.text}</span> : expiry.text}
          </span>
          {coupon.code && (
            <span className="rounded bg-violet-500/20 px-1.5 py-0 font-mono text-[10px] text-violet-300">
              {coupon.code.length > 10 ? coupon.code.slice(0, 8) + "…" : coupon.code}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div
      className="flex h-[200px] flex-none flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-800 animate-pulse"
      style={{ width: CARD_WIDTH }}
    >
      <div className="flex-1 bg-gray-700/40" />
      <div className="space-y-2 border-t border-gray-700 p-3">
        <div className="h-3 w-20 rounded bg-gray-700" />
        <div className="h-3 w-full rounded bg-gray-700" />
        <div className="h-2 w-24 rounded bg-gray-700/60" />
      </div>
    </div>
  );
}
