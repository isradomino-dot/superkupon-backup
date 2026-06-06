"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { useHistory, type PeriodKey } from "@/lib/use-history";
import { HistoryStats } from "@/components/HistoryStats";

const PERIODS: { id: PeriodKey; label: string }[] = [
  { id: "today", label: "Hari ini" },
  { id: "week", label: "7 hari terakhir" },
  { id: "month", label: "Bulan ini" },
  { id: "all", label: "Semua waktu" },
];

export default function HistoryPage() {
  const { records, filterByPeriod, countInPeriod, removeClaim, clearAll } = useHistory();
  const [period, setPeriod] = useState<PeriodKey>("month");

  const visible = useMemo(() => filterByPeriod(period), [filterByPeriod, period]);
  const periodLabel = PERIODS.find((p) => p.id === period)?.label ?? "";

  return (
    <div className="space-y-6">
      <nav className="text-sm text-gray-400">
        <Link href="/" className="hover:text-brand-300 hover:underline">
          Beranda
        </Link>{" "}
        / <span className="text-gray-100">History Kupon</span>
      </nav>

      <header className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/15 via-transparent to-transparent p-6 animate-slide-up">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-white sm:text-3xl">
              <span aria-hidden>🕒</span> History Kupon
            </h1>
            <p className="mt-1 text-sm text-gray-300">
              Semua kupon yang sudah lo klaim — tersimpan lokal di perangkat ini.
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {records.length} total record · {countInPeriod("today")} hari ini ·{" "}
              {countInPeriod("month")} bulan ini
            </p>
          </div>
          {records.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (confirm("Hapus semua history klaim? Tidak bisa di-undo.")) {
                  clearAll();
                }
              }}
              className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20"
            >
              Hapus semua
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => {
          const active = period === p.id;
          const n = countInPeriod(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              aria-pressed={active}
              className={[
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition",
                active
                  ? "bg-brand-500 text-white shadow-glow ring-2 ring-brand-400/30"
                  : "border border-white/15 bg-white/5 text-gray-300 hover:border-brand-400 hover:bg-brand-500/10",
              ].join(" ")}
            >
              <span>{p.label}</span>
              <span
                className={[
                  "rounded-full px-1.5 text-[10px] font-bold",
                  active ? "bg-white/20 text-white" : "bg-white/10 text-gray-400",
                ].join(" ")}
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
          📊 Statistik — {periodLabel}
        </h2>
        <HistoryStats records={visible} periodLabel={periodLabel} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
          📋 Daftar kupon — {visible.length} record
        </h2>
        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-gray-400">
            Belum ada klaim di periode ini.
          </div>
        ) : (
          <ul className="space-y-2">
            {visible.map((r) => (
              <li
                key={`${r.couponId}-${r.claimedAt}`}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/[0.07]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand-300">
                    <Link href={`/merchant/${r.merchantSlug}`} className="hover:underline">
                      {r.merchantName}
                    </Link>
                    {r.categorySlug && r.categoryName && (
                      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-400">
                        {r.categoryName}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/coupon/${r.couponId}`}
                    className="mt-0.5 line-clamp-1 text-sm font-medium text-gray-100 hover:text-brand-300"
                  >
                    {r.title}
                  </Link>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                    {r.code && (
                      <code className="rounded bg-brand-500/15 px-1.5 py-0.5 font-mono text-brand-200">
                        {r.code}
                      </code>
                    )}
                    <time dateTime={new Date(r.claimedAt).toISOString()}>
                      {formatClaimedAt(r.claimedAt)}
                    </time>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeClaim(r.couponId, r.claimedAt)}
                  aria-label="Hapus record"
                  className="flex-none rounded-md border border-white/10 px-2 py-1 text-xs text-gray-400 transition hover:border-red-400/40 hover:text-red-300"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatClaimedAt(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - ts;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} jam lalu`;
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
