"use client";

interface Props {
  value: number;
  onChange: (v: number) => void;
}

/**
 * Min-discount range slider 0-100% with visual fill + step labels.
 * Returns 0 = no filter, else min discount percent.
 */
export function DiscountSlider({ value, onChange }: Props) {
  const pct = Math.min(100, Math.max(0, value));
  const tone =
    pct >= 70
      ? "text-rose-500"
      : pct >= 50
        ? "text-amber-500"
        : pct >= 20
          ? "text-emerald-500"
          : "text-gray-500";

  return (
    <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-gray-700 dark:text-gray-200">
          🎚 Min Diskon:{" "}
          <span className={["font-black tabular-nums", tone].join(" ")}>{pct}%</span>
        </span>
        {pct > 0 && (
          <button
            type="button"
            onClick={() => onChange(0)}
            className="text-[10px] font-semibold text-rose-500 hover:underline"
          >
            ✕ Reset
          </button>
        )}
      </div>

      <div className="relative h-6">
        {/* Track + fill */}
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={pct}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Minimum diskon dalam persen"
          className="absolute inset-0 w-full cursor-pointer appearance-none bg-transparent
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-white
            [&::-webkit-slider-thumb]:bg-brand-500
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-webkit-slider-thumb]:transition
            [&::-moz-range-thumb]:h-5
            [&::-moz-range-thumb]:w-5
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-white
            [&::-moz-range-thumb]:bg-brand-500
            [&::-moz-range-thumb]:shadow-md"
        />
      </div>

      <div className="flex justify-between text-[10px] text-gray-400">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>
    </div>
  );
}
