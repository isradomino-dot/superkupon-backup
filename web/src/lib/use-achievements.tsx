"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useDailyLogin } from "@/lib/use-daily-login";
import { useHistory } from "@/lib/use-history";
import { useInventory } from "@/lib/use-inventory";
import { useStreak } from "@/lib/use-streak";

const STORAGE_KEY = "sk_achievements_v1";

export type Tier = "bronze" | "silver" | "gold" | "diamond" | "master";

export type AchievementCategory =
  | "collection"
  | "streak"
  | "diversity"
  | "economy"
  | "shop"
  | "special";

export type AchievementType =
  | "history-count"
  | "unique-merchants"
  | "longest-streak"
  | "login-claims"
  | "shop-purchases"
  | "owns-vip"
  | "owns-master";

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  tier: Tier;
  type: AchievementType;
  goal: number;
  reward: number;
  hidden?: boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Collection
  { id: "coll-1", title: "First Claim", description: "Salin kupon pertama lo", icon: "🎉", category: "collection", tier: "bronze", type: "history-count", goal: 1, reward: 25 },
  { id: "coll-10", title: "Hobbyist", description: "Salin 10 kupon total", icon: "📋", category: "collection", tier: "silver", type: "history-count", goal: 10, reward: 100 },
  { id: "coll-50", title: "Bargain Hunter", description: "Salin 50 kupon total", icon: "🎯", category: "collection", tier: "gold", type: "history-count", goal: 50, reward: 250 },
  { id: "coll-100", title: "Coupon Veteran", description: "Salin 100 kupon total", icon: "🏆", category: "collection", tier: "diamond", type: "history-count", goal: 100, reward: 500 },
  { id: "coll-500", title: "Coupon Royalty", description: "Salin 500 kupon — Hall of Fame", icon: "👑", category: "collection", tier: "master", type: "history-count", goal: 500, reward: 1500, hidden: true },

  // Streak
  { id: "str-3", title: "Habit Forming", description: "Streak 3 hari", icon: "🔥", category: "streak", tier: "bronze", type: "longest-streak", goal: 3, reward: 50 },
  { id: "str-7", title: "Week Strong", description: "Streak 7 hari", icon: "⭐", category: "streak", tier: "silver", type: "longest-streak", goal: 7, reward: 150 },
  { id: "str-30", title: "Monthly Mover", description: "Streak 30 hari", icon: "🌟", category: "streak", tier: "gold", type: "longest-streak", goal: 30, reward: 500 },
  { id: "str-100", title: "Centurion", description: "Streak 100 hari — legendary", icon: "💎", category: "streak", tier: "diamond", type: "longest-streak", goal: 100, reward: 1500, hidden: true },

  // Diversity
  { id: "div-5", title: "Explorer", description: "Coba 5 merchant berbeda", icon: "🗺️", category: "diversity", tier: "bronze", type: "unique-merchants", goal: 5, reward: 75 },
  { id: "div-10", title: "Connoisseur", description: "Coba 10 merchant berbeda", icon: "🧭", category: "diversity", tier: "silver", type: "unique-merchants", goal: 10, reward: 200 },
  { id: "div-25", title: "Globetrotter", description: "Coba 25 merchant berbeda", icon: "🌍", category: "diversity", tier: "gold", type: "unique-merchants", goal: 25, reward: 750 },

  // Economy (proxy: login claims)
  { id: "eco-7", title: "Daily Visitor", description: "Klaim daily login 7×", icon: "🎁", category: "economy", tier: "bronze", type: "login-claims", goal: 7, reward: 100 },
  { id: "eco-30", title: "Loyal", description: "Klaim daily login 30×", icon: "💝", category: "economy", tier: "silver", type: "login-claims", goal: 30, reward: 300 },
  { id: "eco-100", title: "Dedicated", description: "Klaim daily login 100×", icon: "🎀", category: "economy", tier: "gold", type: "login-claims", goal: 100, reward: 1000 },

  // Shop
  { id: "shop-1", title: "Shopper", description: "Beli 1 item di toko", icon: "🛒", category: "shop", tier: "bronze", type: "shop-purchases", goal: 1, reward: 50 },
  { id: "shop-5", title: "Big Spender", description: "Beli 5 item di toko", icon: "💸", category: "shop", tier: "silver", type: "shop-purchases", goal: 5, reward: 200 },
  { id: "shop-10", title: "Collector", description: "Beli 10 item di toko", icon: "🎰", category: "shop", tier: "gold", type: "shop-purchases", goal: 10, reward: 500 },

  // Special
  { id: "sp-vip", title: "VIP Status", description: "Miliki VIP Badge", icon: "👑", category: "special", tier: "gold", type: "owns-vip", goal: 1, reward: 100 },
  { id: "sp-master", title: "Coupon Master", description: "Miliki Master Badge — top 0.1%", icon: "🏆", category: "special", tier: "master", type: "owns-master", goal: 1, reward: 250, hidden: true },
];

export const TIER_META: Record<Tier, { label: string; cls: string; ringCls: string }> = {
  bronze:  { label: "Bronze",  cls: "from-amber-700 to-amber-900",         ringCls: "ring-amber-700/40" },
  silver:  { label: "Silver",  cls: "from-slate-400 to-slate-600",         ringCls: "ring-slate-400/40" },
  gold:    { label: "Gold",    cls: "from-yellow-400 to-amber-500",        ringCls: "ring-yellow-400/40" },
  diamond: { label: "Diamond", cls: "from-cyan-300 to-violet-500",         ringCls: "ring-cyan-300/40" },
  master:  { label: "Master",  cls: "from-rose-500 via-purple-500 to-violet-600", ringCls: "ring-rose-400/40" },
};

interface AchievementState {
  unlocked: string[];
  unlockedAt: Record<string, number>;
  totalRewardCoins: number;
}

const DEFAULT_STATE: AchievementState = {
  unlocked: [],
  unlockedAt: {},
  totalRewardCoins: 0,
};

export interface AchievementEntry {
  def: AchievementDef;
  progress: number;
  isUnlocked: boolean;
  unlockedAt?: number;
}

interface Ctx {
  state: AchievementState;
  entries: AchievementEntry[];
  unlockedCount: number;
  total: number;
  queue: AchievementDef[];
  dismissOne: () => void;
}

const Ach = createContext<Ctx | null>(null);

export function AchievementsProvider({ children }: { children: ReactNode }) {
  const { records: history } = useHistory();
  const { data: dlData, grantCoins } = useDailyLogin();
  const { data: invData, isOwned } = useInventory();
  const { data: streakData } = useStreak();

  const [state, setState] = useState<AchievementState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [queue, setQueue] = useState<AchievementDef[]>([]);
  const lastChecked = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AchievementState>;
        const next: AchievementState = { ...DEFAULT_STATE, ...parsed };
        next.unlocked = next.unlocked ?? [];
        next.unlockedAt = next.unlockedAt ?? {};
        setState(next);
        lastChecked.current = new Set(next.unlocked);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, hydrated]);

  const derivedProgress = useMemo(() => {
    const uniqueMerchants = new Set(history.map((r) => r.merchantSlug)).size;
    return {
      "history-count": history.length,
      "unique-merchants": uniqueMerchants,
      "longest-streak": streakData.longestStreak,
      "login-claims": dlData.totalClaims,
      "shop-purchases": invData.totalPurchases,
      "owns-vip": isOwned("badge-vip") ? 1 : 0,
      "owns-master": isOwned("badge-master") ? 1 : 0,
    } as const;
  }, [history, streakData.longestStreak, dlData.totalClaims, invData.totalPurchases, isOwned]);

  const entries = useMemo<AchievementEntry[]>(() => {
    return ACHIEVEMENTS.map((def) => {
      const progress = Math.min(derivedProgress[def.type] ?? 0, def.goal);
      const isUnlocked = state.unlocked.includes(def.id);
      return { def, progress, isUnlocked, unlockedAt: state.unlockedAt[def.id] };
    });
  }, [derivedProgress, state.unlocked, state.unlockedAt]);

  // Detect newly unlocked achievements
  useEffect(() => {
    if (!hydrated) return;
    const newlyUnlocked: AchievementDef[] = [];
    for (const def of ACHIEVEMENTS) {
      const currentProgress = derivedProgress[def.type] ?? 0;
      if (currentProgress >= def.goal && !lastChecked.current.has(def.id)) {
        newlyUnlocked.push(def);
        lastChecked.current.add(def.id);
      }
    }
    if (newlyUnlocked.length === 0) return;

    const totalReward = newlyUnlocked.reduce((s, d) => s + d.reward, 0);
    const nowMs = Date.parse(new Date().toISOString());

    setState((prev) => ({
      ...prev,
      unlocked: [...prev.unlocked, ...newlyUnlocked.map((d) => d.id)],
      unlockedAt: {
        ...prev.unlockedAt,
        ...Object.fromEntries(newlyUnlocked.map((d) => [d.id, nowMs])),
      },
      totalRewardCoins: prev.totalRewardCoins + totalReward,
    }));

    if (totalReward > 0) grantCoins(totalReward);
    setQueue((prev) => [...prev, ...newlyUnlocked]);
  }, [derivedProgress, hydrated, grantCoins]);

  const dismissOne = useCallback(() => {
    setQueue((prev) => prev.slice(1));
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      state,
      entries,
      unlockedCount: state.unlocked.length,
      total: ACHIEVEMENTS.length,
      queue,
      dismissOne,
    }),
    [state, entries, queue, dismissOne],
  );

  return <Ach.Provider value={value}>{children}</Ach.Provider>;
}

export function useAchievements(): Ctx {
  const ctx = useContext(Ach);
  if (!ctx) throw new Error("useAchievements must be inside AchievementsProvider");
  return ctx;
}
