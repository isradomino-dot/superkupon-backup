"use client";

interface KPICardProps {
  label: string;
  value: string | number;
  icon: string;
  hint?: string;
  trend?: {
    value: number;
    label: string;
  };
  color?: "purple" | "green" | "blue" | "amber" | "pink" | "red";
}

const COLORS = {
  purple: "from-purple-500/20 to-purple-700/10 border-purple-400/30 text-purple-300",
  green: "from-emerald-500/20 to-emerald-700/10 border-emerald-400/30 text-emerald-300",
  blue: "from-sky-500/20 to-sky-700/10 border-sky-400/30 text-sky-300",
  amber: "from-amber-500/20 to-amber-700/10 border-amber-400/30 text-amber-300",
  pink: "from-pink-500/20 to-pink-700/10 border-pink-400/30 text-pink-300",
  red: "from-red-500/20 to-red-700/10 border-red-400/30 text-red-300",
};

export function KPICard({
  label,
  value,
  icon,
  hint,
  trend,
  color = "purple",
}: KPICardProps) {
  const isPositive = trend && trend.value > 0;
  const isNegative = trend && trend.value < 0;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 backdrop-blur ${COLORS[color]}`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold text-white">
            {typeof value === "number" ? value.toLocaleString("id-ID") : value}
          </p>
          {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
        </div>
        <div className="ml-3 flex-shrink-0 text-3xl opacity-80">{icon}</div>
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          <span
            className={
              isPositive
                ? "text-emerald-400"
                : isNegative
                ? "text-red-400"
                : "text-gray-400"
            }
          >
            {isPositive ? "↑" : isNegative ? "↓" : "→"} {Math.abs(trend.value)}
          </span>
          <span className="text-gray-500">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
