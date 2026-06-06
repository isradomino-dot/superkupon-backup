"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useDailyLogin } from "@/lib/use-daily-login";
import { useInventory } from "@/lib/use-inventory";

const REWARD_POOL: { coins: number; label: string; icon: string; weight: number }[] = [
  { coins: 25, label: "Bonus kecil", icon: "🪙", weight: 30 },
  { coins: 50, label: "Bonus mantap", icon: "💰", weight: 35 },
  { coins: 100, label: "Bonus besar!", icon: "💎", weight: 20 },
  { coins: 250, label: "Mega bonus!", icon: "💠", weight: 10 },
  { coins: 500, label: "JACKPOT!", icon: "🏆", weight: 5 },
];

// Deterministic-but-feels-random rng based on a seed.
function seedRand(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function pickReward(seed: number) {
  const total = REWARD_POOL.reduce((s, r) => s + r.weight, 0);
  let n = seedRand(seed) * total;
  for (const r of REWARD_POOL) {
    n -= r.weight;
    if (n <= 0) return r;
  }
  return REWARD_POOL[0];
}

export function MysteryPackModal() {
  const { pendingMysteryReveal, consumeMysteryReveal, data: invData } = useInventory();
  const { grantCoins } = useDailyLogin();
  const [revealed, setRevealed] = useState<boolean[]>([false, false, false]);

  const open = pendingMysteryReveal > 0;

  // Derive 3 rewards deterministically from total purchases count
  const rewards = useMemo(() => {
    const baseSeed = invData.totalPurchases * 1000 + pendingMysteryReveal;
    return [0, 1, 2].map((i) => pickReward(baseSeed + i * 7));
  }, [invData.totalPurchases, pendingMysteryReveal]);

  // Reset reveal state when a new pack opens
  useEffect(() => {
    if (open) setRevealed([false, false, false]);
  }, [open, pendingMysteryReveal]);

  const allRevealed = revealed.every(Boolean);

  const reveal = useCallback(
    (idx: number) => {
      if (revealed[idx]) return;
      setRevealed((prev) => prev.map((v, i) => (i === idx ? true : v)));
      const reward = rewards[idx];
      grantCoins(reward.coins);
      void import("@/lib/confetti").then(({ fireConfetti }) => {
        fireConfetti({
          particleCount: reward.coins >= 250 ? 150 : 70,
          colors:
            reward.coins >= 250
              ? ["#facc15", "#f59e0b", "#dc2626", "#a78bfa"]
              : ["#facc15", "#fbbf24", "#fde047"],
          spread: 75,
        });
      });
    },
    [revealed, rewards, grantCoins],
  );

  const closePack = useCallback(() => {
    consumeMysteryReveal();
  }, [consumeMysteryReveal]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && allRevealed) closePack();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, allRevealed, closePack]);

  if (!open) return null;

  const totalEarned = rewards.reduce((s, r, i) => (revealed[i] ? s + r.coins : s), 0);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border-2 border-amber-300/60 bg-gradient-to-br from-rose-700 via-purple-800 to-violet-900 p-6 shadow-2xl animate-slide-up">
        <div className="pointer-events-none absolute -left-6 -top-6 text-5xl opacity-30" aria-hidden>🎁</div>
        <div className="pointer-events-none absolute -right-6 -top-6 text-5xl opacity-30" aria-hidden>✨</div>

        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-400/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-rose-200">
            🎁 Mystery Pack
          </div>
          <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">
            {allRevealed ? "Pack Terbuka!" : "Ketuk Untuk Buka"}
          </h2>
          <p className="mt-1 text-sm text-violet-200">
            {allRevealed
              ? `Total bonus: +${totalEarned} 🪙`
              : "Tap 3 kartu untuk reveal reward"}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {rewards.map((reward, idx) => (
            <RevealCard
              key={idx}
              isRevealed={revealed[idx]}
              reward={reward}
              onReveal={() => reveal(idx)}
            />
          ))}
        </div>

        <div className="mt-5">
          {allRevealed ? (
            <button
              type="button"
              onClick={closePack}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-3 text-base font-black uppercase tracking-wider text-amber-900 shadow-lg transition hover:brightness-110 active:scale-95"
            >
              Klaim Semua · +{totalEarned} 🪙
            </button>
          ) : (
            <p className="text-center text-xs text-violet-300/70">
              {revealed.filter(Boolean).length}/3 dibuka
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function RevealCard({
  isRevealed,
  reward,
  onReveal,
}: {
  isRevealed: boolean;
  reward: { coins: number; label: string; icon: string };
  onReveal: () => void;
}) {
  const isBig = reward.coins >= 250;

  return (
    <button
      type="button"
      onClick={onReveal}
      disabled={isRevealed}
      className={[
        "relative aspect-[2/3] overflow-hidden rounded-2xl border-2 transition-all",
        isRevealed
          ? isBig
            ? "border-amber-300 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 shadow-2xl shadow-amber-500/50"
            : "border-emerald-300/50 bg-gradient-to-br from-emerald-500/30 to-teal-600/30"
          : "border-amber-300/50 bg-gradient-to-br from-violet-700 to-purple-900 hover:from-violet-600 hover:to-purple-800 hover:scale-105 active:scale-95 shadow-lg",
      ].join(" ")}
    >
      {isRevealed ? (
        <div className="flex h-full flex-col items-center justify-center p-2 animate-slide-up">
          <div className="text-3xl" aria-hidden>{reward.icon}</div>
          <div className="mt-1 text-lg font-black text-white tabular-nums">+{reward.coins}</div>
          <div className="mt-0.5 line-clamp-2 text-center text-[9px] font-bold uppercase tracking-wider text-white/90">
            {reward.label}
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center">
          <div className="text-4xl drop-shadow-lg" aria-hidden>?</div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-amber-200">
            Tap
          </div>
        </div>
      )}
    </button>
  );
}
