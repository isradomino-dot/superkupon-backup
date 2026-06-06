"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { isAbortError, listCoupons, formatDiscount } from "@/lib/api";
import type { Coupon } from "@/lib/types";
import { useI18n } from "@/i18n/provider";
import { MerchantLogo } from "@/components/MerchantLogo";
import { useExpiryCountdown } from "@/lib/use-expiry-countdown";

export function TopPicksCarousel() {
  const { t } = useI18n();
  const [items, setItems] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    listCoupons({ sort: "quality", limit: 8, min_quality: 70 }, { signal: ctrl.signal })
      .then((list) => {
        if (ctrl.signal.aborted) return;
        setItems(list);
      })
      .catch((e) => {
        if (!isAbortError(e)) setItems([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, []);

  const scroll = (dir: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  if (!loading && items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">
          Top Picks untuk Kamu <span aria-hidden>🔥</span>
        </h2>
        <Link
          href="/?sort=quality"
          className="text-xs font-medium text-brand-300 hover:text-brand-200"
        >
          Lihat Semua →
        </Link>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/70 p-2 backdrop-blur hover:bg-black/90 md:flex"
          aria-label="Scroll kiri"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/70 p-2 backdrop-blur hover:bg-black/90 md:flex"
          aria-label="Scroll kanan"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        <div
          ref={scrollerRef}
          className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
        >
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-44 w-56 shrink-0 animate-pulse rounded-xl border border-white/10 bg-white/5"
                />
              ))
            : items.map((c) => <TopPickCard key={c.id} coupon={c} t={t} />)}
        </div>
      </div>
    </section>
  );
}

function TopPickCard({
  coupon,
  t,
}: {
  coupon: Coupon;
  t: ReturnType<typeof useI18n>["t"];
}) {
  const expiry = useExpiryCountdown(coupon.expires_at);
  return (
    <Link
      href={`/coupon/${coupon.id}`}
      className="group relative w-56 shrink-0 snap-start overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-brand-700/30 via-purple-700/20 to-blue-700/20 p-4 transition hover:-translate-y-0.5 hover:border-brand-400/40 hover:shadow-lg hover:shadow-brand-500/20"
    >
      <div className="flex items-center justify-between">
        <MerchantLogo merchant={coupon.merchant} size={36} rounded="full" />
        <button
          type="button"
          className="rounded-full border border-white/10 bg-white/5 p-1 text-white/60 transition group-hover:text-white"
          aria-label="Detail"
          onClick={(e) => e.preventDefault()}
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-brand-200">
        {coupon.merchant.name}
      </div>

      <div className="mt-1 text-2xl font-black text-white">
        {formatDiscount(coupon, t)}
      </div>

      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-gray-300">
        {coupon.title}
      </p>

      {coupon.code && (
        <div className="mt-3 rounded-md border border-dashed border-white/15 bg-black/30 px-2 py-1 text-center font-mono text-xs font-bold text-white">
          {coupon.code}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
        <span>
          ⏰{" "}
          <span className={expiry.urgency === "critical" ? "text-amber-300" : ""}>
            {expiry.text}
          </span>
        </span>
        <span>{coupon.view_count ?? 0} ▾</span>
      </div>
    </Link>
  );
}
