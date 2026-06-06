"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { Coupon } from "./types";

const STORAGE_KEY = "sk_claims_v1";
const MAX_RECORDS = 500;

export interface ClaimRecord {
  couponId: number;
  code: string | null;
  title: string;
  merchantSlug: string;
  merchantName: string;
  categorySlug?: string | null;
  categoryName?: string | null;
  discountType: string;
  discountValue: number;
  claimedAt: number;
}

export type PeriodKey = "today" | "week" | "month" | "all";

interface HistoryContextValue {
  records: ClaimRecord[];
  count: number;
  addClaim: (c: Coupon) => void;
  removeClaim: (couponId: number, claimedAt: number) => void;
  clearAll: () => void;
  filterByPeriod: (p: PeriodKey) => ClaimRecord[];
  countInPeriod: (p: PeriodKey) => number;
}

const HistoryContext = createContext<HistoryContextValue | null>(null);

function periodCutoff(p: PeriodKey): number {
  const now = new Date();
  if (p === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }
  if (p === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d.getTime();
  }
  if (p === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  }
  return 0;
}

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<ClaimRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRecords(parsed.filter((r) => typeof r.couponId === "number"));
        }
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {}
  }, [records, hydrated]);

  const addClaim = useCallback((c: Coupon) => {
    setRecords((prev) => {
      const next: ClaimRecord = {
        couponId: c.id,
        code: c.code ?? null,
        title: c.title,
        merchantSlug: c.merchant.slug,
        merchantName: c.merchant.name,
        categorySlug: c.category?.slug,
        categoryName: c.category?.name,
        discountType: c.discount_type,
        discountValue: c.discount_value,
        claimedAt: Date.now(),
      };
      return [next, ...prev].slice(0, MAX_RECORDS);
    });
  }, []);

  const removeClaim = useCallback((couponId: number, claimedAt: number) => {
    setRecords((prev) => prev.filter((r) => !(r.couponId === couponId && r.claimedAt === claimedAt)));
  }, []);

  const clearAll = useCallback(() => setRecords([]), []);

  const filterByPeriod = useCallback(
    (p: PeriodKey) => {
      const cutoff = periodCutoff(p);
      return records.filter((r) => r.claimedAt >= cutoff);
    },
    [records]
  );

  const countInPeriod = useCallback(
    (p: PeriodKey) => filterByPeriod(p).length,
    [filterByPeriod]
  );

  const value = useMemo<HistoryContextValue>(
    () => ({
      records,
      count: records.length,
      addClaim,
      removeClaim,
      clearAll,
      filterByPeriod,
      countInPeriod,
    }),
    [records, addClaim, removeClaim, clearAll, filterByPeriod, countInPeriod]
  );

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}

export function useHistory() {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error("useHistory must be inside <HistoryProvider>");
  return ctx;
}

export function computeStats(records: ClaimRecord[]) {
  const totalClaims = records.length;
  const uniqueCoupons = new Set(records.map((r) => r.couponId)).size;

  const byMerchant = new Map<string, { name: string; count: number }>();
  const byCategory = new Map<string, { name: string; count: number }>();
  const byType = new Map<string, number>();

  let totalSavings = 0;

  for (const r of records) {
    const mEntry = byMerchant.get(r.merchantSlug);
    if (mEntry) mEntry.count++;
    else byMerchant.set(r.merchantSlug, { name: r.merchantName, count: 1 });

    if (r.categorySlug && r.categoryName) {
      const cEntry = byCategory.get(r.categorySlug);
      if (cEntry) cEntry.count++;
      else byCategory.set(r.categorySlug, { name: r.categoryName, count: 1 });
    }

    byType.set(r.discountType, (byType.get(r.discountType) ?? 0) + 1);

    // Estimated savings: only fixed + cashback (Rp absolute) sum
    if (r.discountType === "fixed" && r.discountValue >= 100) {
      totalSavings += r.discountValue;
    } else if (r.discountType === "cashback" && r.discountValue >= 100) {
      totalSavings += r.discountValue;
    }
  }

  const topMerchants = Array.from(byMerchant.entries())
    .map(([slug, v]) => ({ slug, name: v.name, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topCategories = Array.from(byCategory.entries())
    .map(([slug, v]) => ({ slug, name: v.name, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const typeBreakdown = Array.from(byType.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalClaims,
    uniqueCoupons,
    topMerchants,
    topCategories,
    typeBreakdown,
    totalSavings,
  };
}
