"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { listCoupons, listMerchants, isAbortError } from "@/lib/api";
import type { Coupon, MerchantWithCount } from "@/lib/types";
import { MerchantLogo } from "@/components/MerchantLogo";

/**
 * Merchant Spotlight — featured 1 merchant per session.
 * Rotate setiap kali user buka home (random pick dari top merchants).
 * Shows: hero card with merchant info, top 3 coupons, total stats.
 */
function pickFeatured(merchants: MerchantWithCount[]): MerchantWithCount | null {
  const eligible = merchants.filter((m) => m.coupon_count >= 2);
  if (eligible.length === 0) return null;
  return eligible[Math.floor(Math.random() * Math.min(eligible.length, 8))];
}

export function MerchantSpotlight() {
  const [merchant, setMerchant] = useState<MerchantWithCount | null>(null);
  const [topCoupons, setTopCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    listMerchants({ signal: ctrl.signal })
      .then((all) => {
        if (ctrl.signal.aborted) return null;
        const featured = pickFeatured(all);
        setMerchant(featured);
        return featured;
      })
      .then((featured) => {
        if (!featured || ctrl.signal.aborted) return;
        return listCoupons(
          { merchant: featured.slug, limit: 3, sort: "quality" },
          { signal: ctrl.signal },
        );
      })
      .then((coupons) => {
        if (coupons && !ctrl.signal.aborted) setTopCoupons(coupons);
      })
      .catch((e) => {
        if (!isAbortError(e)) {
          setMerchant(null);
          setTopCoupons([]);
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
  }, []);

  if (loading || !merchant || topCoupons.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/15 via-purple-500/5 to-transparent p-5 sm:p-6 animate-slide-up">
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-full bg-gradient-to-r from-violet-500 to-purple-600 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-md">
          🏪 Merchant Spotlight
        </span>
        <span className="text-xs text-gray-400">Highlight hari ini</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-[auto,1fr] sm:items-center">
        <Link
          href={`/merchant/${merchant.slug}`}
          className="flex items-center gap-3 transition hover:scale-105"
        >
          <div className="flex h-20 w-20 flex-none items-center justify-center rounded-2xl border border-violet-400/40 bg-gradient-to-br from-violet-500/20 to-purple-500/10 p-2 shadow-lg shadow-violet-500/20 sm:h-24 sm:w-24">
            <MerchantLogo merchant={merchant} size={64} rounded="md" />
          </div>
        </Link>

        <div className="min-w-0">
          <Link
            href={`/merchant/${merchant.slug}`}
            className="inline-block hover:underline"
          >
            <h2 className="text-xl font-black text-white sm:text-2xl">{merchant.name}</h2>
          </Link>
          <p className="mt-1 text-sm text-gray-300">
            Punya{" "}
            <span className="font-bold text-violet-300">{merchant.coupon_count} kupon aktif</span>{" "}
            siap dipakai
          </p>
          {merchant.website && (
            <a
              href={merchant.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-xs text-violet-300 hover:underline"
            >
              {merchant.website} ↗
            </a>
          )}

          <Link
            href={`/merchant/${merchant.slug}`}
            className="mt-3 inline-block rounded-full bg-violet-500 px-4 py-1.5 text-xs font-bold text-white shadow transition hover:bg-violet-600"
          >
            Lihat Semua Kupon →
          </Link>
        </div>
      </div>

      {/* Top 3 coupons preview */}
      <div className="mt-5 border-t border-white/5 pt-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
          🔝 Top {topCoupons.length} kupon dari {merchant.name}
        </p>
        <div className="space-y-1.5">
          {topCoupons.map((c, i) => (
            <Link
              key={c.id}
              href={`/coupon/${c.id}`}
              className="group flex items-center gap-2 rounded-lg p-2 transition hover:bg-white/5"
            >
              <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-violet-500/20 text-xs font-bold text-violet-200">
                {i + 1}
              </span>
              <p className="line-clamp-1 flex-1 text-xs text-gray-200 group-hover:text-white">
                {c.title}
              </p>
              {c.code && (
                <code className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-200">
                  {c.code}
                </code>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
