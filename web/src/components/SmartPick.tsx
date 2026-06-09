"use client";

import Link from "next/link";
import { useState } from "react";

import { listCoupons, formatDiscount, isAbortError } from "@/lib/api";
import type { Coupon } from "@/lib/types";
import { useI18n } from "@/i18n/provider";
import { MerchantLogo } from "@/components/MerchantLogo";

interface Goal {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  categories: string[];
  color: string;
}

const GOALS: Goal[] = [
  {
    id: "makan",
    emoji: "🍔",
    label: "Makan",
    desc: "Makanan & minuman",
    categories: ["food"],
    color: "from-amber-500/30 to-orange-500/20 border-amber-400/40 hover:border-amber-400",
  },
  {
    id: "belanja",
    emoji: "🛍️",
    label: "Belanja",
    desc: "E-commerce, fashion",
    categories: ["ecommerce", "fashion"],
    color: "from-pink-500/30 to-rose-500/20 border-pink-400/40 hover:border-pink-400",
  },
  {
    id: "transport",
    emoji: "🚗",
    label: "Jalan",
    desc: "Transport, ojek online",
    categories: ["transport"],
    color: "from-sky-500/30 to-blue-500/20 border-sky-400/40 hover:border-sky-400",
  },
  {
    id: "hiburan",
    emoji: "🎬",
    label: "Hiburan",
    desc: "Film, event, streaming",
    categories: ["entertainment"],
    color: "from-violet-500/30 to-purple-500/20 border-violet-400/40 hover:border-violet-400",
  },
  {
    id: "bayar",
    emoji: "💳",
    label: "Bayar",
    desc: "Tagihan, pulsa, top-up",
    categories: ["bills"],
    color: "from-emerald-500/30 to-teal-500/20 border-emerald-400/40 hover:border-emerald-400",
  },
];

export function SmartPick() {
  const { t } = useI18n();
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);
  const [results, setResults] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);

  const pick = async (goal: Goal) => {
    setActiveGoal(goal);
    setLoading(true);
    setResults([]);
    try {
      const all = await Promise.all(
        goal.categories.map((cat) =>
          listCoupons({ category: cat, limit: 5, sort: "quality" }).catch(() => []),
        ),
      );
      // Merge + dedupe + sort by quality
      const merged: Coupon[] = [];
      const seen = new Set<number>();
      all.flat().forEach((c) => {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          merged.push(c);
        }
      });
      merged.sort((a, b) => b.quality_score - a.quality_score);
      setResults(merged.slice(0, 5));
    } catch (e) {
      if (!isAbortError(e)) setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setActiveGoal(null);
    setResults([]);
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-brand-500/10 via-purple-500/5 to-transparent p-5 sm:p-6 animate-slide-up">
      {!activeGoal ? (
        <>
          <div className="flex items-center gap-3">
            <span className="text-4xl" aria-hidden>
              🎯
            </span>
            <div>
              <h2 className="text-lg font-bold text-white sm:text-xl">
                Mau Hemat Buat Apa Hari Ini?
              </h2>
              <p className="mt-0.5 text-xs text-gray-400">
                Pilih kebutuhanmu — kasih rekomendasi 5 kupon terbaik
              </p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
            {GOALS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => pick(g)}
                className={[
                  "group flex flex-col items-center gap-1 rounded-xl border bg-gradient-to-br p-3 text-center transition-all hover:scale-105 hover:shadow-lg sm:p-4",
                  g.color,
                ].join(" ")}
              >
                <span className="text-3xl transition-transform group-hover:rotate-12 sm:text-4xl">
                  {g.emoji}
                </span>
                <span className="text-sm font-bold text-white">{g.label}</span>
                <span className="text-[10px] text-gray-300">{g.desc}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-bold text-white sm:text-lg">
              <span className="text-2xl">{activeGoal.emoji}</span>
              Top 5 buat <span className="text-brand-300">{activeGoal.label}</span>
            </h2>
            <button
              type="button"
              onClick={reset}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300 transition hover:bg-white/10"
            >
              ← Ganti
            </button>
          </div>

          {loading ? (
            <div className="mt-4 space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-white/5" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-white/15 p-6 text-center">
              <p className="text-sm text-gray-400">
                Belum ada kupon di kategori {activeGoal.label.toLowerCase()} saat ini.
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Coba pilih kategori lain atau cek lagi nanti.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {results.map((c, i) => (
                <Link
                  key={c.id}
                  href={`/coupon/${c.id}`}
                  className="group flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 p-3 transition hover:border-brand-400/50 hover:bg-white/10"
                >
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-brand-500 text-xs font-black text-white">
                    {i + 1}
                  </span>
                  <MerchantLogo merchant={c.merchant} size={36} rounded="md" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase text-brand-300">
                      {c.merchant.name}
                    </p>
                    <h3 className="line-clamp-1 text-sm font-bold text-white">
                      {c.title}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="rounded bg-brand-500/20 px-2 py-1 text-xs font-bold text-brand-200">
                      {formatDiscount(c, t)}
                    </span>
                    <p className="mt-0.5 text-[10px] text-gray-500">★ {c.quality_score}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
