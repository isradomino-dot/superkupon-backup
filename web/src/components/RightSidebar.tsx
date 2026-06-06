"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { isAbortError, listCoupons, listMerchants } from "@/lib/api";
import type { Coupon, MerchantWithCount } from "@/lib/types";
import { MerchantLogo } from "@/components/MerchantLogo";

const RECO_KINDS = [
  { key: "flash", emoji: "⚡", title: "Flash Sale Hari Ini", desc: "Kupon dengan diskon terbesar hari ini." },
  { key: "premium", emoji: "👑", title: "Kupon Spesial Member", desc: "Hanya untuk member setia seperti kamu." },
  { key: "new", emoji: "🆕", title: "Kupon Baru", desc: "Kupon terbaru yang baru saja tersedia." },
];

export function RightSidebar() {
  const [topCoupons, setTopCoupons] = useState<Coupon[]>([]);
  const [trending, setTrending] = useState<MerchantWithCount[]>([]);

  useEffect(() => {
    const ctrl = new AbortController();
    Promise.all([
      listCoupons({ sort: "discount", limit: 3 }, { signal: ctrl.signal }).catch((e) => {
        if (!isAbortError(e)) return [] as Coupon[];
        return [] as Coupon[];
      }),
      listMerchants({ signal: ctrl.signal }).catch((e) => {
        if (!isAbortError(e)) return [] as MerchantWithCount[];
        return [] as MerchantWithCount[];
      }),
    ]).then(([cps, ms]) => {
      if (ctrl.signal.aborted) return;
      setTopCoupons(cps ?? []);
      setTrending((ms ?? []).slice(0, 6));
    });
    return () => ctrl.abort();
  }, []);

  return (
    <div className="space-y-4">
      {/* Rekomendasi Untuk Kamu */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
        <h3 className="mb-3 text-sm font-bold text-white">Rekomendasi Untuk Kamu</h3>
        <ul className="space-y-3">
          {RECO_KINDS.map((r, i) => {
            const linkedCoupon = topCoupons[i];
            const href = linkedCoupon ? `/coupon/${linkedCoupon.id}` : "/";
            return (
              <li key={r.key}>
                <Link
                  href={href}
                  className="group flex items-start gap-3 rounded-lg p-2 transition hover:bg-white/5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-lg">
                    {r.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white group-hover:text-brand-200">
                      {r.title}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">{r.desc}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Trending Merchants */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
        <h3 className="mb-3 text-sm font-bold text-white">Trending Merchants</h3>
        {trending.length > 0 ? (
          <ul className="space-y-2">
            {trending.map((m) => (
              <li key={m.slug}>
                <Link
                  href={`/merchant/${m.slug}`}
                  className="group flex items-center gap-3 rounded-lg p-2 transition hover:bg-white/5"
                >
                  <MerchantLogo merchant={m} size={28} rounded="full" />
                  <span className="flex-1 truncate text-sm font-medium text-gray-200 group-hover:text-white">
                    {m.name}
                  </span>
                  <span className="text-xs text-gray-400">{m.coupon_count} kupon</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="space-y-2">
            {["Shopee", "Tokopedia", "Lazada", "DANA", "TikTok Shop"].map((name, i) => (
              <li
                key={name}
                className="flex items-center gap-3 rounded-lg p-2 text-sm text-gray-300"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/15 text-xs font-bold">
                  {name[0]}
                </span>
                <span className="flex-1 truncate font-medium">{name}</span>
                <span className="text-xs text-gray-500">{10 - i * 2} kupon</span>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/?sort=popular"
          className="mt-3 block text-center text-xs font-medium text-brand-300 hover:text-brand-200"
        >
          Lihat Semua →
        </Link>
      </div>

      {/* Premium Teaser */}
      <div className="relative overflow-hidden rounded-xl border border-brand-400/30 bg-gradient-to-br from-brand-700/40 via-purple-700/30 to-pink-700/20 p-4">
        <div className="absolute right-2 top-2 text-3xl opacity-60" aria-hidden>
          💎
        </div>
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-100">
          Akan Datang
        </div>
        <h3 className="text-sm font-bold text-white">Premium</h3>
        <p className="mt-1.5 text-xs text-gray-200">
          Fitur eksklusif, kupon spesial, dan pengalaman tanpa iklan. Segera hadir!
        </p>
        <button
          type="button"
          className="mt-3 w-full rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/25"
        >
          Gabung Waitlist
        </button>
      </div>
    </div>
  );
}
