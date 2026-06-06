"use client";

import { useDailyLogin } from "@/lib/use-daily-login";

export function DailyLoginIndicator() {
  const { data, canClaimToday, openModal } = useDailyLogin();

  return (
    <button
      type="button"
      onClick={openModal}
      className="relative inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-gradient-to-br from-amber-500/15 to-orange-500/10 px-2.5 py-1 text-sm font-semibold text-amber-700 transition hover:border-amber-400/70 hover:bg-amber-500/20 dark:text-amber-200"
      title={canClaimToday ? "Klaim daily login bonus" : `Total coins: ${data.totalCoins}`}
      aria-label="Daily login bonus"
    >
      <span aria-hidden className={canClaimToday ? "text-base animate-pulse" : "text-base opacity-70"}>
        🎁
      </span>
      <span className="hidden tabular-nums sm:inline">{data.totalCoins}</span>
      {canClaimToday && (
        <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
        </span>
      )}
    </button>
  );
}
