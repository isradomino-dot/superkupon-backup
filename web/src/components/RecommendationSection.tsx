"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getRecommendations, isAbortError } from "@/lib/api";
import type { Coupon } from "@/lib/types";
import { CouponCard } from "@/components/CouponCard";
import { CouponSkeletonGrid } from "@/components/CouponSkeleton";

interface Props {
  category?: string;
  title?: string;
  emoji?: string;
  hint?: string;
  limit?: number;
}

export function RecommendationSection({
  category = "food",
  title,
  emoji = "🍔",
  hint,
  limit = 6,
}: Props) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    getRecommendations({ category, limit }, { signal: ctrl.signal })
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
  }, [category, limit]);

  const displayTitle =
    title ??
    (category === "food"
      ? "Rekomendasi Makanan & Minuman"
      : `Rekomendasi ${category}`);
  const displayHint =
    hint ??
    (category === "food"
      ? "Pilihan terbaik kupon F&B berdasarkan kualitas + popularitas"
      : `Pilihan terbaik kategori ${category}`);

  if (!loading && coupons.length === 0) return null;

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-gradient-to-br from-brand-500/10 via-transparent to-transparent p-4 animate-slide-up">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-white">
            <span className="text-xl" aria-hidden>{emoji}</span>
            {displayTitle}
          </h2>
          <p className="mt-0.5 text-xs text-gray-400">{displayHint}</p>
        </div>
        <Link
          href={`/category/${category}`}
          className="text-xs font-medium text-brand-300 hover:underline"
        >
          Lihat semua →
        </Link>
      </header>

      {loading ? (
        <CouponSkeletonGrid count={Math.min(limit, 3)} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coupons.map((c) => (
            <CouponCard key={c.id} coupon={c} />
          ))}
        </div>
      )}
    </section>
  );
}
