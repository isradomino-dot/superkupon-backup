"use client";

import { useEffect, useState } from "react";

import { getCouponsByIds } from "@/lib/api";
import { useFavorites } from "@/lib/use-favorites";
import { useCountUp } from "@/lib/use-count-up";

/**
 * Calc potensi hematan dari favorites:
 *   - discount_type=fixed       → discount_value langsung
 *   - discount_type=cashback    → discount_value (kalo absolut Rp) atau max_discount
 *   - discount_type=percent     → max_discount (krn percent dari min_spend variable)
 *   - free_shipping/bogo        → max_discount (kalo ada) atau 0
 */
function estimateSavings(c: {
  discount_type: string;
  discount_value: number;
  max_discount?: number | null;
}): number {
  const max = c.max_discount ?? 0;
  if (c.discount_type === "fixed") return c.discount_value;
  if (c.discount_type === "cashback") {
    return c.discount_value > 1000 ? c.discount_value : max;
  }
  if (c.discount_type === "percent") return max;
  return max;
}

export function SavingsTracker() {
  const { ids } = useFavorites();
  const [savings, setSavings] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const animated = useCountUp(savings, 800);

  useEffect(() => {
    if (ids.length === 0) {
      setSavings(0);
      setCount(0);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getCouponsByIds(ids)
      .then((coupons) => {
        if (cancelled) return;
        const total = coupons.reduce((sum, c) => sum + estimateSavings(c), 0);
        setSavings(total);
        setCount(coupons.length);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ids]);

  if (ids.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent p-5 text-center">
        <div className="text-3xl" aria-hidden>
          💰
        </div>
        <h3 className="mt-2 text-sm font-bold text-white">Total Hematanmu</h3>
        <p className="mt-1 text-xs text-gray-400">
          Belum ada favorit. Klik hati di kupon untuk track potensi hematan.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/15 via-transparent to-transparent p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
            💰 Potensi Hematanmu
          </p>
          <p
            className={[
              "mt-2 font-black tabular-nums text-white",
              "text-3xl sm:text-4xl",
              loading ? "opacity-60" : "",
            ].join(" ")}
          >
            Rp {animated.toLocaleString("id-ID")}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            dari <span className="font-semibold text-emerald-200">{count} kupon favorit</span>
          </p>
        </div>
        <div className="text-5xl opacity-30" aria-hidden>
          💸
        </div>
      </div>
      <p className="mt-3 rounded-md bg-emerald-500/5 px-2.5 py-1.5 text-[10px] text-emerald-200/80">
        💡 Estimasi maksimum kalo semua kupon kepake. Aktual tergantung syarat & belanja.
      </p>
    </div>
  );
}
