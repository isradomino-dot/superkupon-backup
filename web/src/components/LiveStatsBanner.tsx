"use client";

import { useEffect, useRef, useState } from "react";

import { useOverviewStats } from "@/lib/use-overview-stats";

const ANIMATION_MS = 900;

/**
 * Animates from previous to next number over ANIMATION_MS using ease-out.
 * Skips animation if delta is small (<2) or initial value is 0 (no-op feel).
 */
function useCountUp(target: number): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === display) return;
    fromRef.current = display;
    startRef.current = 0;

    const tick = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / ANIMATION_MS);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(fromRef.current + (target - fromRef.current) * eased);
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return display;
}

function formatThousands(n: number): string {
  if (n < 1000) return n.toString();
  return `${(n / 1000).toFixed(1)}k`;
}

export function LiveStatsBanner() {
  const { stats, loading, hydrated } = useOverviewStats();

  const animDailyNew = useCountUp(stats.dailyNew);
  const animMerchants = useCountUp(stats.totalMerchants);
  const animAvgPct = useCountUp(stats.avgPercent);
  const animRedeems = useCountUp(stats.totalRedeems);

  // Hidden during SSR / pre-hydrate untuk avoid layout shift
  if (!hydrated && loading) {
    return (
      <div className="h-9 animate-pulse rounded-full bg-gray-800/40" />
    );
  }

  // Don't show banner kalau backend literally kosong (no data at all)
  if (
    stats.dailyNew === 0 &&
    stats.totalMerchants === 0 &&
    stats.avgPercent === 0 &&
    stats.totalRedeems === 0
  ) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 rounded-full border border-emerald-400/20 bg-gradient-to-r from-emerald-500/10 via-violet-500/10 to-rose-500/10 px-4 py-1.5 text-[11px] backdrop-blur sm:gap-x-6"
    >
      <LivePulse />

      <Stat
        emoji="✨"
        value={animDailyNew}
        label="kupon update hari ini"
        color="text-emerald-300"
      />
      <Dot />
      <Stat
        emoji="🏬"
        value={animMerchants}
        label="merchant aktif"
        color="text-sky-300"
      />
      <Dot />
      <Stat
        emoji="💯"
        value={animAvgPct}
        suffix="%"
        label="avg diskon"
        color="text-amber-300"
      />
      <Dot />
      <Stat
        emoji="📋"
        value={animRedeems}
        formatter={formatThousands}
        label="total disalin"
        color="text-violet-300"
      />
    </div>
  );
}

function LivePulse() {
  return (
    <span className="flex items-center gap-1 text-emerald-400" title="Auto-refresh setiap 1 menit">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span className="text-[9px] font-bold uppercase tracking-[0.15em]">Live</span>
    </span>
  );
}

function Dot() {
  return <span className="hidden text-gray-600 sm:inline" aria-hidden>·</span>;
}

function Stat({
  emoji,
  value,
  suffix,
  label,
  color,
  formatter,
}: {
  emoji: string;
  value: number;
  suffix?: string;
  label: string;
  color: string;
  formatter?: (n: number) => string;
}) {
  const display = formatter ? formatter(value) : value.toLocaleString("id-ID");
  return (
    <span className="inline-flex items-center gap-1">
      <span aria-hidden>{emoji}</span>
      <span className={["font-black tabular-nums", color].join(" ")}>{display}</span>
      {suffix && <span className={["font-black", color].join(" ")}>{suffix}</span>}
      <span className="text-gray-400">{label}</span>
    </span>
  );
}
