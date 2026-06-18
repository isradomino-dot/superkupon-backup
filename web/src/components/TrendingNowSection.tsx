"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getTrendingNow, isAbortError } from "@/lib/api";
import { couponSlug } from "@/lib/coupon-slug";
import type { Coupon } from "@/lib/types";
import { MerchantLogo } from "@/components/MerchantLogo";

/**
 * Live Now Trending — kupon paling banyak di-engage (view + redeem) saat ini.
 * Section di home, di atas Top Picks supaya FOMO duluan.
 */
export function TrendingNowSection() {
  const [items, setItems] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    getTrendingNow(6, { signal: ctrl.signal })
      .then((data) => {
        if (ctrl.signal.aborted) return;
        setItems(data);
      })
      .catch((e) => {
        if (!isAbortError(e)) setItems([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, []);

  if (loading) {
    return (
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-lg font-bold text-white">🔥 Lagi Rame Sekarang</h2>
          <span className="inline-flex h-2 w-2">
            <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
          </span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 w-64 flex-none animate-pulse rounded-xl bg-white/5"
            />
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-lg font-bold text-white">🔥 Lagi Rame Sekarang</h2>
        <span className="relative inline-flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-rose-300">
          LIVE
        </span>
      </div>
      <p className="mb-3 text-xs text-gray-400">
        Kupon paling banyak diklaim user saat ini
      </p>
      <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 snap-x snap-mandatory">
        {items.map((c, idx) => (
          <Link
            key={c.id}
            href={`/coupon/${couponSlug(c)}`}
            className="group flex-none snap-start rounded-xl border border-rose-400/20 bg-gradient-to-br from-rose-500/10 via-orange-500/5 to-transparent p-3 shadow-md transition-all hover:border-rose-400/50 hover:from-rose-500/15"
            style={{ width: "260px" }}
          >
            <div className="flex items-start gap-2">
              <div className="relative">
                <MerchantLogo merchant={c.merchant} size={36} rounded="md" />
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-md">
                  {idx + 1}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-300">
                  {c.merchant.name}
                </p>
                <h3 className="mt-0.5 line-clamp-2 text-xs font-bold text-white">
                  {c.title}
                </h3>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/5 pt-2 text-[10px]">
              <span className="flex items-center gap-1 text-amber-300">
                🔥 {((c.redeem_count ?? 0) * 5 + (c.view_count ?? 0)).toLocaleString("id-ID")}{" "}
                <span className="text-gray-500">poin</span>
              </span>
              <span className="text-gray-500">
                👁 {c.view_count ?? 0} · 💾 {c.redeem_count ?? 0}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
