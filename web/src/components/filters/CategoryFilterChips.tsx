"use client";

import { useEffect, useState } from "react";

import { isAbortError, listCategories } from "@/lib/api";
import type { Category } from "@/lib/types";

const ICON_MAP: Record<string, string> = {
  ecommerce: "🛒",
  ewallet: "💳",
  travel: "✈️",
  food: "🍴",
  transport: "🚗",
  fashion: "👗",
  electronics: "💻",
  entertainment: "🎬",
  health: "💊",
  beauty: "💄",
};

function categoryEmoji(slug: string, icon?: string | null): string {
  if (slug in ICON_MAP) return ICON_MAP[slug];
  if (icon && icon in ICON_MAP) return ICON_MAP[icon];
  return "🏷️";
}

interface Props {
  activeSlug?: string;
  onSelect: (slug: string | undefined) => void;
}

export function CategoryFilterChips({ activeSlug, onSelect }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const ctrl = new AbortController();
    listCategories({ signal: ctrl.signal })
      .then((items) => {
        if (!ctrl.signal.aborted) setCategories(items);
      })
      .catch((e) => {
        if (!isAbortError(e)) setCategories([]);
      });
    return () => ctrl.abort();
  }, []);

  if (categories.length === 0) return null;
  const hasActive = activeSlug !== undefined;

  return (
    <div className="flex snap-x snap-mandatory items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-gray-500/30 [&::-webkit-scrollbar-track]:bg-transparent">
      <button
        type="button"
        onClick={() => onSelect(undefined)}
        aria-pressed={!hasActive}
        className={[
          "flex flex-none snap-start items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
          !hasActive
            ? "bg-emerald-500 text-white shadow-glow ring-2 ring-emerald-400/30"
            : "border border-white/15 bg-white/5 text-gray-300 hover:border-emerald-400 hover:bg-emerald-500/10 hover:text-white",
        ].join(" ")}
      >
        <span aria-hidden>📂</span>
        <span>Semua Kategori</span>
      </button>
      {categories.map((c) => {
        const active = activeSlug === c.slug;
        return (
          <button
            key={c.slug}
            type="button"
            onClick={() => onSelect(active ? undefined : c.slug)}
            aria-pressed={active}
            title={c.name}
            className={[
              "flex flex-none snap-start items-center gap-1.5 rounded-full px-3 py-1 text-xs transition",
              active
                ? "bg-emerald-500 text-white shadow-glow ring-2 ring-emerald-400/30"
                : "border border-white/15 bg-white/5 text-gray-300 hover:border-emerald-400 hover:bg-emerald-500/10 hover:text-white",
            ].join(" ")}
          >
            <span aria-hidden>{categoryEmoji(c.slug, c.icon)}</span>
            <span className="font-medium">{c.name}</span>
          </button>
        );
      })}
    </div>
  );
}
