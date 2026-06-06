"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/lib/use-auth";

type Mode = "sign-in" | "sign-up" | "magic-link";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SignInModal({ open, onClose }: Props) {
  const { signInWithPassword, signUpWithPassword, signInWithMagicLink, signInWithOAuth, configured } = useAuth();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [oauthBusy, setOauthBusy] = useState<"google" | "github" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSuccess(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError("Email required");
      return;
    }

    setBusy(true);
    try {
      if (mode === "magic-link") {
        const { error: err } = await signInWithMagicLink(email.trim());
        if (err) setError(err);
        else setSuccess(`Magic link dikirim ke ${email}. Cek inbox lo.`);
      } else if (mode === "sign-up") {
        if (password.length < 6) {
          setError("Password minimal 6 karakter");
          setBusy(false);
          return;
        }
        const { error: err, needsConfirmation } = await signUpWithPassword(email.trim(), password);
        if (err) setError(err);
        else if (needsConfirmation)
          setSuccess(`Akun dibuat. Cek email ${email} untuk konfirmasi.`);
        else {
          setSuccess("Akun dibuat & lo login ✓");
          setTimeout(onClose, 1000);
        }
      } else {
        const { error: err } = await signInWithPassword(email.trim(), password);
        if (err) setError(err);
        else {
          setSuccess("Login sukses ✓");
          setTimeout(onClose, 800);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-fade-in">
      <button
        type="button"
        aria-label="Tutup"
        onClick={() => !busy && onClose()}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl animate-slide-up dark:border-gray-700 dark:bg-gray-900">
        {!configured && (
          <div className="bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
            ⚠️ Supabase belum dikonfigurasi. Lihat web/.env.local.example.
          </div>
        )}

        {/* Header */}
        <div className="border-b border-gray-200 px-6 pb-3 pt-5 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {mode === "sign-up" ? "Buat Akun" : mode === "magic-link" ? "Magic Link" : "Masuk"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="text-gray-500 hover:text-rose-500 disabled:opacity-50"
              aria-label="Tutup modal"
            >
              ✕
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Sign in untuk sync favorit & data lo antar perangkat.
          </p>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <TabBtn active={mode === "sign-in"} onClick={() => setMode("sign-in")}>
            Masuk
          </TabBtn>
          <TabBtn active={mode === "sign-up"} onClick={() => setMode("sign-up")}>
            Buat Akun
          </TabBtn>
          <TabBtn active={mode === "magic-link"} onClick={() => setMode("magic-link")}>
            Magic Link
          </TabBtn>
        </div>

        {/* OAuth buttons */}
        <div className="space-y-2 px-6 pt-5">
          <button
            type="button"
            disabled={!configured || oauthBusy !== null}
            onClick={async () => {
              setError(null);
              setOauthBusy("google");
              const { error: err } = await signInWithOAuth("google");
              if (err) {
                setError(err);
                setOauthBusy(null);
              }
              // success: browser redirects to provider; component unmounts naturally
            }}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            <GoogleIcon />
            {oauthBusy === "google" ? "Redirecting…" : "Lanjutkan dengan Google"}
          </button>
          <button
            type="button"
            disabled={!configured || oauthBusy !== null}
            onClick={async () => {
              setError(null);
              setOauthBusy("github");
              const { error: err } = await signInWithOAuth("github");
              if (err) {
                setError(err);
                setOauthBusy(null);
              }
            }}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600"
          >
            <GithubIcon />
            {oauthBusy === "github" ? "Redirecting…" : "Lanjutkan dengan GitHub"}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 px-6 py-3">
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            atau pakai email
          </span>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3 px-6 pb-6">
          <label className="block">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </label>

          {mode !== "magic-link" && (
            <label className="block">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Password{" "}
                {mode === "sign-up" && (
                  <span className="font-normal text-gray-400">(min 6 karakter)</span>
                )}
              </span>
              <input
                type="password"
                required
                autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </label>
          )}

          {error && (
            <div className="rounded-md bg-rose-500/15 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-300">
              ✗ {error}
            </div>
          )}
          {success && (
            <div className="rounded-md bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-300">
              ✓ {success}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !configured}
            className="w-full rounded-md bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy
              ? "Loading..."
              : mode === "magic-link"
                ? "📨 Kirim Magic Link"
                : mode === "sign-up"
                  ? "Buat Akun"
                  : "Masuk"}
          </button>

          <p className="text-center text-[11px] text-gray-500 dark:text-gray-400">
            {mode === "magic-link"
              ? "Tanpa password — link login dikirim via email."
              : mode === "sign-up"
                ? "Dengan signup lo setuju syarat & privacy."
                : "Belum punya akun? Klik tab Buat Akun di atas."}
          </p>
        </form>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.69-3.88-1.54-3.88-1.54-.52-1.34-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18.92-.26 1.91-.39 2.89-.39.98 0 1.97.13 2.89.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.12 3.04.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.26 5.68.41.35.78 1.05.78 2.12 0 1.53-.01 2.77-.01 3.14 0 .31.21.67.79.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

function TabBtn({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex-1 border-b-2 px-3 py-2.5 text-xs font-semibold transition",
        active
          ? "border-brand-500 text-brand-600 dark:text-brand-400"
          : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
