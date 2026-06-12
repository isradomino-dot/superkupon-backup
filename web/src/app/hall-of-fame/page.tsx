"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { listCoupons, formatDiscount, isAbortError } from "@/lib/api";
import type { Coupon } from "@/lib/types";
import { useI18n } from "@/i18n/provider";
import { MerchantLogo } from "@/components/MerchantLogo";

export const dynamic = "force-dynamic";

type FilterId = "all" | "month" | "fixed" | "percent" | "cashback";

const FILTERS: { id: FilterId; label: string; emoji: string }[] = [
  { id: "all", label: "All-Time Greatest", emoji: "🏆" },
  { id: "month", label: "Bulan Ini", emoji: "📅" },
  { id: "fixed", label: "Discount Rupiah", emoji: "💵" },
  { id: "percent", label: "Discount Persen", emoji: "📉" },
  { id: "cashback", label: "Cashback Tertinggi", emoji: "💰" },
];

interface ScoredCoupon {
  coupon: Coupon;
  score: number;
  hallmark: string;
}

function calcHallmarkScore(c: Coupon): { score: number; hallmark: string } {
  let score = 0;
  let hallmark = "";

  if (c.discount_type === "percent") {
    score = c.discount_value * 100;
    if (c.max_discount) score += c.max_discount * 0.001;
    hallmark = `${c.discount_value}% off`;
  } else if (c.discount_type === "fixed") {
    score = c.discount_value * 0.5;
    hallmark = `Rp ${c.discount_value.toLocaleString("id-ID")} off`;
  } else if (c.discount_type === "cashback") {
    if (c.discount_value > 100) {
      score = c.discount_value * 0.7;
      hallmark = `Cashback Rp ${c.discount_value.toLocaleString("id-ID")}`;
    } else {
      score = c.discount_value * 80;
      hallmark = `${c.discount_value}% cashback`;
    }
  } else if (c.discount_type === "free_shipping") {
    score = (c.max_discount ?? 25000) * 0.3;
    hallmark = `Gratis ongkir Rp ${(c.max_discount ?? 25000).toLocaleString("id-ID")}`;
  } else if (c.discount_type === "bogo") {
    score = 8000;
    hallmark = "Buy 1 Get 1";
  }

  // Quality boost
  score += c.quality_score * 30;
  return { score, hallmark };
}

export default function HallOfFamePage() {
  const { t } = useI18n();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [filter, setFilter] = useState<FilterId>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    listCoupons({ sort: "quality", limit: 200 }, { signal: ctrl.signal })
      .then((c) => {
        if (!ctrl.signal.aborted) setCoupons(c);
      })
      .catch((e) => {
        if (!isAbortError(e)) setCoupons([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, []);

  const ranked = useMemo<ScoredCoupon[]>(() => {
    let pool = [...coupons];

    // Apply filter
    if (filter === "month") {
      const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      pool = pool.filter((c) => new Date(c.scraped_at).getTime() >= monthAgo);
    } else if (filter === "fixed") {
      pool = pool.filter((c) => c.discount_type === "fixed");
    } else if (filter === "percent") {
      pool = pool.filter((c) => c.discount_type === "percent");
    } else if (filter === "cashback") {
      pool = pool.filter((c) => c.discount_type === "cashback");
    }

    return pool
      .map((c) => {
        const { score, hallmark } = calcHallmarkScore(c);
        return { coupon: c, score, hallmark };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }, [coupons, filter]);

  const podium = ranked.slice(0, 3);
  const others = ranked.slice(3);

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/25 via-orange-500/15 to-transparent p-6 sm:p-8 animate-slide-up">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-white sm:text-3xl">
          <span className="text-4xl">🏆</span>
          Hall of Fame Promo
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-300">
          Leaderboard kupon{" "}
          <span className="font-semibold text-amber-300">terbesar sepanjang masa</span>{" "}
          di SuperKupon. Dari diskon paling gede sampai cashback tertinggi — semua
          masuk Hall of Fame.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs text-amber-200">
          💎 Diranking by combined score: discount value + quality score
        </div>
      </header>

      {/* Filter */}
      <section className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={[
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              filter === f.id
                ? "border-amber-400 bg-amber-500/20 text-amber-200"
                : "border-white/10 bg-white/5 text-gray-300 hover:border-amber-400/50",
            ].join(" ")}
          >
            {f.emoji} {f.label}
          </button>
        ))}
      </section>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      ) : ranked.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
          <div className="text-4xl">🤷</div>
          <p className="mt-3 text-sm text-gray-400">
            Belum ada kupon yang masuk Hall of Fame untuk filter ini.
          </p>
        </div>
      ) : (
        <>
          {/* PODIUM — Top 3 */}
          {podium.length > 0 && (
            <section>
              <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-amber-300">
                🥇 The Top 3
              </h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {/* #2 (left) */}
                {podium[1] && (
                  <PodiumCard
                    rank={2}
                    item={podium[1]}
                    t={t}
                    medalColor="from-gray-300 to-gray-500"
                    height="240px"
                  />
                )}
                {/* #1 (center, tallest) */}
                {podium[0] && (
                  <PodiumCard
                    rank={1}
                    item={podium[0]}
                    t={t}
                    medalColor="from-amber-400 to-orange-500"
                    height="280px"
                    isWinner
                  />
                )}
                {/* #3 (right) */}
                {podium[2] && (
                  <PodiumCard
                    rank={3}
                    item={podium[2]}
                    t={t}
                    medalColor="from-amber-700 to-amber-900"
                    height="200px"
                  />
                )}
              </div>
            </section>
          )}

          {/* Rank 4-20 list */}
          {others.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-amber-300">
                💎 Rank #4 — #{ranked.length}
              </h2>
              <div className="space-y-2">
                {others.map((item, i) => (
                  <RankCard
                    key={item.coupon.id}
                    rank={i + 4}
                    item={item}
                    t={t}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* CTA */}
      <section className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 to-transparent p-6 text-center">
        <h2 className="text-base font-bold text-white">
          🎯 Mau cek kupon lain?
        </h2>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link
            href="/decide"
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
          >
            🎯 Smart Pick
          </Link>
          <Link
            href="/event"
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
          >
            📅 Event Calendar
          </Link>
          <Link
            href="/"
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600"
          >
            🏠 Beranda
          </Link>
        </div>
      </section>
    </div>
  );
}

function PodiumCard({
  rank,
  item,
  t,
  medalColor,
  height,
  isWinner,
}: {
  rank: number;
  item: ScoredCoupon;
  t: (k: string, v?: Record<string, string | number>) => string;
  medalColor: string;
  height: string;
  isWinner?: boolean;
}) {
  const { coupon, hallmark } = item;
  return (
    <Link
      href={`/coupon/${coupon.id}`}
      className={[
        "group flex flex-col overflow-hidden rounded-2xl border-2 bg-gradient-to-br from-white/5 to-transparent p-4 transition-all hover:scale-105",
        isWinner
          ? "border-amber-400/60 shadow-2xl shadow-amber-500/30"
          : "border-white/10 hover:border-amber-400/40",
      ].join(" ")}
      style={{ minHeight: height }}
    >
      {/* Medal */}
      <div className="flex items-start justify-between gap-2">
        <div
          className={[
            "flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br text-2xl font-black text-white shadow-lg",
            medalColor,
          ].join(" ")}
        >
          {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
        </div>
        {isWinner && (
          <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-black text-white">
            ⭐ CHAMPION
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <MerchantLogo merchant={coupon.merchant} size={32} rounded="md" />
        <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
          {coupon.merchant.name}
        </span>
      </div>

      <h3 className="mt-2 line-clamp-2 text-sm font-bold text-white sm:text-base">
        {coupon.title}
      </h3>

      <div className="mt-auto pt-3">
        <div className="rounded-lg border border-amber-300/30 bg-amber-500/10 p-3 text-center">
          <p className="text-[10px] font-bold uppercase text-amber-300">{hallmark}</p>
          <p className="mt-1 font-mono text-xl font-black text-amber-100">
            {formatDiscount(coupon, t)}
          </p>
        </div>
        {coupon.code && (
          <code className="mt-2 block rounded bg-white/10 px-2 py-1 text-center font-mono text-[10px] font-bold text-white">
            {coupon.code}
          </code>
        )}
      </div>
    </Link>
  );
}

function RankCard({
  rank,
  item,
  t,
}: {
  rank: number;
  item: ScoredCoupon;
  t: (k: string, v?: Record<string, string | number>) => string;
}) {
  const { coupon, hallmark } = item;
  return (
    <Link
      href={`/coupon/${coupon.id}`}
      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition hover:border-amber-400/40 hover:bg-white/10"
    >
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-amber-500/20 font-mono text-sm font-black text-amber-200">
        #{rank}
      </span>
      <MerchantLogo merchant={coupon.merchant} size={32} rounded="md" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase text-amber-300">
          {coupon.merchant.name}
        </p>
        <p className="line-clamp-1 text-sm font-bold text-white">{coupon.title}</p>
      </div>
      <div className="flex-none text-right">
        <p className="font-mono text-sm font-bold text-amber-200">
          {formatDiscount(coupon, t)}
        </p>
        <p className="text-[9px] text-gray-400">{hallmark}</p>
      </div>
    </Link>
  );
}
