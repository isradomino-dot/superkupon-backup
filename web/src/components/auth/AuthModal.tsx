"use client";

import { useEffect, useState } from "react";
import {
  AuthError,
  loginMember,
  registerMember,
  requestPasswordReset,
  type MemberUser,
} from "@/lib/auth-api";

type AuthModalMode = "login" | "register" | "forgot";

interface AuthModalProps {
  open: boolean;
  initialMode?: AuthModalMode;
  onClose: () => void;
  onSuccess: (user: MemberUser) => void;
}

export function AuthModal({
  open,
  initialMode = "login",
  onClose,
  onSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError(null);
      setSuccessMsg(null);
    }
  }, [open, initialMode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      if (mode === "login") {
        if (!identifier.trim() || !password.trim()) return;
        const result = await loginMember(identifier.trim(), password);
        setSuccessMsg(`✨ Selamat datang kembali, ${result.user.username}!`);
        setTimeout(() => {
          onSuccess(result.user);
          handleClose();
        }, 700);
      } else if (mode === "register") {
        if (!email.trim() || !username.trim() || !password.trim()) return;
        await registerMember(email.trim(), username.trim(), password);
        // Auto-login setelah register
        const result = await loginMember(username.trim(), password);
        setSuccessMsg(`🎉 Akun lo udah aktif, ${result.user.username}!`);
        setTimeout(() => {
          onSuccess(result.user);
          handleClose();
        }, 900);
      } else if (mode === "forgot") {
        if (!email.trim()) return;
        const result = await requestPasswordReset(email.trim());
        setSuccessMsg(`✉️ ${result.message}`);
        // Stay in modal — user perlu baca pesan
      }
    } catch (err) {
      const message =
        err instanceof AuthError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Terjadi error tak terduga";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setIdentifier("");
    setEmail("");
    setUsername("");
    setPassword("");
    setError(null);
    setSuccessMsg(null);
    setSubmitting(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6"
      onClick={handleClose}
    >
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md animate-in fade-in duration-200" />

      {/* Animated background blobs (matching admin login style) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-1/4 h-96 w-96 animate-pulse rounded-full bg-purple-500/20 blur-3xl" />
        <div
          className="absolute -right-32 bottom-1/4 h-96 w-96 animate-pulse rounded-full bg-pink-500/20 blur-3xl"
          style={{ animationDelay: "1s" }}
        />
      </div>

      {/* Modal card */}
      <div
        className="relative w-full max-w-md rounded-3xl border border-white/10 bg-gray-900/95 p-7 shadow-2xl shadow-purple-500/20 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          aria-label="Tutup"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 transition hover:bg-white/5 hover:text-white"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/40">
            <span className="text-2xl">
              {mode === "login" ? "👋" : mode === "register" ? "✨" : "🔑"}
            </span>
          </div>
          <h2 className="bg-gradient-to-r from-purple-200 via-pink-200 to-amber-200 bg-clip-text text-2xl font-bold text-transparent">
            {mode === "login"
              ? "Login SuperKupon"
              : mode === "register"
                ? "Daftar Akun Baru"
                : "Lupa Password"}
          </h2>
          <p className="mt-1.5 text-xs text-gray-400">
            {mode === "login"
              ? "Masuk untuk save favorit, klaim kupon, dan track promo"
              : mode === "register"
                ? "Gratis, gak perlu kartu kredit"
                : "Masukin email lo, admin bakal share token reset via WA"}
          </p>
        </div>

        {/* Tab toggle — hidden saat mode forgot */}
        {mode !== "forgot" && (
          <div className="mt-5 flex gap-1 rounded-xl border border-white/10 bg-gray-800/50 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                mode === "login"
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                mode === "register"
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Daftar
            </button>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="mt-5 space-y-3.5"
          autoComplete="on"
          name={mode === "login" ? "superkupon-login" : "superkupon-register"}
        >
          {mode === "login" && (
            <Field
              label="Email atau Username"
              icon="📧"
              type="text"
              value={identifier}
              onChange={setIdentifier}
              placeholder="user@email.com atau username"
              autoComplete="username"
              autoFocus
              disabled={submitting}
            />
          )}

          {mode === "register" && (
            <>
              <Field
                label="Email"
                icon="📧"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="kamu@email.com"
                autoComplete="email"
                autoFocus
                disabled={submitting}
              />
              <Field
                label="Username"
                icon="👤"
                type="text"
                value={username}
                onChange={setUsername}
                placeholder="superuser2026"
                autoComplete="username"
                disabled={submitting}
                hint="3-32 karakter, huruf/angka/underscore"
              />
            </>
          )}

          {mode === "forgot" && (
            <Field
              label="Email akun lo"
              icon="📧"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="kamu@email.com"
              autoComplete="email"
              autoFocus
              disabled={submitting}
              hint="Token reset akan dibikin di server. Hubungi admin via WhatsApp untuk dapet token."
            />
          )}

          {mode !== "forgot" && (
            <Field
              label="Password"
              icon="🔑"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              disabled={submitting}
              hint={mode === "register" ? "Minimal 6 karakter" : undefined}
            />
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-300">
              <span>❌</span>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-300">
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || successMsg !== null}
            className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-xl hover:shadow-purple-500/50 disabled:opacity-50"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {submitting ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {mode === "login"
                    ? "Login..."
                    : mode === "register"
                      ? "Daftar..."
                      : "Mengirim..."}
                </>
              ) : mode === "login" ? (
                <>🚀 Masuk</>
              ) : mode === "register" ? (
                <>✨ Bikin Akun</>
              ) : (
                <>📨 Kirim Permintaan Reset</>
              )}
            </span>
          </button>

          {/* Lupa password link — cuma muncul di mode login */}
          {mode === "login" && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-xs text-purple-300 hover:text-purple-200 hover:underline"
              >
                Lupa password?
              </button>
            </div>
          )}
        </form>

        {/* Footer hint */}
        <div className="mt-4 border-t border-white/10 pt-4 text-center text-xs text-gray-500">
          {mode === "login" ? (
            <>
              Belum punya akun?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="font-medium text-purple-300 hover:text-purple-200 hover:underline"
              >
                Daftar gratis
              </button>
            </>
          ) : mode === "register" ? (
            <>
              Udah punya akun?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="font-medium text-purple-300 hover:text-purple-200 hover:underline"
              >
                Login di sini
              </button>
            </>
          ) : (
            <>
              Inget password?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="font-medium text-purple-300 hover:text-purple-200 hover:underline"
              >
                ← Balik ke Login
              </button>
            </>
          )}
        </div>

        <div className="mt-3 text-center text-[10px] text-gray-600">
          🔒 Password lo aman — terenkripsi bcrypt
        </div>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  icon: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  hint?: string;
}

function Field({
  label,
  icon,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  autoFocus,
  disabled,
  hint,
}: FieldProps) {
  return (
    <div className="group">
      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 group-focus-within:text-purple-300">
        {label}
      </label>
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400">
          {icon}
        </span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          disabled={disabled}
          required
          className="w-full rounded-xl border border-white/10 bg-gray-800/50 px-3 py-2.5 pl-10 text-sm text-white placeholder-gray-500 transition focus:border-purple-400 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400/30 disabled:opacity-50"
        />
      </div>
      {hint && <p className="mt-1 text-[11px] text-gray-500">{hint}</p>}
    </div>
  );
}
