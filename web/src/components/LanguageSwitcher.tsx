"use client";

import { useRef } from "react";

import { useI18n, LOCALES, type Locale } from "@/i18n/provider";
import { LOCALE_META } from "@/i18n/config";
import { fireConfetti } from "@/lib/confetti";

// Flag-themed color palettes per locale
const FLAG_COLORS: Record<Locale, string[]> = {
  id: ["#dc143c", "#dc143c", "#dc143c", "#ffffff", "#ffffff", "#facc15"],
  en: ["#012169", "#012169", "#ffffff", "#ffffff", "#c8102e", "#c8102e"],
  ms: ["#cc0000", "#cc0000", "#ffffff", "#ffffff", "#010066", "#facc15"],
};

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const selectRef = useRef<HTMLSelectElement>(null);

  const handleChange = (newLocale: Locale) => {
    if (newLocale === locale) return;
    setLocale(newLocale);

    const rect = selectRef.current?.getBoundingClientRect();
    if (rect) {
      fireConfetti({
        origin: { x: rect.left + rect.width / 2, y: rect.bottom + 8 },
        particleCount: 60,
        colors: FLAG_COLORS[newLocale],
        spread: 100,
        startVelocity: 11,
        ticks: 110,
      });
    }
  };

  return (
    <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
      <span className="sr-only">{t("language.label")}</span>
      <select
        ref={selectRef}
        value={locale}
        onChange={(e) => handleChange(e.target.value as Locale)}
        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        aria-label={t("language.label")}
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_META[l].flag} {LOCALE_META[l].name}
          </option>
        ))}
      </select>
    </label>
  );
}
