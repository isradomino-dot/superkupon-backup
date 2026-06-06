"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sk_search_history_v1";
const MAX_ENTRIES = 10;

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setHistory(parsed.filter((s): s is string => typeof s === "string" && s.trim().length > 0));
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      /* ignore */
    }
  }, [history, hydrated]);

  const addEntry = useCallback((q: string) => {
    const term = q.trim();
    if (term.length < 2) return;
    setHistory((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== term.toLowerCase());
      return [term, ...filtered].slice(0, MAX_ENTRIES);
    });
  }, []);

  const removeEntry = useCallback((q: string) => {
    setHistory((prev) => prev.filter((s) => s !== q));
  }, []);

  const clearAll = useCallback(() => setHistory([]), []);

  return { history, addEntry, removeEntry, clearAll, hydrated };
}
