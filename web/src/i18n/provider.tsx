"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { DEFAULT_LOCALE, LOCALES, type Locale, isLocale } from "./config";
import id from "./dictionaries/id.json";
import en from "./dictionaries/en.json";
import ms from "./dictionaries/ms.json";

type Dict = typeof id;

const DICTS: Record<Locale, Dict> = { id, en, ms };

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const COOKIE_KEY = "kh_lang";
const STORAGE_KEY = "kh_lang";

function readInitialLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const fromStorage = window.localStorage.getItem(STORAGE_KEY);
  if (isLocale(fromStorage)) return fromStorage;
  const fromCookie = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${COOKIE_KEY}=`))
    ?.split("=")[1];
  if (isLocale(fromCookie)) return fromCookie;
  const navLang = navigator.language?.split("-")[0];
  if (isLocale(navLang)) return navLang;
  return DEFAULT_LOCALE;
}

function lookup(dict: Dict, path: string): string | undefined {
  return path.split(".").reduce<unknown>((acc, k) => {
    if (acc && typeof acc === "object" && k in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[k];
    }
    return undefined;
  }, dict) as string | undefined;
}

function format(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLocaleState(readInitialLocale());
    setHydrated(true);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, l);
      document.cookie = `${COOKIE_KEY}=${l}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = l;
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = DICTS[locale];
      const fallback = DICTS[DEFAULT_LOCALE];
      const val = lookup(dict, key) ?? lookup(fallback, key) ?? key;
      return format(val, vars);
    },
    [locale]
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  return (
    <I18nContext.Provider value={value}>
      {hydrated ? children : <div style={{ visibility: "hidden" }}>{children}</div>}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export { LOCALES, DEFAULT_LOCALE };
export type { Locale };
