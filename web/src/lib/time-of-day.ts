export type TimeOfDay = "morning" | "noon" | "sunset" | "night";

export interface TimeOfDayTheme {
  period: TimeOfDay;
  /** Hero gradient utility classes (Tailwind from-* via-* to-*) */
  gradient: string;
  /** Ambient decoration emoji on hero */
  emoji: string;
  /** Greeting copy */
  greeting: string;
  /** Sub-greeting (mood) */
  subline: string;
}

/**
 * Return current period based on local hour.
 * 05-10 morning · 10-17 noon · 17-20 sunset · 20-05 night
 */
export function getTimeOfDay(date: Date = new Date()): TimeOfDay {
  const h = date.getHours();
  if (h >= 5 && h < 10) return "morning";
  if (h >= 10 && h < 17) return "noon";
  if (h >= 17 && h < 20) return "sunset";
  return "night";
}

export function timeOfDayTheme(period: TimeOfDay = getTimeOfDay()): TimeOfDayTheme {
  switch (period) {
    case "morning":
      return {
        period,
        gradient: "from-violet-500 via-pink-500 to-orange-400",
        emoji: "☀️",
        greeting: "Selamat pagi!",
        subline: "Mulai hari dengan deals fresh — promo banyak baru di-update.",
      };
    case "noon":
      return {
        period,
        gradient: "from-violet-600 via-purple-700 to-blue-700",
        emoji: "🌞",
        greeting: "Selamat siang!",
        subline: "Lunch break? Cek kupon makanan + flash sale yang lagi rame.",
      };
    case "sunset":
      return {
        period,
        gradient: "from-orange-500 via-rose-500 to-purple-600",
        emoji: "🌅",
        greeting: "Selamat sore!",
        subline: "Time to wind down — banyak promo weekend prep aktif sekarang.",
      };
    case "night":
      return {
        period,
        gradient: "from-indigo-700 via-violet-900 to-slate-900",
        emoji: "🌙",
        greeting: "Selamat malam!",
        subline: "Late-night shopper? Banyak voucher fast delivery + cashback.",
      };
  }
}
