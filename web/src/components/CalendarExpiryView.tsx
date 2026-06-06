"use client";

import { useMemo, useState } from "react";

import type { Coupon } from "@/lib/types";

interface Props {
  coupons: Coupon[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}

const DAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isoToDate(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d : null;
}

/** Density tier 0-4 by coupon count. */
function densityTier(count: number): number {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
}

const TIER_CLASSES = [
  "bg-gray-800/40", // 0 — empty
  "bg-emerald-500/30", // 1 — 1-2
  "bg-amber-500/40", // 2 — 3-5
  "bg-orange-500/50", // 3 — 6-10
  "bg-rose-500/60", // 4 — 11+
];

export function CalendarExpiryView({ coupons, selectedDate, onSelectDate }: Props) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Count coupons expiring per day
  const expiryByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of coupons) {
      if (!c.expires_at) continue;
      const d = isoToDate(c.expires_at);
      if (!d) continue;
      const k = dateKey(d);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [coupons]);

  // Build grid cells for current viewMonth
  const cells = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // JS: Sunday=0, Monday=1. We want Mon=0, Sun=6.
    const firstWeekday = (firstDay.getDay() + 6) % 7;

    const out: { day: number; key: string; date: Date; count: number; isPast: boolean; isToday: boolean }[] = [];
    for (let i = 0; i < firstWeekday; i++) {
      out.push({ day: 0, key: `empty-${i}`, date: new Date(0), count: 0, isPast: false, isToday: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      date.setHours(0, 0, 0, 0);
      const k = dateKey(date);
      out.push({
        day: d,
        key: k,
        date,
        count: expiryByDay.get(k) ?? 0,
        isPast: date.getTime() < today.getTime(),
        isToday: date.getTime() === today.getTime(),
      });
    }
    return out;
  }, [viewMonth, expiryByDay, today]);

  const totalThisMonth = useMemo(
    () => cells.filter((c) => c.day > 0).reduce((sum, c) => sum + c.count, 0),
    [cells],
  );

  const goPrevMonth = () => {
    const d = new Date(viewMonth);
    d.setMonth(d.getMonth() - 1);
    setViewMonth(d);
  };

  const goNextMonth = () => {
    const d = new Date(viewMonth);
    d.setMonth(d.getMonth() + 1);
    setViewMonth(d);
  };

  const goToday = () => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    setViewMonth(d);
  };

  return (
    <section className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/8 via-transparent to-rose-500/8 p-5">
      {/* Header: month nav + total */}
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrevMonth}
            aria-label="Bulan sebelumnya"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700"
          >
            ←
          </button>
          <h2 className="min-w-[180px] text-center text-base font-bold text-white">
            📅 {MONTH_NAMES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
          </h2>
          <button
            type="button"
            onClick={goNextMonth}
            aria-label="Bulan berikutnya"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700"
          >
            →
          </button>
          <button
            type="button"
            onClick={goToday}
            className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-700"
          >
            Hari ini
          </button>
        </div>
        <div className="text-xs text-gray-400">
          <span className="font-bold text-white">{totalThisMonth}</span> kupon expiring bulan ini
        </div>
      </header>

      {/* Day labels */}
      <div className="mb-1 grid grid-cols-7 gap-1.5">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell) => {
          if (cell.day === 0) return <div key={cell.key} aria-hidden />;

          const tier = densityTier(cell.count);
          const isSelected = selectedDate === cell.key;
          const clickable = cell.count > 0;

          return (
            <button
              key={cell.key}
              type="button"
              disabled={!clickable}
              onClick={() => onSelectDate(isSelected ? null : cell.key)}
              aria-label={`${cell.day} — ${cell.count} kupon expiring`}
              className={[
                "relative aspect-square rounded-lg border text-left transition",
                TIER_CLASSES[tier],
                isSelected
                  ? "border-brand-400 ring-2 ring-brand-400/60 shadow-lg"
                  : cell.isToday
                    ? "border-amber-400/70 ring-1 ring-amber-400/40"
                    : "border-gray-700/40",
                clickable
                  ? "hover:scale-105 hover:border-brand-400 cursor-pointer"
                  : "opacity-50 cursor-default",
                cell.isPast && !cell.isToday ? "opacity-60" : "",
              ].join(" ")}
            >
              <div className="flex h-full flex-col justify-between p-1.5">
                <span
                  className={[
                    "text-xs font-bold tabular-nums",
                    cell.isToday ? "text-amber-200" : "text-gray-200",
                  ].join(" ")}
                >
                  {cell.day}
                </span>
                {cell.count > 0 && (
                  <span className="self-end rounded-full bg-gray-900/70 px-1.5 py-0 text-[10px] font-black text-white">
                    {cell.count}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Heat legend */}
      <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-700 pt-2 text-[10px] text-gray-400">
        <div className="flex items-center gap-1.5">
          <span>Density:</span>
          <span className="inline-block h-3 w-4 rounded bg-gray-800/40" title="Kosong" />
          <span className="inline-block h-3 w-4 rounded bg-emerald-500/30" title="1-2" />
          <span className="inline-block h-3 w-4 rounded bg-amber-500/40" title="3-5" />
          <span className="inline-block h-3 w-4 rounded bg-orange-500/50" title="6-10" />
          <span className="inline-block h-3 w-4 rounded bg-rose-500/60" title="11+" />
        </div>
        <div className="text-gray-500">Klik tanggal untuk filter kupon yang expire di hari itu</div>
      </footer>
    </section>
  );
}
