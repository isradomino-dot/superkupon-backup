"use client";

import { useCallback, useEffect, useState } from "react";

import type { SortKey } from "@/components/FilterBar";
import type { QuickFilterState } from "@/components/QuickFilters";

const STORAGE_KEY = "sk_filter_presets_v1";
const MAX_PRESETS = 8;

export interface FilterPreset {
  id: string;
  name: string;
  sort: SortKey;
  minQuality: number;
  quick: QuickFilterState;
  createdAt: number;
}

export interface FilterSnapshot {
  sort: SortKey;
  minQuality: number;
  quick: QuickFilterState;
}

function generateId(): string {
  return `p_${Math.floor((typeof performance !== "undefined" ? performance.now() : 1) * 1000)}_${Math.floor(Math.random() * 9999)}`;
}

function defaultName(snap: FilterSnapshot): string {
  const parts: string[] = [];
  if (snap.quick.merchant) parts.push(snap.quick.merchant);
  if (snap.quick.category) parts.push(snap.quick.category);
  if (snap.quick.region) parts.push(snap.quick.region);
  if (snap.quick.discountType) parts.push(snap.quick.discountType);
  if (snap.quick.minDiscount) parts.push(`≥${snap.quick.minDiscount}%`);
  if (snap.minQuality > 0) parts.push(`Q${snap.minQuality}+`);
  if (snap.sort !== "newest") parts.push(snap.sort);
  return parts.length === 0 ? "Default" : parts.join(" · ");
}

export function useFilterPresets() {
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setPresets(parsed);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    } catch {
      /* ignore */
    }
  }, [presets, hydrated]);

  const savePreset = useCallback(
    (snap: FilterSnapshot, customName?: string): FilterPreset | null => {
      // Don't save empty presets
      const isEmpty =
        snap.minQuality === 0 &&
        !snap.quick.merchant &&
        !snap.quick.category &&
        !snap.quick.region &&
        !snap.quick.discountType &&
        !snap.quick.minDiscount &&
        snap.sort === "newest";
      if (isEmpty) return null;

      const name = (customName?.trim() || defaultName(snap)).slice(0, 40);
      const preset: FilterPreset = {
        id: generateId(),
        name,
        sort: snap.sort,
        minQuality: snap.minQuality,
        quick: snap.quick,
        createdAt: Date.now(),
      };
      setPresets((prev) => [preset, ...prev].slice(0, MAX_PRESETS));
      return preset;
    },
    [],
  );

  const removePreset = useCallback((id: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clearAll = useCallback(() => setPresets([]), []);

  return { presets, savePreset, removePreset, clearAll, hydrated };
}
