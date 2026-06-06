"use client";

import type { Dispatch, SetStateAction } from "react";
import type { SortKey } from "@/components/FilterBar";

interface Preset {
  id: SortKey;
  label: string;
  emoji: string;
  hint: string;
}

const PRESETS: Preset[] = [
  {
    id: "discount",
    label: "Diskon Terbesar",
    emoji: "💥",
    hint: "Urut dari nilai diskon tertinggi",
  },
  {
    id: "expiring",
    label: "Hampir Berakhir",
    emoji: "⏰",
    hint: "Urut dari yang paling dekat expired",
  },
  {
    id: "popular",
    label: "Paling Populer",
    emoji: "🔥",
    hint: "Urut dari view + redeem count tertinggi",
  },
];

interface Props {
  sort: SortKey;
  setSort: Dispatch<SetStateAction<SortKey>>;
}

export function SortPresets({ sort, setSort }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        Urutkan cepat:
      </span>
      {PRESETS.map((p) => {
        const active = sort === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => setSort(active ? "newest" : p.id)}
            aria-pressed={active}
            title={p.hint}
            className={[
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition",
              active
                ? "bg-brand-500 text-white shadow-glow ring-2 ring-brand-400/30"
                : "border border-white/15 bg-white/5 text-gray-300 hover:border-brand-400 hover:bg-brand-500/10 hover:text-white",
            ].join(" ")}
          >
            <span aria-hidden>{p.emoji}</span>
            <span>{p.label}</span>
          </button>
        );
      })}
      {sort !== "newest" && (
        <button
          type="button"
          onClick={() => setSort("newest")}
          className="ml-1 text-xs font-medium text-brand-400 hover:underline"
        >
          ✕ Reset urutan
        </button>
      )}
    </div>
  );
}
