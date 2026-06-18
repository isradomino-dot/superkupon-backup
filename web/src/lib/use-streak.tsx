"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

const STORAGE_KEY = "sk_streak_v1";
const MILESTONES = [3, 7, 14, 30, 60, 100, 365] as const;

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastClaimDate: string | null; // YYYY-MM-DD
  totalDays: number;
  milestonesReached: number[];
}

const DEFAULT: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastClaimDate: null,
  totalDays: 0,
  milestonesReached: [],
};

interface StreakContextValue {
  data: StreakData;
  milestone: number | null;
  recordClaim: () => number;
  dismissMilestone: () => void;
  reset: () => void;
  isActiveToday: boolean;
  nextMilestone: number | null;
  hydrated: boolean;
}

const StreakContext = createContext<StreakContextValue | null>(null);

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(d1: string, d2: string): number {
  const [y1, m1, day1] = d1.split("-").map(Number);
  const [y2, m2, day2] = d2.split("-").map(Number);
  const t1 = new Date(y1, m1 - 1, day1).getTime();
  const t2 = new Date(y2, m2 - 1, day2).getTime();
  return Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
}

export function StreakProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StreakData>(DEFAULT);
  const [milestone, setMilestone] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage + auto-reset stale streaks (gap > 1 day)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StreakData;
        const today = todayString();
        // If lastClaimDate exists and gap > 1, streak is broken
        if (parsed.lastClaimDate) {
          const gap = daysBetween(parsed.lastClaimDate, today);
          if (gap > 1) {
            setData({ ...parsed, currentStreak: 0 });
          } else {
            setData({ ...DEFAULT, ...parsed });
          }
        } else {
          setData({ ...DEFAULT, ...parsed });
        }
      }
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

  const recordClaim = useCallback((): number => {
    let newStreak = 0;
    setData((prev) => {
      const today = todayString();
      let cur = prev.currentStreak;
      let total = prev.totalDays;
      let achievedNow: number | null = null;

      if (prev.lastClaimDate === today) {
        // Already counted today
        newStreak = cur;
        return prev;
      }

      if (prev.lastClaimDate) {
        const gap = daysBetween(prev.lastClaimDate, today);
        cur = gap === 1 ? cur + 1 : 1;
      } else {
        cur = 1;
      }
      total += 1;

      const longest = Math.max(prev.longestStreak, cur);
      const reached = [...prev.milestonesReached];

      if (MILESTONES.includes(cur as (typeof MILESTONES)[number]) && !reached.includes(cur)) {
        reached.push(cur);
        achievedNow = cur;
      }

      if (achievedNow !== null) {
        const m = achievedNow;
        setTimeout(() => {
          setMilestone(m);
          // Lazy-import confetti to avoid circular deps
          import("@/lib/confetti").then(({ fireDoubleBurst }) => fireDoubleBurst());
        }, 150);
      }

      newStreak = cur;
      return {
        currentStreak: cur,
        longestStreak: longest,
        lastClaimDate: today,
        totalDays: total,
        milestonesReached: reached,
      };
    });
    return newStreak;
  }, []);

  const dismissMilestone = useCallback(() => setMilestone(null), []);
  const reset = useCallback(() => setData(DEFAULT), []);

  const isActiveToday = hydrated && data.lastClaimDate === todayString();
  const nextMilestone =
    MILESTONES.find((m) => m > data.currentStreak) ?? null;

  const value = useMemo<StreakContextValue>(
    () => ({ data, milestone, recordClaim, dismissMilestone, reset, isActiveToday, nextMilestone, hydrated }),
    [data, milestone, recordClaim, dismissMilestone, reset, isActiveToday, nextMilestone, hydrated]
  );

  return <StreakContext.Provider value={value}>{children}</StreakContext.Provider>;
}

export function useStreak() {
  const ctx = useContext(StreakContext);
  if (!ctx) throw new Error("useStreak must be inside <StreakProvider>");
  return ctx;
}
