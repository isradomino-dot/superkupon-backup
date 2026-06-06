"use client";

import { useMerchantFollows } from "@/lib/use-merchant-follows";
import { fireConfetti } from "@/lib/confetti";

interface Props {
  merchantSlug: string;
  merchantName: string;
}

export function FollowMerchantButton({ merchantSlug, merchantName }: Props) {
  const { isFollowing, toggle } = useMerchantFollows();
  const active = isFollowing(merchantSlug);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const nowFollowing = toggle(merchantSlug, merchantName);
    if (nowFollowing) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      fireConfetti({
        origin: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
        particleCount: 40,
        colors: ["#f43f5e", "#fb7185", "#fda4af"],
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
        active
          ? "border-rose-400/60 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
          : "border-white/15 bg-white/5 text-gray-300 hover:border-rose-400 hover:bg-rose-500/10 hover:text-rose-300",
      ].join(" ")}
      title={
        active
          ? `Lo lagi follow ${merchantName} — klik buat unfollow`
          : `Follow ${merchantName} untuk akses cepat`
      }
    >
      <span aria-hidden>{active ? "💖" : "🤍"}</span>
      {active ? "Followed" : "Follow"}
    </button>
  );
}
