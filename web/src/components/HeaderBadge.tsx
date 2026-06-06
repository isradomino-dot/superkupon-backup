"use client";

import { useInventory } from "@/lib/use-inventory";

export function HeaderBadge() {
  const { isOwned } = useInventory();

  if (isOwned("badge-master")) {
    return (
      <span
        title="Coupon Master · achievement eksklusif"
        className="inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-rose-500 via-purple-500 to-violet-600 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-md"
      >
        <span aria-hidden>🏆</span> Master
      </span>
    );
  }

  if (isOwned("badge-vip")) {
    return (
      <span
        title="VIP · member premium"
        className="inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-md"
      >
        <span aria-hidden>👑</span> VIP
      </span>
    );
  }

  return null;
}
