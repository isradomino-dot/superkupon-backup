"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "sk_auto_refresh_v1";

export const INTERVAL_OPTIONS = [
  { value: 0, label: "Off" },
  { value: 30, label: "30 detik" },
  { value: 60, label: "1 menit" },
  { value: 120, label: "2 menit" },
  { value: 300, label: "5 menit" },
] as const;

export type AutoRefreshIntervalSec = (typeof INTERVAL_OPTIONS)[number]["value"];

interface Settings {
  intervalSec: AutoRefreshIntervalSec;
}

const DEFAULT_SETTINGS: Settings = { intervalSec: 0 };

function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    if (typeof parsed.intervalSec === "number") {
      return { intervalSec: parsed.intervalSec as AutoRefreshIntervalSec };
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_SETTINGS;
}

interface Options {
  /** Callback fired at each interval tick. Returning a Promise marks the refresh as ongoing. */
  onRefresh: () => void | Promise<void>;
}

export interface AutoRefreshState {
  intervalSec: AutoRefreshIntervalSec;
  setIntervalSec: (sec: AutoRefreshIntervalSec) => void;
  isActive: boolean; // interval > 0
  isVisible: boolean; // page visible
  isRunning: boolean; // refresh callback in-flight
  lastRefreshAt: number | null;
  nextRefreshIn: number | null; // seconds; null if Off
  refreshNow: () => Promise<void>;
}

export function useAutoRefresh({ onRefresh }: Options): AutoRefreshState {
  const [intervalSec, setIntervalSecState] = useState<AutoRefreshIntervalSec>(0);
  const [hydrated, setHydrated] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(0);
  const onRefreshRef = useRef(onRefresh);

  // keep callback ref fresh without restarting interval
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  // Hydrate settings
  useEffect(() => {
    const s = loadSettings();
    setIntervalSecState(s.intervalSec);
    setHydrated(true);
  }, []);

  // Persist
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ intervalSec }));
    } catch {
      /* ignore */
    }
  }, [intervalSec, hydrated]);

  // Page Visibility API — pause when tab inactive
  useEffect(() => {
    if (typeof document === "undefined") return;
    const sync = () => setIsVisible(!document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  const runRefresh = useCallback(async () => {
    setIsRunning(true);
    try {
      await Promise.resolve(onRefreshRef.current());
    } catch {
      /* swallow — caller handles errors */
    } finally {
      setLastRefreshAt(Date.now());
      setIsRunning(false);
    }
  }, []);

  // Main interval
  useEffect(() => {
    if (!hydrated) return;
    if (intervalSec <= 0) return;
    if (!isVisible) return;

    const id = setInterval(() => {
      runRefresh();
    }, intervalSec * 1000);
    return () => clearInterval(id);
  }, [intervalSec, isVisible, hydrated, runRefresh]);

  // 1-second ticker for countdown display — only when active
  useEffect(() => {
    if (intervalSec <= 0 || !isVisible) return;
    const id = setInterval(() => setNowTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [intervalSec, isVisible]);

  const setIntervalSec = useCallback((sec: AutoRefreshIntervalSec) => {
    setIntervalSecState(sec);
  }, []);

  const nextRefreshIn = (() => {
    if (intervalSec <= 0) return null;
    if (!isVisible) return null;
    if (lastRefreshAt === null) return intervalSec;
    void nowTick; // dep
    const elapsed = Math.floor((Date.now() - lastRefreshAt) / 1000);
    return Math.max(0, intervalSec - elapsed);
  })();

  return {
    intervalSec,
    setIntervalSec,
    isActive: intervalSec > 0,
    isVisible,
    isRunning,
    lastRefreshAt,
    nextRefreshIn,
    refreshNow: runRefresh,
  };
}
