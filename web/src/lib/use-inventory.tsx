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

const STORAGE_KEY = "sk_inventory_v1";

export type ItemCategory = "boost" | "cosmetic" | "utility";

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  price: number;
  category: ItemCategory;
  consumable: boolean;
  durationDays?: number;
  flair?: "new" | "hot" | "limited";
}

export const SHOP_CATALOG: ShopItem[] = [
  {
    id: "streak-freeze",
    name: "Streak Freeze",
    description: "Lindungi streak lo dari putus 1 hari. Otomatis aktif kalau lo lupa salin kupon.",
    icon: "🛡️",
    price: 150,
    category: "utility",
    consumable: true,
    flair: "hot",
  },
  {
    id: "login-boost-2x",
    name: "Login Boost ×2",
    description: "Hadiah daily login dikali 2 selama 7 hari ke depan. Stack dengan cycle multiplier!",
    icon: "⚡",
    price: 300,
    category: "boost",
    consumable: true,
    durationDays: 7,
    flair: "hot",
  },
  {
    id: "golden-border",
    name: "Golden Border",
    description: "Border emas elegan di semua kupon favorit lo.",
    icon: "✨",
    price: 200,
    category: "cosmetic",
    consumable: false,
  },
  {
    id: "badge-vip",
    name: "VIP Badge",
    description: "Tampilin badge VIP di profil lo. Eksklusif.",
    icon: "👑",
    price: 250,
    category: "cosmetic",
    consumable: false,
  },
  {
    id: "badge-master",
    name: "Coupon Master Badge",
    description: "Badge premium untuk pro hunter. Cocok buat lo yang udah seasoned.",
    icon: "🏆",
    price: 500,
    category: "cosmetic",
    consumable: false,
    flair: "limited",
  },
  {
    id: "mystery-pack",
    name: "Mystery Coupon Pack",
    description: "Unlock 3 kupon premium curated dari editor SuperKupon.",
    icon: "🎁",
    price: 1000,
    category: "utility",
    consumable: true,
    flair: "limited",
  },
];

export function getItem(id: string): ShopItem | undefined {
  return SHOP_CATALOG.find((i) => i.id === id);
}

interface InventoryData {
  ownedPermanent: string[];
  consumables: Record<string, number>;
  totalPurchases: number;
}

const DEFAULT_DATA: InventoryData = {
  ownedPermanent: [],
  consumables: {},
  totalPurchases: 0,
};

interface Ctx {
  data: InventoryData;
  hydrated: boolean;
  isOwned: (itemId: string) => boolean;
  consumableCount: (itemId: string) => number;
  purchase: (itemId: string) => { ok: true } | { ok: false; reason: string };
  consumeStreakFreeze: () => boolean;
  pendingMysteryReveal: number;
  consumeMysteryReveal: () => void;
}

const InventoryCtx = createContext<Ctx | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const { data: dlData, spendCoins, addBoost } = useDailyLogin();
  const [data, setData] = useState<InventoryData>(DEFAULT_DATA);
  const [hydrated, setHydrated] = useState(false);
  const [pendingMysteryReveal, setPendingMysteryReveal] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<InventoryData>;
        setData({ ...DEFAULT_DATA, ...parsed });
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

  const isOwned = useCallback(
    (itemId: string) => data.ownedPermanent.includes(itemId),
    [data.ownedPermanent],
  );

  const consumableCount = useCallback(
    (itemId: string) => data.consumables[itemId] ?? 0,
    [data.consumables],
  );

  const purchase = useCallback(
    (itemId: string): { ok: true } | { ok: false; reason: string } => {
      const item = getItem(itemId);
      if (!item) return { ok: false, reason: "Item tidak ditemukan" };
      if (!item.consumable && data.ownedPermanent.includes(itemId)) {
        return { ok: false, reason: "Item sudah dimiliki" };
      }
      if (dlData.totalCoins < item.price) {
        return { ok: false, reason: `Butuh ${item.price - dlData.totalCoins} coin lagi` };
      }
      const ok = spendCoins(item.price);
      if (!ok) return { ok: false, reason: "Gagal kurangi coin" };

      setData((prev) => {
        if (item.consumable) {
          return {
            ...prev,
            consumables: {
              ...prev.consumables,
              [itemId]: (prev.consumables[itemId] ?? 0) + 1,
            },
            totalPurchases: prev.totalPurchases + 1,
          };
        }
        return {
          ...prev,
          ownedPermanent: [...prev.ownedPermanent, itemId],
          totalPurchases: prev.totalPurchases + 1,
        };
      });

      // Side-effects: boost items auto-activate
      if (item.id === "login-boost-2x" && item.durationDays) {
        addBoost("login-boost-2x", item.durationDays);
      }
      if (item.id === "mystery-pack") {
        setPendingMysteryReveal((p) => p + 1);
      }

      // Celebration
      void import("@/lib/confetti").then(({ fireConfetti }) => {
        fireConfetti({
          particleCount: 80,
          colors: ["#a78bfa", "#c084fc", "#fbbf24", "#f472b6"],
        });
      });

      return { ok: true };
    },
    [data.ownedPermanent, dlData.totalCoins, spendCoins, addBoost],
  );

  const consumeStreakFreeze = useCallback((): boolean => {
    let consumed = false;
    setData((prev) => {
      const cur = prev.consumables["streak-freeze"] ?? 0;
      if (cur <= 0) return prev;
      consumed = true;
      return {
        ...prev,
        consumables: { ...prev.consumables, "streak-freeze": cur - 1 },
      };
    });
    return consumed;
  }, []);

  const consumeMysteryReveal = useCallback(() => {
    setPendingMysteryReveal((p) => Math.max(0, p - 1));
    setData((prev) => {
      const cur = prev.consumables["mystery-pack"] ?? 0;
      if (cur <= 0) return prev;
      return {
        ...prev,
        consumables: { ...prev.consumables, "mystery-pack": cur - 1 },
      };
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      data,
      hydrated,
      isOwned,
      consumableCount,
      purchase,
      consumeStreakFreeze,
      pendingMysteryReveal,
      consumeMysteryReveal,
    }),
    [data, hydrated, isOwned, consumableCount, purchase, consumeStreakFreeze, pendingMysteryReveal, consumeMysteryReveal],
  );

  return <InventoryCtx.Provider value={value}>{children}</InventoryCtx.Provider>;
}

export function useInventory(): Ctx {
  const ctx = useContext(InventoryCtx);
  if (!ctx) throw new Error("useInventory must be inside InventoryProvider");
  return ctx;
}
