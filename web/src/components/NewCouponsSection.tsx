"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { isAbortError, listCoupons } from "@/lib/api";
import type { Coupon } from "@/lib/types";
import { CouponCard } from "@/components/CouponCard";
import { CouponSkeletonGrid } from "@/components/CouponSkeleton";

interface Props {
  withinHours?: number;
  limit?: number;
  fallbackLimit?: number;
}

/**
 * Section that highlights NEWLY scraped coupons.
 * - First tries strict filter: scraped within `withinHours` (default 24h)
 * - If too few, falls back to "top N newest" so the section is never empty
 */
export function NewCouponsSection({ withinHours = 24, limit = 6, fallbackLimit = 6 }: Props) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [strict, setStrict] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    listCoupons({ sort: "newest", limit: fallbackLimit }, { signal: ctrl.signal })
      .then((all) => {
        if (ctrl.signal.aborted) return;
        const cutoff = Date.now() - withinHours * 60 * 60 * 1000;
        const fresh = all.filter(
          (c) => new Date(c.scraped_at).getTime() >= cutoff
        );
        if (fresh.length >= 3) {
          setStrict(true);
          setCoupons(fresh.slice(0, limit));
        } else {
          setStrict(false);
          setCoupons(all.slice(0, limit));
        }
      })
      .catch((e) => {
        if (!isAbortError(e)) setCoupons([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [withinHours, limit, fallbackLimit]);

  if (!loading && coupons.length === 0) return null;

  return (
    <section className="space-y-3 rounded-2xl border border-sky-400/20 bg-gradient-to-br from-sky-500/10 via-transparent to-transparent p-4 animate-slide-up">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-white">
            <span className="text-xl" aria-hidden>✨</span>
            Kupon Baru
          </h2>
          <p className="mt-0.5 text-xs text-gray-400">
            {strict
              ? `Kupon yang ditambahkan dalam ${withinHours} jam terakhir`
              : "Kupon terbaru yang ditambahkan ke sistem"}
          </p>
        </div>
        <Link
          href="/?sort=newest"
          className="text-xs font-medium text-sky-300 hover:underline"
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
