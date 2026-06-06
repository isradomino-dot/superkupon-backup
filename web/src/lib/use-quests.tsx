"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useDailyLogin } from "@/lib/use-daily-login";
import { useFavorites } from "@/lib/use-favorites";
import { useHistory } from "@/lib/use-history";

const STORAGE_KEY = "sk_quests_v1";

export type QuestType = "claim" | "favorite" | "merchant" | "login";
export type QuestDifficulty = "easy" | "medium" | "hard";

export interface QuestDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  goal: number;
  reward: number;
  type: QuestType;
  difficulty: QuestDifficulty;
}

const QUEST_POOL: QuestDef[] = [
  // Easy — 15-20 coins
  { id: "q-claim-1", title: "Pemula", description: "Salin 1 kupon hari ini", goal: 1, reward: 20, type: "claim", difficulty: "easy", icon: "📋" },
  { id: "q-fav-1", title: "Penjelajah", description: "Favoritkan 1 kupon", goal: 1, reward: 20, type: "favorite", difficulty: "easy", icon: "⭐" },
  { id: "q-login", title: "Hadir Hari Ini", description: "Klaim daily login bonus", goal: 1, reward: 15, type: "login", difficulty: "easy", icon: "🎁" },

  // Medium — 50 coins
  { id: "q-claim-3", title: "Pemburu", description: "Salin 3 kupon hari ini", goal: 3, reward: 50, type: "claim", difficulty: "medium", icon: "🎯" },
  { id: "q-merchant-2", title: "Ekspedisi", description: "Salin dari 2 merchant berbeda", goal: 2, reward: 50, type: "merchant", difficulty: "medium", icon: "🗺️" },
  { id: "q-fav-3", title: "Kolektor", description: "Favoritkan 3 kupon", goal: 3, reward: 50, type: "favorite", difficulty: "medium", icon: "💖" },

  // Hard — 100 coins
  { id: "q-claim-5", title: "Veteran", description: "Salin 5 kupon hari ini", goal: 5, reward: 100, type: "claim", difficulty: "hard", icon: "🏆" },
  { id: "q-merchant-3", title: "Conqueror", description: "Salin dari 3 merchant berbeda", goal: 3, reward: 100, type: "merchant", difficulty: "hard", icon: "👑" },
  { id: "q-fav-5", title: "Kurator", description: "Favoritkan 5 kupon", goal: 5, reward: 100, type: "favorite", difficulty: "hard", icon: "✨" },
];

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function nextMidnight(): number {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function selectDailyQuests(dateKey: string): QuestDef[] {
  const seed = hashStr(dateKey);
  const easy = QUEST_POOL.filter((q) => q.difficulty === "easy");
  const medium = QUEST_POOL.filter((q) => q.difficulty === "medium");
  const hard = QUEST_POOL.filter((q) => q.difficulty === "hard");
  return [
    easy[seed % easy.length],
    medium[(seed >> 4) % medium.length],
    hard[(seed >> 8) % hard.length],
  ];
}

interface QuestState {
  date: string;
  claimed: string[]; // quest IDs already claimed today
  totalCompleted: number;
  totalCoinsFromQuests: number;
}

const DEFAULT_STATE: QuestState = {
  date: "",
  claimed: [],
  totalCompleted: 0,
  totalCoinsFromQuests: 0,
};

export interface QuestEntry {
  def: QuestDef;
  progress: number;
  isComplete: boolean;
  isClaimed: boolean;
}

interface Ctx {
  quests: QuestEntry[];
  state: QuestState;
  msToReset: number;
  claim: (questId: string) => { ok: true; coins: number } | { ok: false; reason: string };
}

const QuestsCtx = createContext<Ctx | null>(null);

export function QuestsProvider({ children }: { children: ReactNode }) {
  const { records: history } = useHistory();
  const { records: favs } = useFavorites();
  const { data: dlData, grantCoins } = useDailyLogin();
  const [state, setState] = useState<QuestState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [tick, setTick] = useState(0);

  // Hydrate + day-rollover reset
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      let next: QuestState = DEFAULT_STATE;
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<QuestState>;
        next = { ...DEFAULT_STATE, ...parsed };
      }
      if (next.date !== todayKey()) {
        next = { ...next, date: todayKey(), claimed: [] };
      }
      setState(next);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // Persist
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, hydrated]);

  // Re-tick every 30s so countdown stays fresh (cheap)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const todayDefs = useMemo(() => selectDailyQuests(state.date || todayKey()), [state.date]);

  // Derive progress per quest from existing state
  const quests = useMemo<QuestEntry[]>(() => {
    const startMs = startOfToday();
    const todayClaims = history.filter((r) => r.claimedAt >= startMs);
    const uniqueMerchantsToday = new Set(todayClaims.map((r) => r.merchantSlug)).size;
    const todayFavsCount = favs.filter((f) => f.savedAt >= startMs).length;
    const loginClaimedToday = dlData.lastClaimDate === todayKey();

    return todayDefs.map((def) => {
      let progress = 0;
      switch (def.type) {
        case "claim":
          progress = todayClaims.length;
          break;
        case "favorite":
          progress = todayFavsCount;
          break;
        case "merchant":
          progress = uniqueMerchantsToday;
          break;
        case "login":
          progress = loginClaimedToday ? 1 : 0;
          break;
      }
      const capped = Math.min(progress, def.goal);
      const isClaimed = state.claimed.includes(def.id);
      return {
        def,
        progress: capped,
        isComplete: capped >= def.goal,
        isClaimed,
      };
    });
  }, [todayDefs, history, favs, dlData.lastClaimDate, state.claimed]);

  const claim = useCallback(
    (questId: string): { ok: true; coins: number } | { ok: false; reason: string } => {
      const entry = quests.find((q) => q.def.id === questId);
      if (!entry) return { ok: false, reason: "Quest tidak ditemukan" };
      if (entry.isClaimed) return { ok: false, reason: "Sudah diklaim" };
      if (!entry.isComplete) return { ok: false, reason: "Belum selesai" };

      grantCoins(entry.def.reward);
      setState((prev) => ({
        ...prev,
        date: todayKey(),
        claimed: [...prev.claimed, questId],
        totalCompleted: prev.totalCompleted + 1,
        totalCoinsFromQuests: prev.totalCoinsFromQuests + entry.def.reward,
      }));

      void import("@/lib/confetti").then(({ fireConfetti }) => {
        fireConfetti({
          particleCount: entry.def.difficulty === "hard" ? 130 : 70,
          colors:
            entry.def.difficulty === "hard"
              ? ["#a78bfa", "#fbbf24", "#f472b6", "#facc15"]
              : ["#fbbf24", "#fde047", "#facc15"],
        });
      });

      return { ok: true, coins: entry.def.reward };
    },
    [quests, grantCoins],
  );

  const msToReset = useMemo(() => {
    void tick;
    return Math.max(0, nextMidnight() - Date.parse(new Date().toISOString()));
  }, [tick]);

  const value = useMemo<Ctx>(
    () => ({ quests, state, msToReset, claim }),
    [quests, state, msToReset, claim],
  );

  return <QuestsCtx.Provider value={value}>{children}</QuestsCtx.Provider>;
}

export function useQuests(): Ctx {
  const ctx = useContext(QuestsCtx);
  if (!ctx) throw new Error("useQuests must be inside QuestsProvider");
  return ctx;
}
