"use client";

import Link from "next/link";
import { useEffect } from "react";

import { useDailyLogin, type DailyReward } from "@/lib/use-daily-login";

const DAY_LABELS = ["Hari 1", "Hari 2", "Hari 3", "Hari 4", "Hari 5", "Hari 6", "Hari 7"];

export function DailyLoginModal() {
  const { showModal, dismissModal, data, currentReward, upcomingRewards, canClaimToday, claim, multiplier } =
    useDailyLogin();

  useEffect(() => {
    if (!showModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissModal();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showModal, dismissModal]);

  if (!showModal) return null;

  const currentDayIndex = data.currentDay - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      <button
        type="button"
        aria-label="Tutup daily login"
        onClick={dismissModal}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border-2 border-amber-300/50 bg-gradient-to-br from-violet-700 via-purple-700 to-violet-900 p-6 shadow-2xl animate-slide-up">
        <div className="pointer-events-none absolute -left-6 -top-6 text-5xl opacity-30" aria-hidden>✨</div>
        <div className="pointer-events-none absolute -right-6 -top-6 text-5xl opacity-30" aria-hidden>🎁</div>
        <div className="pointer-events-none absolute -right-4 -bottom-4 text-4xl opacity-20" aria-hidden>💰</div>

        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300">
            🎁 Daily Login Bonus
            {multiplier > 1 && (
              <span className="ml-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] text-white">
                ×{multiplier}
              </span>
            )}
          </div>
          <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">
            {canClaimToday ? "Klaim Bonus Hari Ini!" : "Sudah Klaim Hari Ini ✓"}
          </h2>
          <p className="mt-1 text-sm text-violet-200">
            {canClaimToday
              ? `Hari ke-${data.currentDay} · Siklus ${data.cycleNumber}`
              : "Balik lagi besok untuk reward berikutnya"}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {upcomingRewards.map((reward, idx) => (
            <DayCell
              key={reward.day}
              reward={reward}
              label={DAY_LABELS[idx]}
              isToday={idx === currentDayIndex && canClaimToday}
              isClaimed={idx < currentDayIndex || (idx === currentDayIndex && !canClaimToday)}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-white/10 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-base" aria-hidden>🪙</span>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-violet-200">Total coins</div>
              <div className="text-base font-bold text-white tabular-nums">{data.totalCoins}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-violet-200">Total klaim</div>
            <div className="text-base font-bold text-white tabular-nums">{data.totalClaims}×</div>
          </div>
        </div>

        {canClaimToday ? (
          <button
            type="button"
            onClick={claim}
            className="mt-5 w-full rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-6 py-3.5 text-base font-black uppercase tracking-wider text-amber-900 shadow-lg transition hover:brightness-110 active:scale-95"
          >
            Klaim +{currentReward.coins} 🪙
            {currentReward.bonus ? ` · ${currentReward.bonus}` : ""}
          </button>
        ) : (
          <button
            type="button"
            onClick={dismissModal}
            className="mt-5 w-full rounded-2xl bg-white/15 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/25"
          >
            Tutup
          </button>
        )}

        <Link
          href="/shop"
          onClick={dismissModal}
          className="mt-2 block w-full rounded-2xl border border-white/20 bg-white/5 px-6 py-2.5 text-center text-sm font-bold text-white transition hover:bg-white/15"
        >
          🛒 Buka Toko · Tukar coins lo
        </Link>

        <p className="mt-3 text-center text-[11px] text-violet-300/80">
          Tap di luar atau Esc untuk tutup
        </p>
      </div>
    </div>
  );
}

function DayCell({
  reward,
  label,
  isToday,
  isClaimed,
}: {
  reward: DailyReward;
  label: string;
  isToday: boolean;
  isClaimed: boolean;
}) {
  const isJackpot = reward.isJackpot;

  return (
    <div
      className={[
        "relative flex flex-col items-center justify-between rounded-xl border p-2 text-center transition",
        isToday
          ? "border-amber-300 bg-gradient-to-b from-amber-400/30 to-amber-500/10 shadow-lg ring-2 ring-amber-300"
          : isClaimed
            ? "border-emerald-400/40 bg-emerald-500/10 opacity-70"
            : isJackpot
              ? "border-rose-400/40 bg-gradient-to-b from-rose-500/15 to-purple-500/5"
              : "border-white/15 bg-white/5",
      ].join(" ")}
    >
      {isClaimed && (
        <div className="absolute right-1 top-1 rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
          ✓
        </div>
      )}
      {isJackpot && !isClaimed && (
        <div className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white shadow-md">
          BIG
        </div>
      )}
      <div className="text-[9px] font-semibold uppercase tracking-wider text-violet-200">
        {label}
      </div>
      <div className="my-1 text-2xl" aria-hidden>
        {reward.icon}
      </div>
      <div
        className={[
          "text-xs font-bold tabular-nums",
          isToday ? "text-amber-200" : isClaimed ? "text-emerald-300" : "text-white",
        ].join(" ")}
      >
        +{reward.coins}
      </div>
      {reward.bonus && (
        <div className="mt-0.5 line-clamp-1 text-[8px] font-medium uppercase tracking-wider text-rose-300">
          {reward.bonus}
        </div>
      )}
    </div>
  );
}
