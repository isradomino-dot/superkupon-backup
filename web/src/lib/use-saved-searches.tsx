"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sk_saved_searches_v1";
const MAX_SAVED = 10;

export interface SavedSearch {
  id: string;
  query: string;
  createdAt: number;
  lastChecked: number;
  /** Coupon IDs we've already notified user about for this saved query. */
  notifiedCouponIds: number[];
}

function genId(): string {
  return `s_${Math.floor((typeof performance !== "undefined" ? performance.now() : 1) * 1000)}`;
}

export function useSavedSearches() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSearches(
            parsed.filter(
              (s): s is SavedSearch =>
                s && typeof s.id === "string" && typeof s.query === "string",
            ),
          );
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
    } catch {
      /* ignore */
    }
  }, [searches, hydrated]);

  const isSaved = useCallback(
    (query: string) =>
      searches.some((s) => s.query.toLowerCase() === query.trim().toLowerCase()),
    [searches],
  );

  const add = useCallback((query: string): SavedSearch | null => {
    const q = query.trim();
    if (q.length < 2) return null;
    let created: SavedSearch | null = null;
    setSearches((prev) => {
      if (prev.some((s) => s.query.toLowerCase() === q.toLowerCase())) return prev;
      created = {
        id: genId(),
        query: q,
        createdAt: Date.now(),
        lastChecked: Date.now(),
        notifiedCouponIds: [],
      };
      return [created, ...prev].slice(0, MAX_SAVED);
    });
    return created;
  }, []);

  const remove = useCallback((id: string) => {
    setSearches((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const removeByQuery = useCallback((query: string) => {
    const q = query.trim().toLowerCase();
    setSearches((prev) => prev.filter((s) => s.query.toLowerCase() !== q));
  }, []);

  const markNotified = useCallback((id: string, couponIds: number[]) => {
    setSearches((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              lastChecked: Date.now(),
              notifiedCouponIds: Array.from(
                new Set([...s.notifiedCouponIds, ...couponIds]),
              ).slice(-200), // cap to last 200
            }
          : s,
      ),
    );
  }, []);

  const clearAll = useCallback(() => setSearches([]), []);

  return {
    searches,
    count: searches.length,
    isSaved,
    add,
    remove,
    removeByQuery,
    markNotified,
    clearAll,
    hydrated,
  };
}
