export const LOCALES = ["id", "en", "ms"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "id";

export const LOCALE_META: Record<Locale, { name: string; flag: string }> = {
  id: { name: "Bahasa Indonesia", flag: "🇮🇩" },
  en: { name: "English", flag: "🇬🇧" },
  ms: { name: "Bahasa Melayu", flag: "🇲🇾" },
};

export function isLocale(s: string | undefined): s is Locale {
  return !!s && (LOCALES as readonly string[]).includes(s);
}
