"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AuthError, resetPassword } from "@/lib/auth-api";

export default function ResetPasswordPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params?.token || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }
    if (password !== confirm) {
      setError("Password gak match dengan konfirmasi");
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => router.push("/"), 2500);
    } catch (err) {
      setError(
        err instanceof AuthError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Terjadi error tak terduga",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden px-4 py-8">
      {/* Animated background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-1/4 h-96 w-96 animate-pulse rounded-full bg-purple-500/20 blur-3xl" />
        <div
          className="absolute -right-32 bottom-1/4 h-96 w-96 animate-pulse rounded-full bg-pink-500/20 blur-3xl"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-gray-900/95 p-7 shadow-2xl shadow-purple-500/20 backdrop-blur-xl">
        <div className="text-center">
          <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/40">
            <span className="text-2xl">{success ? "🎉" : "🔐"}</span>
          </div>
          <h1 className="bg-gradient-to-r from-purple-200 via-pink-200 to-amber-200 bg-clip-text text-2xl font-bold text-transparent">
            {success ? "Password Berhasil Direset!" : "Reset Password"}
          </h1>
          <p className="mt-1.5 text-xs text-gray-400">
            {success
              ? "Lo akan di-redirect ke homepage dalam 2 detik..."
              : "Masukin password baru lo. Token reset cuma valid 1 jam."}
          </p>
        </div>

        {!success && (
          <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
            <div className="rounded-xl border border-purple-400/20 bg-purple-500/5 p-2.5 text-xs text-purple-200">
              <strong>Token:</strong>{" "}
              <span className="font-mono break-all text-purple-100">
                {token.slice(0, 20)}...
              </span>
            </div>

            <div className="group">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 group-focus-within:text-purple-300">
                Password Baru
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400">
                  🔑
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  autoFocus
                  required
                  minLength={6}
                  disabled={submitting}
                  className="w-full rounded-xl border border-white/10 bg-gray-800/50 px-3 py-2.5 pl-10 text-sm text-white placeholder-gray-500 transition focus:border-purple-400 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400/30 disabled:opacity-50"
                />
              </div>
              <p className="mt-1 text-[11px] text-gray-500">Minimal 6 karakter</p>
            </div>

            <div className="group">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 group-focus-within:text-purple-300">
                Konfirmasi Password
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400">
                  🔁
                </span>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  disabled={submitting}
                  className="w-full rounded-xl border border-white/10 bg-gray-800/50 px-3 py-2.5 pl-10 text-sm text-white placeholder-gray-500 transition focus:border-purple-400 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400/30 disabled:opacity-50"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-300">
                <span>❌</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !password || !confirm}
              className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-xl disabled:opacity-50"
            >
              {submitting ? "Resetting..." : "🔐 Reset Password"}
            </button>
          </form>
        )}

        {success && (
          <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-sm text-emerald-200">
            ✅ Password lo udah ke-update. Silakan login dengan password baru.
          </div>
        )}

        <div className="mt-4 border-t border-white/10 pt-4 text-center text-xs text-gray-500">
          <Link
            href="/"
            className="font-medium text-purple-300 hover:text-purple-200 hover:underline"
          >
            ← Balik ke Halaman Utama
          </Link>
        </div>
      </div>
    </div>
  );
}
