"use client";

import { computeStats, type ClaimRecord } from "@/lib/use-history";

const TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  percent: { label: "Diskon %", emoji: "💯" },
  fixed: { label: "Nominal Rp", emoji: "💰" },
  cashback: { label: "Cashback", emoji: "💵" },
  free_shipping: { label: "Gratis Ongkir", emoji: "🚚" },
  bogo: { label: "Buy 1 Get 1", emoji: "🎁" },
};

export function HistoryStats({ records, periodLabel }: { records: ClaimRecord[]; periodLabel: string }) {
  const stats = computeStats(records);

  if (stats.totalClaims === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <div className="text-4xl" aria-hidden>📊</div>
        <p className="mt-2 text-sm font-semibold text-gray-200">
          Belum ada aktivitas untuk {periodLabel.toLowerCase()}
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Klik &ldquo;Salin&rdquo; di kupon mana saja — record otomatis muncul di sini.
        </p>
      </div>
    );
  }

  const maxMerchant = Math.max(...stats.topMerchants.map((m) => m.count), 1);
  const maxCategory = Math.max(...stats.topCategories.map((m) => m.count), 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Total klaim" value={String(stats.totalClaims)} emoji="🎟️" color="text-brand-300" />
        <Metric label="Kupon unik" value={String(stats.uniqueCoupons)} emoji="🔢" color="text-sky-300" />
        <Metric
          label="Hemat (estimasi)"
          value={stats.totalSavings > 0 ? `Rp ${stats.totalSavings.toLocaleString("id-ID")}` : "—"}
          emoji="💰"
          color="text-emerald-300"
        />
        <Metric
          label="Merchant fav"
          value={stats.topMerchants[0]?.name ?? "—"}
          sublabel={stats.topMerchants[0] ? `${stats.topMerchants[0].count}× klaim` : ""}
          emoji="🏆"
          color="text-amber-300"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Breakdown
          title="Top merchant"
          rows={stats.topMerchants.map((m) => ({
            label: m.name,
            count: m.count,
            emoji: "🛍️",
          }))}
          max={maxMerchant}
        />
        <Breakdown
          title="Top kategori"
          rows={stats.topCategories.map((c) => ({
            label: c.name,
            count: c.count,
            emoji: "🏷️",
          }))}
          max={maxCategory}
        />
      </div>

      {stats.typeBreakdown.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Berdasarkan tipe diskon
          </h3>
          <div className="flex flex-wrap gap-2">
            {stats.typeBreakdown.map((t) => {
              const cfg = TYPE_LABELS[t.type] ?? { label: t.type, emoji: "•" };
              return (
                <span
                  key={t.type}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/15 px-3 py-1 text-xs text-brand-200"
                >
                  <span aria-hidden>{cfg.emoji}</span>
                  <span>{cfg.label}</span>
                  <span className="ml-1 font-mono text-brand-300">{t.count}×</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  sublabel,
  emoji,
  color,
}: {
  label: string;
  value: string;
  sublabel?: string;
  emoji: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        <span aria-hidden>{emoji}</span>
        {label}
      </div>
      <div className={["mt-1 truncate text-xl font-bold", color].join(" ")} title={value}>
        {value}
      </div>
      {sublabel && <div className="truncate text-[10px] text-gray-500">{sublabel}</div>}
    </div>
  );
}

function Breakdown({
  title,
  rows,
  max,
}: {
  title: string;
  rows: { label: string; count: number; emoji: string }[];
  max: number;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        {title}
      </h3>
      <ul className="space-y-1.5">
        {rows.map((r) => {
          const pct = max > 0 ? (r.count / max) * 100 : 0;
          return (
            <li key={r.label}>
              <div className="flex items-center gap-2">
                <span className="w-5 text-center text-sm" aria-hidden>
                  {r.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center justify-between text-xs text-gray-200">
                    <span className="truncate">{r.label}</span>
                    <span className="ml-2 font-mono text-gray-400">{r.count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
