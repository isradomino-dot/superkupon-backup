"use client";

import { useEffect } from "react";

import { TIER_META, useAchievements } from "@/lib/use-achievements";

export function AchievementUnlockModal() {
  const { queue, dismissOne } = useAchievements();
  const current = queue[0];

  useEffect(() => {
    if (!current) return;
    // Fire confetti once per unlock
    void import("@/lib/confetti").then(({ fireConfetti, fireDoubleBurst }) => {
      if (current.tier === "master" || current.tier === "diamond") {
        fireDoubleBurst();
      } else {
        fireConfetti({
          particleCount: 110,
          colors: ["#fbbf24", "#facc15", "#a78bfa", "#f472b6"],
          spread: 80,
        });
      }
    });
    // Auto-dismiss after 4s
    const id = setTimeout(dismissOne, 4500);
    return () => clearTimeout(id);
  }, [current, dismissOne]);

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissOne();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current, dismissOne]);

  if (!current) return null;
  const tier = TIER_META[current.tier];

  return (
    <div className="fixed inset-x-0 top-20 z-[120] flex justify-center px-4 pointer-events-none">
      <div
        role="status"
        aria-live="polite"
        onClick={dismissOne}
        className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl border-2 border-white/20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 shadow-2xl animate-slide-up cursor-pointer"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">
            🏅 Achievement Unlocked
          </span>
          <span
            className={[
              "ml-auto rounded-full bg-gradient-to-r px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow",
              tier.cls,
            ].join(" ")}
          >
            {tier.label}
          </span>
        </div>

        <div className="mt-3 flex items-start gap-3">
          <div
            className={[
              "flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-gradient-to-br text-3xl ring-2 ring-offset-2 ring-offset-slate-900 shadow-lg",
              tier.cls,
              tier.ringCls,
            ].join(" ")}
          >
            {current.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-1 text-base font-black text-white">{current.title}</h3>
            <p className="line-clamp-2 text-xs text-slate-300">{current.description}</p>
            {current.reward > 0 && (
              <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                <span aria-hidden>🪙</span>
                +{current.reward}
              </div>
            )}
          </div>
        </div>

        <p className="mt-2 text-[10px] text-slate-400">Tap untuk tutup · Esc</p>
      </div>
    </div>
  );
}
