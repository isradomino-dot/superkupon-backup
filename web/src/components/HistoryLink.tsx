"use client";

import Link from "next/link";

import { useHistory } from "@/lib/use-history";

export function HistoryLink() {
  const { count } = useHistory();

  return (
    <Link
      href="/history"
      aria-label="History kupon"
      title={count > 0 ? `${count} kupon di history` : "History kupon"}
      className="relative flex h-9 w-9 items-center justify-center rounded-md text-gray-300 transition hover:bg-white/10 hover:text-emerald-300"
    >
      <ClockIcon />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-emerald-500 px-1 text-center text-[10px] font-bold text-white shadow">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

function ClockIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 14" />
    </svg>
  );
}
