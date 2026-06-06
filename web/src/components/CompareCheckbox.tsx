"use client";

import type { Coupon } from "@/lib/types";
import { COMPARE_LIMIT, useCompare } from "@/lib/use-compare";

interface Props {
  coupon: Coupon;
}

/**
 * Tiny checkbox shown on coupon cards. Toggles inclusion in compare set.
 * Disabled when compare set is full and this coupon is NOT yet selected.
 */
export function CompareCheckbox({ coupon }: Props) {
  const { isSelected, isFull, toggle, openModal, count } = useCompare();
  const checked = isSelected(coupon.id);
  const disabled = !checked && isFull;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    toggle(coupon);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-pressed={checked}
      aria-label={
        checked
          ? `Remove dari compare`
          : disabled
            ? `Compare penuh (max ${COMPARE_LIMIT})`
            : `Tambahkan ke compare`
      }
      title={
        checked
          ? "Klik untuk remove dari compare"
          : disabled
            ? `Max ${COMPARE_LIMIT} kupon — clear dulu`
            : count >= 1
              ? `Tambahkan ke compare (${count + 1}/${COMPARE_LIMIT})`
              : "Tandai untuk compare"
      }
      onDoubleClick={(e) => {
        // Double-click = open modal langsung (kalau udah ada ≥2)
        e.preventDefault();
        e.stopPropagation();
        if (count >= 2) openModal();
      }}
      className={[
        "flex h-5 w-5 flex-none items-center justify-center rounded border-2 text-[10px] font-black transition",
        checked
          ? "border-violet-400 bg-violet-500 text-white shadow-md"
          : disabled
            ? "cursor-not-allowed border-gray-400/40 bg-gray-700/30 text-transparent"
            : "border-gray-400/60 bg-white/80 text-transparent hover:border-violet-400 hover:bg-violet-100 dark:bg-gray-800/80",
      ].join(" ")}
    >
      {checked ? "✓" : ""}
    </button>
  );
}
