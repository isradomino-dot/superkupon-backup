"use client";

import { COMPARE_LIMIT, useCompare } from "@/lib/use-compare";
import { MerchantLogo } from "@/components/MerchantLogo";

export function CompareBar() {
  const { selected, count, remove, clear, openModal } = useCompare();

  if (count === 0) return null;

  const canCompare = count >= 2;

  return (
    <div className="fixed bottom-4 left-1/2 z-[100] w-full max-w-2xl -translate-x-1/2 px-4 animate-slide-up">
      <div className="overflow-hidden rounded-2xl border border-violet-400/30 bg-gradient-to-br from-slate-900 via-violet-900/30 to-slate-900 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-3 p-3">
          {/* Stack of mini avatars */}
          <div className="flex flex-none items-center -space-x-3">
            {selected.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => remove(c.id)}
                title={`Remove ${c.merchant.name} dari compare`}
                className="group relative h-9 w-9 overflow-hidden rounded-full border-2 border-slate-900 transition hover:z-10 hover:scale-110"
                aria-label={`Remove ${c.merchant.name} from compare`}
              >
                <MerchantLogo merchant={c.merchant} size={32} rounded="full" />
                <span className="absolute inset-0 flex items-center justify-center bg-rose-500/70 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100">
                  ✕
                </span>
              </button>
            ))}
            {count < COMPARE_LIMIT && (
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-violet-400/40 bg-slate-800/40 text-base text-violet-300/70">
                +
              </div>
            )}
          </div>

          {/* Label */}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-white">
              🆚 Compare Mode · {count}/{COMPARE_LIMIT}
            </div>
            <div className="text-[10px] text-gray-400">
              {canCompare
                ? "Klik 'Bandingkan' buat lihat side-by-side"
                : `Pilih ${2 - count} lagi untuk bisa bandingkan`}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-none gap-1.5">
            <button
              type="button"
              onClick={clear}
              title="Clear semua"
              className="rounded-md border border-gray-600 px-2 py-1 text-xs font-medium text-gray-300 hover:bg-white/5"
            >
              ✕ Clear
            </button>
            <button
              type="button"
              onClick={openModal}
              disabled={!canCompare}
              className={[
                "rounded-md px-3 py-1 text-xs font-bold shadow transition",
                canCompare
                  ? "bg-gradient-to-r from-violet-500 to-blue-600 text-white hover:brightness-110"
                  : "cursor-not-allowed bg-gray-700 text-gray-500",
              ].join(" ")}
            >
              🆚 Bandingkan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
