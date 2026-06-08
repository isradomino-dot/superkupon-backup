"use client";

import Link from "next/link";
import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Vercel auto-captures unhandled errors via console.error → tampil di Logs tab
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="text-6xl" aria-hidden>
        ⚠️
      </div>
      <div>
        <h1 className="text-3xl font-bold text-white">Ada error nih</h1>
        <p className="mt-2 max-w-md text-sm text-gray-400">
          Sesuatu yang tidak seharusnya terjadi. Coba reload halaman atau balik ke beranda.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-[10px] text-gray-600">
            Error ID: {error.digest}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-brand-600"
        >
          ↻ Coba lagi
        </button>
        <Link
          href="/"
          className="rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          🏠 Beranda
        </Link>
      </div>
    </div>
  );
}
