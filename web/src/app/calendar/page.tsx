"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { listCoupons, isAbortError } from "@/lib/api";
import type { Coupon } from "@/lib/types";
import { MerchantLogo } from "@/components/MerchantLogo";

export const dynamic = "force-dynamic";

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const DAYS_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export default function CalendarPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    listCoupons({ limit: 200, sort: "expiring" }, { signal: ctrl.signal })
      .then((c) => {
        if (!ctrl.signal.aborted) setCoupons(c);
      })
      .catch((e) => {
        if (!isAbortError(e)) setCoupons([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, []);

  // Group coupons by expiry date (YYYY-MM-DD)
  const byDate = useMemo(() => {
    const map: Record<string, Coupon[]> = {};
    coupons.forEach((c) => {
      if (!c.expires_at) return;
      const d = new Date(c.expires_at);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });
    return map;
  }, [coupons]);

  // Build calendar grid for viewDate's month
  const grid = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: { date: Date | null; key: string }[] = [];
    for (let i = 0; i < firstDay; i++) days.push({ date: null, key: `pad-${i}` });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      days.push({ date, key: `d-${d}` });
    }
    return days;
  }, [viewDate]);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const prevMonth = () =>
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const nextMonth = () =>
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  const goToday = () => {
    setViewDate(new Date());
    setSelectedDay(todayKey);
  };

  const dayKey = (d: Date | null): string => {
    if (!d) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const selectedCoupons = selectedDay ? byDate[selectedDay] ?? [] : [];
  const totalCouponsThisMonth = grid.reduce((sum, cell) => {
    if (!cell.date) return sum;
    return sum + (byDate[dayKey(cell.date)]?.length ?? 0);
  }, 0);

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-white/10 bg-gradient-to-br from-brand-500/20 via-purple-500/10 to-transparent p-6">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          📅 Calendar Kupon
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-300">
          Visualisasi kapan kupon expire. Klik tanggal untuk lihat kupon yang
          berakhir di hari itu — biar gak ke-skip.
        </p>
      </header>

      {/* Calendar grid */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
        {/* Month nav */}
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={prevMonth}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white transition hover:bg-white/10"
            aria-label="Bulan sebelumnya"
          >
            ← Prev
          </button>
          <div className="text-center">
            <h2 className="text-xl font-bold text-white">
              {MONTHS_ID[viewDate.getMonth()]} {viewDate.getFullYear()}
            </h2>
            <p className="mt-0.5 text-xs text-gray-400">
              {totalCouponsThisMonth} kupon expire bulan ini
            </p>
          </div>
          <button
            type="button"
            onClick={nextMonth}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white transition hover:bg-white/10"
            aria-label="Bulan berikutnya"
          >
            Next →
          </button>
        </div>

        <div className="mb-3 flex justify-center">
          <button
            type="button"
            onClick={goToday}
            className="rounded-full border border-brand-400/40 bg-brand-500/15 px-4 py-1 text-xs font-semibold text-brand-200 transition hover:bg-brand-500/25"
          >
            📌 Hari ini
          </button>
        </div>

        {/* Day labels */}
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
          {DAYS_ID.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {grid.map((cell) => {
            if (!cell.date) {
              return <div key={cell.key} className="aspect-square" />;
            }
            const key = dayKey(cell.date);
            const dayCoupons = byDate[key] ?? [];
            const count = dayCoupons.length;
            const isToday = key === todayKey;
            const isSelected = key === selectedDay;
            const isPast = cell.date.getTime() < new Date().setHours(0, 0, 0, 0);

            // Intensity by count
            const intensity =
              count === 0
                ? ""
                : count === 1
                  ? "bg-amber-500/15 border-amber-500/30"
                  : count <= 3
                    ? "bg-orange-500/20 border-orange-500/40"
                    : count <= 6
                      ? "bg-rose-500/30 border-rose-500/50"
                      : "bg-rose-600/40 border-rose-500/70";

            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => setSelectedDay(key)}
                disabled={count === 0}
                className={[
                  "group relative aspect-square rounded-lg border-2 p-1 transition-all sm:p-2",
                  isToday ? "ring-2 ring-brand-400 ring-offset-1 ring-offset-gray-950" : "",
                  isSelected
                    ? "scale-105 border-brand-400 bg-brand-500/30 shadow-lg shadow-brand-500/30"
                    : count > 0
                      ? intensity + " hover:scale-105 hover:shadow-md cursor-pointer"
                      : "border-white/5 bg-white/[0.02] cursor-default",
                  isPast && count > 0 ? "opacity-50" : "",
                ].join(" ")}
                aria-label={`${cell.date.getDate()} ${MONTHS_ID[cell.date.getMonth()]} ${count > 0 ? `(${count} kupon)` : ""}`}
              >
                <div className="flex h-full flex-col items-center justify-between">
                  <span
                    className={[
                      "text-xs font-bold sm:text-sm",
                      isToday ? "text-brand-300" : "text-white",
                    ].join(" ")}
                  >
                    {cell.date.getDate()}
                  </span>
                  {count > 0 && (
                    <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[8px] font-black text-white sm:text-[10px]">
                      {count}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[10px] text-gray-400">
          <span>Intensitas:</span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded border border-amber-500/30 bg-amber-500/15" />
            1
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded border border-orange-500/40 bg-orange-500/20" />
            2-3
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded border border-rose-500/50 bg-rose-500/30" />
            4-6
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded border border-rose-500/70 bg-rose-600/40" />
            7+
          </span>
        </div>
      </section>

      {/* Selected day detail */}
      {selectedDay && (
        <section className="rounded-2xl border border-brand-400/30 bg-white/5 p-5 animate-slide-up">
          <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-white">
            <span>📌</span> Kupon expire{" "}
            <span className="text-brand-300">
              {new Date(selectedDay).toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </h3>
          {selectedCoupons.length === 0 ? (
            <p className="text-sm text-gray-400">Tidak ada kupon expire di tanggal ini.</p>
          ) : (
            <div className="space-y-2">
              {selectedCoupons.map((c) => (
                <Link
                  key={c.id}
                  href={`/coupon/${c.id}`}
                  className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 p-3 transition hover:border-brand-400/40 hover:bg-white/10"
                >
                  <MerchantLogo merchant={c.merchant} size={36} rounded="md" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase text-brand-300">
                      {c.merchant.name}
                    </p>
                    <h4 className="line-clamp-1 text-sm font-bold text-white">{c.title}</h4>
                  </div>
                  {c.code && (
                    <code className="rounded bg-amber-500/20 px-2 py-1 font-mono text-xs font-bold text-amber-200">
                      {c.code}
                    </code>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {loading && (
        <p className="text-center text-sm text-gray-400">Loading data kupon…</p>
      )}
    </div>
  );
}
