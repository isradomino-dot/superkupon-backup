"use client";

import { useEffect, useState } from "react";

import { isAbortError, listCoupons, listMerchants } from "@/lib/api";

const MS_DAY = 24 * 60 * 60 * 1000;
const REFRESH_INTERVAL_MS = 60_000; // refetch every 1 min

export interface OverviewStats {
  dailyNew: number;
  totalMerchants: number;
  avgPercent: number;
  totalRedeems: number;
  lastUpdated: number;
}

const ZERO: OverviewStats = {
  dailyNew: 0,
  totalMerchants: 0,
  avgPercent: 0,
  totalRedeems: 0,
  lastUpdated: 0,
};

export function useOverviewStats() {
  const [stats, setStats] = useState<OverviewStats>(ZERO);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchOnce = async () => {
      const ctrl = new AbortController();
      try {
        const [coupons, merchants] = await Promise.all([
          listCoupons({ limit: 200, sort: "newest" }, { signal: ctrl.signal }),
          listMerchants({ signal: ctrl.signal }),
        ]);
        if (cancelled) return;

        const cutoff = Date.now() - MS_DAY;
        const dailyNew = coupons.filter((c) => {
          const ts = new Date(c.scraped_at).getTime();
          return Number.isFinite(ts) && ts >= cutoff;
        }).length;

        const percents = coupons.filter((c) => c.discount_type === "percent");
        const avgPercent =
          percents.length === 0
            ? 0
            : Math.round(
                percents.reduce((sum, c) => sum + c.discount_value, 0) / percents.length,
              );

        const totalRedeems = coupons.reduce((sum, c) => sum + (c.redeem_count ?? 0), 0);

        setStats({
          dailyNew,
          totalMerchants: merchants.length,
          avgPercent,
          totalRedeems,
          lastUpdated: Date.now(),
        });
      } catch (e) {
        if (!isAbortError(e)) {
          /* silent — stats are best-effort */
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setHydrated(true);
        }
      }
      return () => ctrl.abort();
    };

    void fetchOnce();
    const id = setInterval(() => void fetchOnce(), REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { stats, loading, hydrated };
}
