"use client";

import { useState } from "react";

import { useCouponVotes, type VoteValue } from "@/lib/use-coupon-votes";
import { fireConfetti } from "@/lib/confetti";

interface Props {
  couponId: number;
  compact?: boolean; // if true, render inline icon-only style for cards
}

export function VerifyButtons({ couponId, compact = false }: Props) {
  const { getVote, setVote, clearVote } = useCouponVotes();
  const current = getVote(couponId);
  const [justVoted, setJustVoted] = useState<VoteValue | null>(null);

  const handleVote = (e: React.MouseEvent<HTMLButtonElement>, val: VoteValue) => {
    e.preventDefault();
    e.stopPropagation();
    if (current === val) {
      clearVote(couponId);
      setJustVoted(null);
      return;
    }
    setVote(couponId, val);
    setJustVoted(val);
    setTimeout(() => setJustVoted(null), 1800);
    if (val === "works") {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      fireConfetti({
        origin: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
        particleCount: 50,
        colors: ["#10b981", "#34d399", "#6ee7b7"],
      });
    }
  };

  if (compact) {
    return (
      <div className="inline-flex gap-1">
        <CompactBtn
          active={current === "works"}
          activeStyle="emerald"
          onClick={(e) => handleVote(e, "works")}
          ariaLabel="Tandai kupon masih works"
          title={current === "works" ? "Tap untuk batal" : "Masih works"}
        >
          👍
        </CompactBtn>
        <CompactBtn
          active={current === "expired"}
          activeStyle="rose"
          onClick={(e) => handleVote(e, "expired")}
          ariaLabel="Laporkan kupon expired"
          title={current === "expired" ? "Tap untuk batal" : "Sudah expired"}
        >
          👎
        </CompactBtn>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
          🤝 Bantu komunitas
        </h3>
        {current && (
          <button
            type="button"
            onClick={() => {
              clearVote(couponId);
              setJustVoted(null);
            }}
            className="text-[11px] font-medium text-gray-500 hover:text-rose-500 dark:text-gray-400"
          >
            Batalkan
          </button>
        )}
      </div>
      <p className="mb-3 text-xs text-gray-600 dark:text-gray-400">
        Udah coba pakai kupon ini? Vote biar pengunjung lain tau:
      </p>

      <div className="grid grid-cols-2 gap-2">
        <FullBtn
          active={current === "works"}
          activeStyle="emerald"
          onClick={(e) => handleVote(e, "works")}
          label="Masih works"
          emoji="👍"
          subtext={justVoted === "works" ? "Thanks! ✓" : ""}
        />
        <FullBtn
          active={current === "expired"}
          activeStyle="rose"
          onClick={(e) => handleVote(e, "expired")}
          label="Sudah expired"
          emoji="👎"
          subtext={justVoted === "expired" ? "Dilaporkan ✓" : ""}
        />
      </div>

      <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
        Vote disimpan lokal di perangkat lo (tidak dikirim ke server). Lo bisa ubah kapan aja.
      </p>
    </div>
  );
}

function CompactBtn({
  active,
  activeStyle,
  onClick,
  ariaLabel,
  title,
  children,
}: {
  active: boolean;
  activeStyle: "emerald" | "rose";
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  ariaLabel: string;
  title: string;
  children: React.ReactNode;
}) {
  const activeColor = activeStyle === "emerald"
    ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30"
    : "border-rose-400 bg-rose-50 dark:bg-rose-900/30";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      title={title}
      className={[
        "flex h-7 w-7 items-center justify-center rounded-md border text-sm transition",
        active
          ? activeColor
          : "border-gray-200 bg-white opacity-60 hover:opacity-100 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-700",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function FullBtn({
  active,
  activeStyle,
  onClick,
  label,
  emoji,
  subtext,
}: {
  active: boolean;
  activeStyle: "emerald" | "rose";
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  label: string;
  emoji: string;
  subtext?: string;
}) {
  const activeColors =
    activeStyle === "emerald"
      ? "border-emerald-400 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-300/40 dark:border-emerald-400 dark:bg-emerald-900/30 dark:text-emerald-300"
      : "border-rose-400 bg-rose-50 text-rose-700 ring-2 ring-rose-300/40 dark:border-rose-400 dark:bg-rose-900/30 dark:text-rose-300";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "flex flex-col items-center gap-1 rounded-lg border-2 px-3 py-3 transition active:scale-95",
        active
          ? activeColors
          : "border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600",
      ].join(" ")}
    >
      <span className="text-2xl" aria-hidden>{emoji}</span>
      <span className="text-xs font-bold">{label}</span>
      {subtext && (
        <span className="text-[10px] font-medium">{subtext}</span>
      )}
    </button>
  );
}
