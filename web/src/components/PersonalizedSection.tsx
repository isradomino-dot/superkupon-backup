"use client";

import { useEffect, useMemo, useState } from "react";

import { isAbortError, listCoupons } from "@/lib/api";
import { useHistory } from "@/lib/use-history";
import type { Coupon } from "@/lib/types";
import { CouponCard } from "@/components/CouponCard";
import { CouponSkeletonGrid } from "@/components/CouponSkeleton";

/**
 * "Untuk Kamu" — show coupons from user's most-claimed merchant.
 * Fallback: if no history yet, show top-quality coupons as discovery seed.
 */
export function PersonalizedSection({ limit = 6 }: { limit?: number }) {
  const { records } = useHistory();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  const topMerchant = useMemo(() => {
    if (records.length === 0) return null;
    const counts = new Map<string, { name: string; count: number }>();
    for (const r of records) {
      const cur = counts.get(r.merchantSlug);
      if (cur) cur.count++;
      else counts.set(r.merchantSlug, { name: r.merchantName, count: 1 });
    }
    const top = Array.from(counts.entries()).sort((a, b) => b[1].count - a[1].count)[0];
    return top ? { slug: top[0], name: top[1].name, count: top[1].count } : null;
  }, [records]);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    const fetcher = topMerchant
      ? listCoupons({ merchant: topMerchant.slug, sort: "quality", limit }, { signal: ctrl.signal })
      : listCoupons({ sort: "quality", min_quality: 80, limit }, { signal: ctrl.signal });
    fetcher
      .then((res) => {
        if (!ctrl.signal.aborted) setCoupons(res);
      })
      .catch((e) => {
        if (!isAbortError(e)) setCoupons([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [topMerchant, limit]);

  if (!loading && coupons.length === 0) return null;

  return (
    <section className="relative space-y-3 overflow-hidden rounded-2xl border-2 border-rose-400/30 bg-gradient-to-br from-rose-500/15 via-pink-500/10 to-purple-500/10 p-5 shadow-lg animate-slide-up">
      {/* Decorative blob */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-rose-500/10 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl" aria-hidden />

      <header className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-pink-600 text-2xl shadow-md">
            🎯
          </div>
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black text-white">
              Untuk Kamu
              <span className="rounded-full bg-rose-500/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-200">
                Personalized
              </span>
            </h2>
            <p className="mt-0.5 text-xs text-gray-300">
              {topMerchant ? (
                <>
                  Berdasarkan history lo · {topMerchant.count}× pakai{" "}
                  <strong className="text-rose-300">{topMerchant.name}</strong>
                </>
              ) : (
                <>Mulai salin kupon untuk dapet rekomendasi personal</>
              )}
            </p>
          </div>
        </div>
        {topMerchant && (
          <span className="hidden items-center gap-1 rounded-full border border-rose-400/40 bg-rose-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-200 sm:inline-flex">
            💖 {topMerchant.name}
          </span>
        )}
      </header>

      {loading ? (
        <CouponSkeletonGrid count={3} />
      ) : (
        <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coupons.map((c) => (
            <CouponCard key={c.id} coupon={c} />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * "Dekat Kamu" — region-based suggestion. Default Jakarta; user can toggle city.
 */
export function NearbySection({ limit = 6 }: { limit?: number }) {
  const [region, setRegion] = useState<"jakarta" | "bandung" | "surabaya">("jakarta");
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    listCoupons({ region, sort: "quality", limit }, { signal: ctrl.signal })
      .then((res) => {
        if (!ctrl.signal.aborted) setCoupons(res);
      })
      .catch((e) => {
        if (!isAbortError(e)) setCoupons([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [region, limit]);

  return (
    <section className="space-y-3 rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent p-4 animate-slide-up">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-white">
            <span aria-hidden>📍</span> Dekat Kamu
          </h2>
          <p className="mt-0.5 text-xs text-gray-400">
            {coupons.length > 0
              ? `${coupons.length} kupon di area ${region.charAt(0).toUpperCase() + region.slice(1)}`
              : `Belum ada kupon spesifik ${region}`}
          </p>
        </div>
        <div className="flex gap-1">
          {(["jakarta", "bandung", "surabaya"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRegion(r)}
              className={[
                "rounded-full px-2.5 py-1 text-xs font-medium transition",
                region === r
                  ? "bg-amber-500 text-white"
                  : "border border-white/15 bg-white/5 text-gray-300 hover:bg-amber-500/10",
              ].join(" ")}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </header>
      {loading ? (
        <CouponSkeletonGrid count={3} />
      ) : coupons.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/15 p-6 text-center text-xs text-gray-500">
          Belum ada kupon di {region}. Coba kota lain di atas.
        </div>
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
