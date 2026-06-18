"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { isAbortError, listCoupons, formatDiscount } from "@/lib/api";
import { couponSlug } from "@/lib/coupon-slug";
import type { Coupon } from "@/lib/types";
import { SkeletonBar, SkeletonBox } from "@/components/Skeleton";

interface Stack {
  merchantSlug: string;
  merchantName: string;
  coupons: Coupon[];
  estimatedSaving: number;
  estimatedSpend: number;
}

/**
 * Auto-detect stacking opportunities:
 *   - For each merchant with >= 2 active coupons
 *   - Group by discount_type (max 1 per type, prefer highest value)
 *   - Combine: 1 percent + 1 cashback + 1 free_shipping possible
 *   - Compute estimated savings
 */
function detectStacks(coupons: Coupon[]): Stack[] {
  const byMerchant = new Map<string, Coupon[]>();
  for (const c of coupons) {
    const arr = byMerchant.get(c.merchant.slug);
    if (arr) arr.push(c);
    else byMerchant.set(c.merchant.slug, [c]);
  }

  const stacks: Stack[] = [];
  for (const [slug, list] of byMerchant) {
    if (list.length < 2) continue;

    // Pick best of each type
    const bestPerType = new Map<string, Coupon>();
    for (const c of list) {
      const existing = bestPerType.get(c.discount_type);
      if (!existing || c.discount_value > existing.discount_value) {
        bestPerType.set(c.discount_type, c);
      }
    }
    const types = Array.from(bestPerType.values());
    if (types.length < 2) continue;

    // Estimate spend = max min_spend across stacked coupons
    const minSpend = Math.max(...types.map((c) => c.min_spend ?? 100000));
    const estimatedSpend = Math.max(minSpend, 200000);

    let saving = 0;
    for (const c of types) {
      if (c.discount_type === "percent") {
        const pct = (estimatedSpend * c.discount_value) / 100;
        saving += c.max_discount ? Math.min(pct, c.max_discount) : pct;
      } else if (c.discount_type === "fixed") {
        saving += c.discount_value;
      } else if (c.discount_type === "cashback") {
        if (c.discount_value < 100) {
          // percent cashback
          const pct = (estimatedSpend * c.discount_value) / 100;
          saving += c.max_discount ? Math.min(pct, c.max_discount) : pct;
        } else {
          saving += c.discount_value;
        }
      } else if (c.discount_type === "free_shipping") {
        saving += c.max_discount ?? 20000;
      }
    }

    if (saving < 5000) continue;

    stacks.push({
      merchantSlug: slug,
      merchantName: types[0].merchant.name,
      coupons: types,
      estimatedSaving: Math.round(saving),
      estimatedSpend,
    });
  }

  return stacks.sort((a, b) => b.estimatedSaving - a.estimatedSaving).slice(0, 4);
}

export function StackingSection() {
  const [stacks, setStacks] = useState<Stack[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    listCoupons({ limit: 200 }, { signal: ctrl.signal })
      .then((all) => {
        if (ctrl.signal.aborted) return;
        setStacks(detectStacks(all));
      })
      .catch((e) => {
        if (!isAbortError(e)) setStacks([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, []);

  if (loading) {
    return (
      <section className="space-y-3 rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent p-4">
        <header className="space-y-1.5">
          <SkeletonBar className="h-5 w-44 bg-white/10" />
          <SkeletonBar className="h-3 w-72 bg-white/5" />
        </header>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-white/10 bg-white/5 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1.5">
                  <SkeletonBar className="h-2.5 w-20 bg-white/10" />
                  <SkeletonBar className="h-3.5 w-3/4 bg-white/10" />
                  <SkeletonBar className="h-2.5 w-1/2 bg-white/5" />
                </div>
                <SkeletonBox className="h-7 w-14 flex-none bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (stacks.length === 0) return null;

  return (
    <section className="space-y-3 rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent p-4 animate-slide-up">
      <header>
        <h2 className="flex items-center gap-2 text-base font-bold text-white">
          <span aria-hidden>🧮</span> Coupon Stacking
        </h2>
        <p className="mt-0.5 text-xs text-gray-400">
          Gabungkan beberapa kupon dari merchant yang sama untuk hemat maksimal
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {stacks.map((s) => {
          const expanded = expandedSlug === s.merchantSlug;
          return (
            <div
              key={s.merchantSlug}
              className="rounded-xl border border-white/10 bg-white/5 p-3 transition hover:border-emerald-400/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                    {s.merchantName}
                  </div>
                  <div className="mt-1 text-sm text-gray-200">
                    Stack <strong>{s.coupons.length} kupon</strong> →{" "}
                    <span className="font-bold text-emerald-300">
                      hemat ±Rp {s.estimatedSaving.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-gray-500">
                    Estimasi belanja Rp {s.estimatedSpend.toLocaleString("id-ID")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedSlug(expanded ? null : s.merchantSlug)}
                  className="rounded-md border border-white/10 px-2 py-1 text-[11px] font-medium text-gray-300 hover:bg-white/10"
                >
                  {expanded ? "Tutup" : "Lihat"}
                </button>
              </div>

              {expanded && (
                <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    Pilih kombinasi:
                  </div>
                  {s.coupons.map((c) => (
                    <Link
                      key={c.id}
                      href={`/coupon/${couponSlug(c)}`}
                      className="flex items-center justify-between rounded-md bg-white/5 p-2 transition hover:bg-white/10"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-1 text-xs font-medium text-gray-200">
                          {c.title}
                        </div>
                        {c.code && (
                          <code className="mt-0.5 inline-block rounded bg-brand-500/15 px-1.5 text-[10px] font-mono text-brand-300">
                            {c.code}
                          </code>
                        )}
                      </div>
                      <span className="ml-2 flex-none rounded bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                        {formatDiscount(c)}
                      </span>
                    </Link>
                  ))}
                  <Link
                    href={`/merchant/${s.merchantSlug}`}
                    className="block rounded-md bg-emerald-500 px-3 py-1.5 text-center text-xs font-semibold text-white transition hover:bg-emerald-600"
                  >
                    Lihat semua kupon {s.merchantName} →
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
