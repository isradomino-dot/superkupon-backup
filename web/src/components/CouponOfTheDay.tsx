"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getRecommendations, isAbortError, formatDiscount } from "@/lib/api";
import type { Coupon } from "@/lib/types";
import { useI18n } from "@/i18n/provider";
import { MerchantLogo } from "@/components/MerchantLogo";

/**
 * Coupon of the Day — deterministic pick berdasarkan tanggal.
 * Algorithm: ambil top-quality coupons, lalu pilih deterministically
 * pakai date-as-seed sehingga semua user lihat coupon sama tiap hari.
 *
 * Rotation: tiap tengah malam berubah ke kupon lain.
 */
function dayHash(): number {
  const now = new Date();
  // Format: YYYYMMDD as integer seed
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return seed;
}

function pickByDate<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;
  const seed = dayHash();
  const idx = seed % arr.length;
  return arr[idx];
}

function msUntilMidnight(): number {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return tomorrow.getTime() - now.getTime();
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const h = Math.floor(ms / (1000 * 60 * 60));
  const m = Math.floor((ms / (1000 * 60)) % 60);
  const s = Math.floor((ms / 1000) % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function CouponOfTheDay() {
  const { t } = useI18n();
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(msUntilMidnight());

  useEffect(() => {
    const ctrl = new AbortController();
    // Fetch top 30 high-quality, then pick deterministically per date
    getRecommendations({ limit: 30 }, { signal: ctrl.signal })
      .then((items) => {
        if (ctrl.signal.aborted) return;
        // Filter only quality ≥80 dengan kode
        const premium = items.filter((c) => c.quality_score >= 75 && c.code);
        const pool = premium.length > 0 ? premium : items;
        setCoupon(pickByDate(pool));
      })
      .catch((e) => {
        if (!isAbortError(e)) setCoupon(null);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, []);

  // Countdown tiap detik
  useEffect(() => {
    const id = setInterval(() => setCountdown(msUntilMidnight()), 1000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <section className="overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-6 animate-pulse">
        <div className="h-32" />
      </section>
    );
  }

  if (!coupon) return null;

  return (
    <section className="relative overflow-hidden rounded-2xl border-2 border-amber-400/40 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-rose-500/10 p-5 shadow-2xl shadow-amber-500/10 animate-slide-up sm:p-6">
      {/* Decorative gems */}
      <div className="pointer-events-none absolute -right-4 -top-4 text-7xl opacity-20" aria-hidden>
        💎
      </div>
      <div className="pointer-events-none absolute -bottom-4 -left-4 text-6xl opacity-10" aria-hidden>
        ✨
      </div>

      {/* Badge */}
      <div className="relative mb-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-md">
          💎 Coupon of the Day
        </span>
        <span className="text-xs text-amber-200/80">Pilihan terbaik hari ini</span>
      </div>

      <div className="relative grid gap-4 sm:grid-cols-[1fr,auto] sm:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <MerchantLogo merchant={coupon.merchant} size={48} rounded="md" />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-200">
                {coupon.merchant.name}
              </p>
              <h2 className="mt-0.5 line-clamp-2 text-lg font-black text-white sm:text-xl">
                {coupon.title}
              </h2>
            </div>
          </div>

          {coupon.description && (
            <p className="mt-3 line-clamp-2 text-sm text-amber-100/80">
              {coupon.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {coupon.code && (
              <code className="rounded-lg border-2 border-dashed border-amber-300/60 bg-amber-500/20 px-3 py-1.5 font-mono text-sm font-black tracking-wider text-amber-100">
                {coupon.code}
              </code>
            )}
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white">
              ⭐ Quality {coupon.quality_score}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 sm:items-end">
          <div className="rounded-2xl border border-amber-300/40 bg-amber-500/15 px-5 py-3 text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-amber-200">
              Diskon
            </div>
            <div className="mt-0.5 font-black text-white text-2xl sm:text-3xl">
              {formatDiscount(coupon, t)}
            </div>
          </div>
        </div>
      </div>

      <div className="relative mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-amber-300/20 pt-4">
        <div className="flex items-center gap-2 text-xs text-amber-200/80">
          <span className="text-base">⏳</span>
          <span>
            Refresh dalam{" "}
            <span className="font-mono font-black tabular-nums text-amber-100">
              {formatCountdown(countdown)}
            </span>
          </span>
        </div>
        <Link
          href={`/coupon/${coupon.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2 text-sm font-bold text-white shadow-md transition hover:scale-105 hover:shadow-lg"
        >
          Klaim Sekarang →
        </Link>
      </div>
    </section>
  );
}
