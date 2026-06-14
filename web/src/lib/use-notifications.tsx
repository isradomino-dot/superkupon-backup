"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { Coupon } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001";
const STORAGE_KEY = "dk_notif_settings_v1";
const SEEN_KEY = "dk_notif_seen_ids_v1";
const POLL_INTERVAL_MS = 60_000;

export interface NotifSettings {
  enableNew: boolean;
  enableExpiring: boolean;
  merchantFilter?: string;
  browserPush: boolean;
  expiringWithinDays: number;
}

const DEFAULTS: NotifSettings = {
  enableNew: true,
  enableExpiring: true,
  browserPush: false,
  expiringWithinDays: 3,
};

interface NotifData {
  new: Coupon[];
  expiring: Coupon[];
  asOf: string;
}

interface NotifContextValue {
  settings: NotifSettings;
  setSettings: (s: Partial<NotifSettings>) => void;
  data: NotifData;
  newCount: number;
  expiringCount: number;
  totalCount: number;
  loading: boolean;
  enableShopeeAlert: () => void;
  requestBrowserPermission: () => Promise<NotificationPermission>;
  resetSeen: () => void;
}

const NotifContext = createContext<NotifContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<NotifSettings>(DEFAULTS);
  const [data, setData] = useState<NotifData>({ new: [], expiring: [], asOf: new Date().toISOString() });
  const [loading, setLoading] = useState(false);
  const sinceRef = useRef<string>(new Date().toISOString());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSettingsState({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {}
  }, []);

  const setSettings = useCallback((patch: Partial<NotifSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const enableShopeeAlert = useCallback(() => {
    setSettings({
      merchantFilter: "shopee",
      enableNew: true,
      enableExpiring: true,
    });
  }, [setSettings]);

  const requestBrowserPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window === "undefined" || !("Notification" in window)) return "denied";
    if (Notification.permission === "granted") {
      setSettings({ browserPush: true });
      return "granted";
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") setSettings({ browserPush: true });
    return perm;
  }, [setSettings]);

  const resetSeen = useCallback(() => {
    try {
      localStorage.removeItem(SEEN_KEY);
      sinceRef.current = new Date().toISOString();
    } catch {}
  }, []);

  const showBrowserPush = useCallback(
    (newCoupons: Coupon[]) => {
      if (!settings.browserPush || typeof window === "undefined" || !("Notification" in window)) return;
      if (Notification.permission !== "granted") return;

      let seen: number[] = [];
      try {
        seen = JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
      } catch {}

      let changed = false;
      for (const c of newCoupons) {
        if (seen.includes(c.id)) continue;
        new Notification(`🎟️ Kupon baru: ${c.merchant.name}`, {
          body: `${c.title}${c.code ? ` · ${c.code}` : ""}`,
          icon: "/icon-192.svg",
          tag: `coupon-${c.id}`,
        });
        seen.push(c.id);
        changed = true;
      }
      if (changed) {
        try {
          localStorage.setItem(SEEN_KEY, JSON.stringify(seen.slice(-300)));
        } catch {}
      }
    },
    [settings.browserPush]
  );

  useEffect(() => {
    // Abort the *previous* poll's in-flight request when a new tick starts or
    // the effect unmounts, so we never race two responses against the same setState.
    let inflight: AbortController | null = null;

    const poll = async () => {
      inflight?.abort();
      const ctrl = new AbortController();
      inflight = ctrl;

      const params = new URLSearchParams();
      params.set("since", sinceRef.current);
      params.set("within_days", String(settings.expiringWithinDays));
      if (settings.merchantFilter) params.set("merchant", settings.merchantFilter);

      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/notifications?${params}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (ctrl.signal.aborted) return;
        setData({
          new: json.new ?? [],
          expiring: json.expiring ?? [],
          asOf: json.as_of,
        });
        if (settings.enableNew) showBrowserPush(json.new ?? []);
      } catch {
        // silent — abort or backend down
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    };

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      inflight?.abort();
      clearInterval(id);
    };
  }, [settings.merchantFilter, settings.expiringWithinDays, settings.enableNew, showBrowserPush]);

  const newCount = settings.enableNew ? data.new.length : 0;
  const expiringCount = settings.enableExpiring ? data.expiring.length : 0;
  const totalCount = newCount + expiringCount;

  const value = useMemo<NotifContextValue>(
    () => ({
      settings,
      setSettings,
      data,
      newCount,
      expiringCount,
      totalCount,
      loading,
      enableShopeeAlert,
      requestBrowserPermission,
      resetSeen,
    }),
    [settings, setSettings, data, newCount, expiringCount, totalCount, loading, enableShopeeAlert, requestBrowserPermission, resetSeen]
  );

  return <NotifContext.Provider value={value}>{children}</NotifContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotifContext);
  if (!ctx) throw new Error("useNotifications must be inside <NotificationProvider>");
  return ctx;
}
