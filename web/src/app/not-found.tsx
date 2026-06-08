import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 — Halaman Tidak Ditemukan | SuperKupon",
  description: "Halaman yang kamu cari tidak ditemukan.",
};

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="text-7xl" aria-hidden>
        🎟️
      </div>
      <div>
        <h1 className="text-5xl font-black text-brand-400 sm:text-6xl">404</h1>
        <p className="mt-2 text-lg font-bold text-white sm:text-xl">
          Yah, kuponnya udah expired
        </p>
        <p className="mt-2 max-w-md text-sm text-gray-400">
          Halaman atau kupon yang kamu cari tidak ditemukan. Mungkin udah kadaluarsa, dihapus, atau
          link-nya salah ketik.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-brand-600"
        >
          🏠 Kembali ke beranda
        </Link>
        <Link
          href="/favorites"
          className="rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          ❤️ Lihat favorit
        </Link>
      </div>
    </div>
  );
}
