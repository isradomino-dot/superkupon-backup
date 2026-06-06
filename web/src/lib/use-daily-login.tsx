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

const STORAGE_KEY = "sk_daily_login_v1";
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CYCLE_LENGTH = 7;

export interface DailyReward {
  day: number;
  coins: number;
  bonus?: string;
  isJackpot?: boolean;
  icon: string;
}

export const REWARDS_BASE: DailyReward[] = [
  { day: 1, coins: 10, icon: "🪙" },
  { day: 2, coins: 20, icon: "🪙" },
  { day: 3, coins: 30, icon: "💰" },
  { day: 4, coins: 50, bonus: "Boost 24 jam", icon: "⚡" },
  { day: 5, coins: 75, icon: "💎" },
  { day: 6, coins: 100, icon: "💎" },
  { day: 7, coins: 200, bonus: "Mystery Coupon", isJackpot: true, icon: "🎁" },
];

export interface ActiveBoost {
  itemId: string;
  expiresAt: string; // ISO date
}

interface DailyLoginData {
  lastClaimDate: string | null;
  currentDay: number;
  cycleNumber: number;
  totalCoins: number;
  totalClaims: number;
  claimedDates: string[];
  activeBoosts: ActiveBoost[];
}

function todayKey(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(aIso: string, bIso: string): number {
  return Math.floor((Date.parse(bIso) - Date.parse(aIso)) / MS_PER_DAY);
}

const DEFAULT_DATA: DailyLoginData = {
  lastClaimDate: null,
  currentDay: 1,
  cycleNumber: 1,
  totalCoins: 0,
  totalClaims: 0,
  claimedDates: [],
  activeBoosts: [],
};

interface Ctx {
  data: DailyLoginData;
  canClaimToday: boolean;
  currentReward: DailyReward;
  upcomingRewards: DailyReward[];
  multiplier: number;
  boostMultiplier: number;
  hasActiveBoost: (itemId: string) => boolean;
  addBoost: (itemId: string, durationDays: number) => void;
  spendCoins: (amount: number) => boolean;
  grantCoins: (amount: number) => void;
  claim: () => void;
  showModal: boolean;
  openModal: () => void;
  dismissModal: () => void;
}

const DailyLoginCtx = createContext<Ctx | null>(null);

export function DailyLoginProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DailyLoginData>(DEFAULT_DATA);
  const [hydrated, setHydrated] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const autoShownRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      let next = DEFAULT_DATA;
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DailyLoginData>;
        next = { ...DEFAULT_DATA, ...parsed };
      }
      if (next.lastClaimDate) {
        const gap = daysBetween(next.lastClaimDate, todayKey());
        if (gap > 1) {
          next.currentDay = 1;
        }
      }
      // Prune expired boosts
      const nowMs = Date.parse(new Date().toISOString());
      next.activeBoosts = (next.activeBoosts ?? []).filter((b) => Date.parse(b.expiresAt) > nowMs);
      setData(next);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }, [data, hydrated]);

  const canClaimToday = useMemo(() => {
    if (!hydrated) return false;
    return data.lastClaimDate !== todayKey();
  }, [data.lastClaimDate, hydrated]);

  const cycleMultiplier = useMemo(() => {
    if (data.cycleNumber <= 1) return 1.0;
    if (data.cycleNumber === 2) return 1.5;
    return 2.0;
  }, [data.cycleNumber]);

  const hasActiveBoost = useCallback(
    (itemId: string): boolean => {
      const nowMs = Date.parse(new Date().toISOString());
      return (data.activeBoosts ?? []).some(
        (b) => b.itemId === itemId && Date.parse(b.expiresAt) > nowMs,
      );
    },
    [data.activeBoosts],
  );

  const boostMultiplier = useMemo(() => (hasActiveBoost("login-boost-2x") ? 2.0 : 1.0), [hasActiveBoost]);
  const multiplier = useMemo(() => cycleMultiplier * boostMultiplier, [cycleMultiplier, boostMultiplier]);

  const todaysIndex = Math.min(Math.max(data.currentDay - 1, 0), CYCLE_LENGTH - 1);
  const currentReward = useMemo<DailyReward>(() => {
    const base = REWARDS_BASE[todaysIndex];
    return { ...base, coins: Math.round(base.coins * multiplier) };
  }, [todaysIndex, multiplier]);

  const upcomingRewards = useMemo<DailyReward[]>(
    () => REWARDS_BASE.map((r) => ({ ...r, coins: Math.round(r.coins * multiplier) })),
    [multiplier],
  );

  useEffect(() => {
    if (!hydrated) return;
    if (autoShownRef.current) return;
    if (!canClaimToday) return;
    const id = setTimeout(() => {
      setShowModal(true);
      autoShownRef.current = true;
    }, 1500);
    return () => clearTimeout(id);
  }, [hydrated, canClaimToday]);

  const claim = useCallback(() => {
    if (!canClaimToday) return;
    const reward = currentReward;
    setData((prev) => {
      const today = todayKey();
      const newClaimedDates = [...prev.claimedDates, today].slice(-30);
      const isCycleEnd = prev.currentDay >= CYCLE_LENGTH;
      const nextDay = isCycleEnd ? 1 : prev.currentDay + 1;
      const nextCycle = isCycleEnd ? prev.cycleNumber + 1 : prev.cycleNumber;
      return {
        ...prev,
        lastClaimDate: today,
        currentDay: nextDay,
        cycleNumber: nextCycle,
        totalCoins: prev.totalCoins + reward.coins,
        totalClaims: prev.totalClaims + 1,
        claimedDates: newClaimedDates,
      };
    });
    void import("@/lib/confetti").then(({ fireDoubleBurst, fireConfetti }) => {
      if (reward.isJackpot) {
        fireDoubleBurst();
      } else {
        fireConfetti({
          particleCount: 110,
          colors: ["#fbbf24", "#f59e0b", "#fde047", "#f97316", "#facc15"],
          spread: 80,
        });
      }
    });
  }, [canClaimToday, currentReward]);

  const openModal = useCallback(() => setShowModal(true), []);
  const dismissModal = useCallback(() => setShowModal(false), []);

  const spendCoins = useCallback(
    (amount: number): boolean => {
      if (amount <= 0) return false;
      if (data.totalCoins < amount) return false;
      setData((prev) => ({ ...prev, totalCoins: prev.totalCoins - amount }));
      return true;
    },
    [data.totalCoins],
  );

  const grantCoins = useCallback((amount: number) => {
    if (amount <= 0) return;
    setData((prev) => ({ ...prev, totalCoins: prev.totalCoins + amount }));
  }, []);

  const addBoost = useCallback((itemId: string, durationDays: number) => {
    const expiresAt = new Date(Date.parse(new Date().toISOString()) + durationDays * MS_PER_DAY).toISOString();
    setData((prev) => ({
      ...prev,
      activeBoosts: [
        ...(prev.activeBoosts ?? []).filter((b) => b.itemId !== itemId),
        { itemId, expiresAt },
      ],
    }));
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      data,
      canClaimToday,
      currentReward,
      upcomingRewards,
      multiplier,
      boostMultiplier,
      hasActiveBoost,
      addBoost,
      spendCoins,
      grantCoins,
      claim,
      showModal,
      openModal,
      dismissModal,
    }),
    [
      data,
      canClaimToday,
      currentReward,
      upcomingRewards,
      multiplier,
      boostMultiplier,
      hasActiveBoost,
      addBoost,
      spendCoins,
      grantCoins,
      claim,
      showModal,
      openModal,
      dismissModal,
    ],
  );

  return <DailyLoginCtx.Provider value={value}>{children}</DailyLoginCtx.Provider>;
}

export function useDailyLogin(): Ctx {
  const ctx = useContext(DailyLoginCtx);
  if (!ctx) throw new Error("useDailyLogin must be inside DailyLoginProvider");
  return ctx;
}
