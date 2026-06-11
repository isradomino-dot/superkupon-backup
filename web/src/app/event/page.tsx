"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export const dynamic = "force-dynamic";

interface Event {
  id: string;
  name: string;
  emoji: string;
  date: string; // ISO format YYYY-MM-DD
  color: "rose" | "purple" | "amber" | "emerald" | "fuchsia" | "sky" | "cyan";
  tagline: string;
  description: string;
  expectedMerchants: string[];
  scale: "mega" | "big" | "medium" | "regular";
}

// Indonesia's big shopping events for 2026-2027
const EVENTS: Event[] = [
  {
    id: "lebaran-2026",
    name: "Lebaran (Idul Fitri)",
    emoji: "🌙",
    date: "2027-03-29",
    color: "emerald",
    tagline: "Persiapan Lebaran — promo baju baru, mudik, & THR",
    description: "Diskon massive di kategori fashion, makanan, transportasi. Banyak merchant kasih bundle deals untuk persiapan mudik & lebaran.",
    expectedMerchants: ["Shopee", "Tokopedia", "Zalora", "Bukalapak", "Traveloka", "Tiket.com"],
    scale: "mega",
  },
  {
    id: "harbolnas",
    name: "Hari Belanja Online Nasional",
    emoji: "🛒",
    date: "2026-12-12",
    color: "rose",
    tagline: "HARBOLNAS — puncak diskon online tahunan!",
    description: "Hari belanja online resmi Indonesia. Hampir semua merchant ikut, diskon bisa sampai 90% di kategori tertentu.",
    expectedMerchants: ["Shopee", "Tokopedia", "Lazada", "Blibli", "Zalora", "Bukalapak"],
    scale: "mega",
  },
  {
    id: "11-11",
    name: "11.11 Singles Day",
    emoji: "🔥",
    date: "2026-11-11",
    color: "fuchsia",
    tagline: "THE BIGGEST! Tanggal sale terbesar dunia",
    description: "Singles Day asal Tiongkok yang jadi tradisi global. Shopee dan Lazada biasanya kompetisi kasih promo terbaik.",
    expectedMerchants: ["Shopee", "Tokopedia", "Lazada", "Blibli"],
    scale: "mega",
  },
  {
    id: "10-10",
    name: "10.10 Double Day",
    emoji: "🔟",
    date: "2026-10-10",
    color: "rose",
    tagline: "Tanggal kembar Oktober — warm up 11.11",
    description: "Marketing event tanggal kembar. Banyak merchant warm-up sebelum 11.11 dengan diskon menarik.",
    expectedMerchants: ["Shopee", "Tokopedia", "Lazada"],
    scale: "big",
  },
  {
    id: "9-9",
    name: "9.9 Super Shopping",
    emoji: "9️⃣",
    date: "2026-09-09",
    color: "rose",
    tagline: "9.9 = mega sale, lebih besar dari 8.8",
    description: "Tanggal kembar besar pertama menjelang akhir tahun. Diskon mulai banyak muncul, flash sale agresif.",
    expectedMerchants: ["Shopee", "Tokopedia", "Lazada", "Blibli"],
    scale: "big",
  },
  {
    id: "8-8",
    name: "8.8 Mega Sale",
    emoji: "8️⃣",
    date: "2026-08-08",
    color: "amber",
    tagline: "Tanggal kembar = big promo day",
    description: "Kick-off Q3 sale season. Banyak voucher cashback dan gratis ongkir tersedia.",
    expectedMerchants: ["Shopee", "Tokopedia", "Lazada"],
    scale: "big",
  },
  {
    id: "kemerdekaan",
    name: "Hari Kemerdekaan RI",
    emoji: "🇮🇩",
    date: "2026-08-17",
    color: "amber",
    tagline: "Promo merah putih, diskon nasional 17%",
    description: "Banyak merchant kasih diskon 17% (sesuai tanggal). Free shipping spesial untuk produk lokal Indonesia.",
    expectedMerchants: ["Shopee", "Tokopedia", "Bukalapak", "Blibli"],
    scale: "medium",
  },
  {
    id: "7-7",
    name: "7.7 Mid Year Sale",
    emoji: "7️⃣",
    date: "2026-07-07",
    color: "amber",
    tagline: "Mid-year flash sale, banyak free shipping",
    description: "Tanggal kembar pertama mid-year. Merchant biasanya kasih voucher gratis ongkir besar-besaran.",
    expectedMerchants: ["Shopee", "Tokopedia", "Lazada"],
    scale: "medium",
  },
  {
    id: "idul-adha",
    name: "Idul Adha (Hari Raya Qurban)",
    emoji: "🐐",
    date: "2026-05-26",
    color: "emerald",
    tagline: "Holiday season — banyak diskon F&B",
    description: "Liburan singkat — banyak promo food & delivery, juga merchant kategori daging/sembako.",
    expectedMerchants: ["Shopee", "Tokopedia", "Grab", "Gojek"],
    scale: "medium",
  },
  {
    id: "tahun-baru-2027",
    name: "Tahun Baru 2027",
    emoji: "🎆",
    date: "2027-01-01",
    color: "purple",
    tagline: "Welcome 2027 — flash sale awal tahun",
    description: "Cleanup stock 2026 + welcome 2027. Beberapa merchant kasih diskon 'New Year New You' untuk gym, kursus, dll.",
    expectedMerchants: ["Shopee", "Tokopedia", "Tokopedia", "Blibli"],
    scale: "big",
  },
  {
    id: "natal",
    name: "Natal",
    emoji: "🎅",
    date: "2026-12-25",
    color: "rose",
    tagline: "Promo holiday season",
    description: "Holiday gifting season. Promo besar di kategori toy, fashion, electronics, dan F&B premium.",
    expectedMerchants: ["Tokopedia", "Blibli", "Zalora"],
    scale: "medium",
  },
  {
    id: "hari-ibu",
    name: "Hari Ibu",
    emoji: "👩‍👧",
    date: "2026-12-22",
    color: "rose",
    tagline: "Spesial untuk Mama tercinta",
    description: "Promo kategori beauty, fashion, kuliner, dan hampers. Cocok cari hadiah untuk Mama.",
    expectedMerchants: ["Shopee", "Zalora", "Tokopedia"],
    scale: "regular",
  },
];

// Color mappings
const COLOR_CLASSES = {
  rose: "from-rose-500/30 to-pink-500/15 border-rose-400/40 text-rose-300",
  purple: "from-purple-500/30 to-violet-500/15 border-purple-400/40 text-purple-300",
  amber: "from-amber-500/30 to-orange-500/15 border-amber-400/40 text-amber-300",
  emerald: "from-emerald-500/30 to-teal-500/15 border-emerald-400/40 text-emerald-300",
  fuchsia: "from-fuchsia-500/35 to-pink-500/20 border-fuchsia-400/50 text-fuchsia-300",
  sky: "from-sky-500/30 to-blue-500/15 border-sky-400/40 text-sky-300",
  cyan: "from-cyan-500/30 to-teal-500/15 border-cyan-400/40 text-cyan-300",
};

const SCALE_LABELS = {
  mega: { label: "MEGA EVENT", emoji: "🔥", color: "bg-rose-500" },
  big: { label: "BIG SALE", emoji: "⭐", color: "bg-amber-500" },
  medium: { label: "MEDIUM", emoji: "✨", color: "bg-violet-500" },
  regular: { label: "REGULAR", emoji: "📌", color: "bg-gray-500" },
};

function daysBetween(now: Date, eventDate: Date): number {
  const utc1 = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const utc2 = Date.UTC(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
  return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

function formatDateID(date: Date): string {
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function EventPage() {
  const now = useMemo(() => new Date(), []);
  const [filter, setFilter] = useState<"all" | "mega" | "big">("all");

  const upcomingEvents = useMemo(() => {
    return EVENTS
      .map((e) => ({
        ...e,
        eventDate: new Date(e.date),
      }))
      .filter((e) => {
        const days = daysBetween(now, e.eventDate);
        return days >= 0; // only future events
      })
      .filter((e) => filter === "all" || e.scale === filter || (filter === "big" && e.scale === "big"))
      .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
  }, [now, filter]);

  const nextEvent = upcomingEvents[0];
  const daysToNext = nextEvent ? daysBetween(now, nextEvent.eventDate) : 0;

  // Group by month
  const grouped = useMemo(() => {
    const groups: Record<string, typeof upcomingEvents> = {};
    upcomingEvents.forEach((e) => {
      const key = `${e.eventDate.getFullYear()}-${e.eventDate.getMonth()}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    return groups;
  }, [upcomingEvents]);

  const monthName = (key: string): string => {
    const [year, monthNum] = key.split("-").map(Number);
    const d = new Date(year, monthNum, 1);
    return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-brand-400/30 bg-gradient-to-br from-brand-500/20 via-purple-500/10 to-transparent p-6 sm:p-8 animate-slide-up">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-white sm:text-3xl">
          <span className="text-4xl">📅</span>
          Event Calendar
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-300">
          Kalender hari belanja besar Indonesia —{" "}
          <span className="font-semibold text-brand-300">plan ahead untuk hemat maksimal</span>.
          Tanggal kembar (8.8, 9.9, 11.11, 12.12), Lebaran, Harbolnas, dan event nasional lainnya.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand-500/15 px-3 py-1 text-xs text-brand-200">
          💡 Tip: countdown updated real-time. Save tanggal di calendar HP-mu!
        </div>
      </header>

      {/* NEXT EVENT — Big countdown hero */}
      {nextEvent && (
        <section
          className={[
            "overflow-hidden rounded-2xl border-2 bg-gradient-to-br p-6 shadow-2xl sm:p-8",
            COLOR_CLASSES[nextEvent.color],
          ].join(" ")}
        >
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
            🎯 NEXT EVENT
          </div>
          <div className="mt-3 grid gap-4 sm:grid-cols-[1fr,auto] sm:items-center">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="text-6xl">{nextEvent.emoji}</span>
                <div>
                  <h2 className="text-2xl font-black text-white sm:text-3xl">
                    {nextEvent.name}
                  </h2>
                  <p className="text-sm font-semibold text-white/80">
                    {nextEvent.tagline}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm text-white/90">{nextEvent.description}</p>
              <p className="mt-2 text-xs text-white/70">
                📅 {formatDateID(nextEvent.eventDate)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/20 bg-black/30 p-5 text-center sm:min-w-[180px]">
              <div className="text-xs font-bold uppercase tracking-widest text-white/70">
                Tinggal
              </div>
              <div className="mt-1 font-mono text-5xl font-black text-white">
                {daysToNext}
              </div>
              <div className="text-xs text-white/70">
                {daysToNext === 0 ? "HARI INI!" : daysToNext === 1 ? "hari" : "hari lagi"}
              </div>
            </div>
          </div>

          {nextEvent.expectedMerchants.length > 0 && (
            <div className="mt-5 border-t border-white/20 pt-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                🏪 Merchant yang biasanya ikut:
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {nextEvent.expectedMerchants.map((m) => (
                  <span
                    key={m}
                    className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Filter */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
          Filter:
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: "Semua Event" },
            { id: "mega", label: "🔥 Mega Event" },
            { id: "big", label: "⭐ Big Sale" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id as "all" | "mega" | "big")}
              className={[
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                filter === f.id
                  ? "border-brand-400 bg-brand-500/20 text-brand-200"
                  : "border-white/10 bg-white/5 text-gray-300 hover:border-brand-400/50",
              ].join(" ")}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {/* Events grouped by month */}
      {Object.entries(grouped).map(([key, events]) => (
        <section key={key}>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-400">
            📆 {monthName(key)}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {events.map((e) => {
              const days = daysBetween(now, e.eventDate);
              const scaleInfo = SCALE_LABELS[e.scale];
              return (
                <div
                  key={e.id}
                  className={[
                    "overflow-hidden rounded-2xl border bg-gradient-to-br p-5 transition-all hover:scale-[1.01] hover:shadow-xl",
                    COLOR_CLASSES[e.color],
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-4xl">{e.emoji}</span>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-md",
                          scaleInfo.color,
                        ].join(" ")}
                      >
                        {scaleInfo.emoji} {scaleInfo.label}
                      </span>
                      <span className="rounded-full bg-black/40 px-2.5 py-0.5 text-xs font-bold text-white">
                        {days === 0 ? "HARI INI!" : `${days} hari`}
                      </span>
                    </div>
                  </div>

                  <h3 className="mt-3 text-lg font-bold text-white">{e.name}</h3>
                  <p className="mt-1 text-xs italic text-white/80">{e.tagline}</p>

                  <p className="mt-2 text-[11px] font-semibold text-white/60">
                    📅 {formatDateID(e.eventDate)}
                  </p>

                  <p className="mt-3 line-clamp-3 text-xs text-white/80">
                    {e.description}
                  </p>

                  {e.expectedMerchants.length > 0 && (
                    <div className="mt-3 border-t border-white/10 pt-2">
                      <div className="flex flex-wrap gap-1">
                        {e.expectedMerchants.slice(0, 4).map((m) => (
                          <span
                            key={m}
                            className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-white"
                          >
                            {m}
                          </span>
                        ))}
                        {e.expectedMerchants.length > 4 && (
                          <span className="text-[9px] text-white/60">
                            +{e.expectedMerchants.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* Recurring monthly events info */}
      <section className="rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 to-transparent p-5">
        <h2 className="flex items-center gap-2 text-base font-bold text-emerald-200">
          🔄 Event Recurring Bulanan
        </h2>
        <p className="mt-2 text-xs text-gray-300">
          Selain event tahunan, ada juga event bulanan yang biasa banyak promo:
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-3">
            <p className="text-sm font-bold text-emerald-200">💰 Tanggal 25 — Gajian</p>
            <p className="mt-0.5 text-[11px] text-gray-400">
              Banyak merchant gajian-bait promo. Cashback besar di e-wallet.
            </p>
          </div>
          <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-3">
            <p className="text-sm font-bold text-emerald-200">📅 Akhir Bulan</p>
            <p className="mt-0.5 text-[11px] text-gray-400">
              Merchant clear stock — diskon kategorinya bisa lebih dalam.
            </p>
          </div>
        </div>
      </section>

      {/* Empty state */}
      {upcomingEvents.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 p-12 text-center">
          <div className="text-4xl">🤷</div>
          <p className="mt-3 text-sm text-gray-400">
            Belum ada event upcoming dengan filter ini.
          </p>
        </div>
      )}

      {/* CTA */}
      <section className="rounded-2xl border border-brand-400/30 bg-gradient-to-br from-brand-500/10 to-transparent p-6 text-center">
        <h2 className="text-base font-bold text-white">
          📌 Mau persiapan kupon untuk event ini?
        </h2>
        <p className="mt-2 text-sm text-gray-300">
          Cek Smart Pick atau Kombo Kupon untuk strategi belanja maksimal.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link
            href="/decide"
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
          >
            🎯 Smart Pick
          </Link>
          <Link
            href="/kombo"
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
          >
            🎁 Kombo Kupon
          </Link>
          <Link
            href="/"
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600"
          >
            🏠 Beranda
          </Link>
        </div>
      </section>
    </div>
  );
}
