"use client";

import type { Dispatch, SetStateAction } from "react";

export interface QuickFilterState {
  category?: string;
  merchant?: string;
  discountType?: string;
  minDiscount?: number;
  region?: string;
}

interface Chip {
  id: string;
  label: string;
  emoji: string;
  apply: (s: QuickFilterState) => QuickFilterState;
  isActive: (s: QuickFilterState) => boolean;
}

const CHIPS: Chip[] = [
  {
    id: "fashion",
    label: "Fashion",
    emoji: "👗",
    apply: (s) => ({ ...s, category: s.category === "fashion" ? undefined : "fashion" }),
    isActive: (s) => s.category === "fashion",
  },
  {
    id: "shopee",
    label: "Shopee",
    emoji: "🛍️",
    apply: (s) => ({ ...s, merchant: s.merchant === "shopee" ? undefined : "shopee" }),
    isActive: (s) => s.merchant === "shopee",
  },
  {
    id: "ovo",
    label: "OVO",
    emoji: "🟣",
    apply: (s) => ({ ...s, merchant: s.merchant === "ovo" ? undefined : "ovo" }),
    isActive: (s) => s.merchant === "ovo",
  },
  {
    id: "discount50",
    label: "Diskon >50%",
    emoji: "💥",
    apply: (s) =>
      s.minDiscount === 50 && s.discountType === "percent"
        ? { ...s, minDiscount: 0, discountType: undefined }
        : { ...s, minDiscount: 50, discountType: "percent" },
    isActive: (s) => s.minDiscount === 50 && s.discountType === "percent",
  },
  {
    id: "cashback",
    label: "Cashback",
    emoji: "💵",
    apply: (s) =>
      s.discountType === "cashback" && s.minDiscount !== 50
        ? { ...s, discountType: undefined }
        : { ...s, discountType: "cashback", minDiscount: 0 },
    isActive: (s) => s.discountType === "cashback" && s.minDiscount !== 50,
  },
  {
    id: "jakarta",
    label: "Jakarta",
    emoji: "🏙️",
    apply: (s) => ({ ...s, region: s.region === "jakarta" ? undefined : "jakarta" }),
    isActive: (s) => s.region === "jakarta",
  },
  {
    id: "local",
    label: "Lokal Indonesia",
    emoji: "🇮🇩",
    apply: (s) => ({ ...s, region: s.region === "local" ? undefined : "local" }),
    isActive: (s) => s.region === "local",
  },
];

interface Props {
  state: QuickFilterState;
  setState: Dispatch<SetStateAction<QuickFilterState>>;
}

export function QuickFilters({ state, setState }: Props) {
  const anyActive =
    state.category || state.merchant || state.discountType || (state.minDiscount ?? 0) > 0 || state.region;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        Quick filter:
      </span>
      {CHIPS.map((chip) => {
        const active = chip.isActive(state);
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => setState(chip.apply(state))}
            className={[
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition",
              active
                ? "bg-brand-500 text-white shadow-glow ring-2 ring-brand-400/30"
                : "border border-white/15 bg-white/5 text-gray-300 hover:border-brand-400 hover:bg-brand-500/10 hover:text-white",
            ].join(" ")}
            aria-pressed={active}
          >
            <span aria-hidden>{chip.emoji}</span>
            <span>{chip.label}</span>
          </button>
        );
      })}
      {anyActive && (
        <button
          type="button"
          onClick={() => setState({})}
          className="ml-1 text-xs font-medium text-brand-400 hover:underline"
        >
          ✕ Reset
        </button>
      )}
    </div>
  );
}
