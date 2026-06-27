"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import {
  changePassword,
  fetchMyClaims,
  fetchMyStats,
  updateProfile,
  type MemberClaim,
  type MemberStats,
} from "@/lib/auth-api";

function formatRupiah(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString("id-ID")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "baru aja";
  if (diffMin < 60) return `${diffMin}m lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}j lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} hari lalu`;
  return formatDate(iso);
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading, openLogin, refresh } = useAuth();
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [claims, setClaims] = useState<MemberClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "settings">("overview");

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      openLogin();
      return;
    }
    Promise.all([fetchMyStats(), fetchMyClaims(20)])
      .then(([s, c]) => {
        setStats(s);
        setClaims(c);
      })
      .catch((e) => console.error("Failed to load profile:", e))
      .finally(() => setLoading(false));
  }, [user, isLoading, openLogin]);

  if (isLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500/30 border-t-purple-400" />
          <div className="text-sm text-gray-400">Loading profil...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-300">Lo harus login dulu</div>
          <button
            onClick={openLogin}
            className="mt-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-md"
          >
            🚀 Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Profile Card */}
      <section className="relative overflow-hidden rounded-3xl border border-purple-400/20 bg-gradient-to-br from-purple-600/20 via-pink-500/10 to-amber-500/10 p-6 backdrop-blur">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-pink-500/20 blur-3xl" />
        <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-3xl font-black text-white shadow-xl shadow-purple-500/40">
            {user.username[0]?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="bg-gradient-to-r from-purple-200 via-pink-200 to-amber-200 bg-clip-text text-3xl font-bold text-transparent">
              {user.username}
            </h1>
            <p className="mt-0.5 text-sm text-gray-400">{user.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/20 px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-purple-200">
                {user.role === "staff" ? "👁️ Staff" : "✨ Member"}
              </span>
              {stats && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-200">
                  🗓 {stats.days_active} hari aktif
                </span>
              )}
              {stats?.member_since && (
                <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-0.5 text-xs text-gray-300">
                  Member sejak {formatDate(stats.member_since)}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
        {[
          { key: "overview" as const, label: "📊 Overview", emoji: "📊" },
          { key: "history" as const, label: "📜 History", emoji: "📜" },
          { key: "settings" as const, label: "⚙️ Pengaturan", emoji: "⚙️" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              activeTab === t.key
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && stats && <OverviewTab stats={stats} />}
      {activeTab === "history" && <HistoryTab claims={claims} />}
      {activeTab === "settings" && (
        <SettingsTab
          currentUsername={user.username}
          currentEmail={user.email}
          onRefresh={refresh}
        />
      )}
    </div>
  );
}

// ============================================================
// Overview Tab
// ============================================================

function OverviewTab({ stats }: { stats: MemberStats }) {
  return (
    <div className="space-y-6">
      {/* Big Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon="💰"
          label="Total Penghematan"
          value={formatRupiah(stats.total_savings_idr)}
          color="from-emerald-500 to-teal-500"
          hint="Estimasi total diskon dari kupon yang lo klaim"
        />
        <StatCard
          icon="🎟️"
          label="Kupon Diklaim"
          value={stats.total_claims.toString()}
          color="from-purple-500 to-pink-500"
          hint={`${stats.claims_this_week} minggu ini · ${stats.claims_this_month} bulan ini`}
        />
        <StatCard
          icon="⭐"
          label="Merchant Favorit"
          value={stats.favorite_merchant || "—"}
          color="from-amber-500 to-orange-500"
          hint={
            stats.favorite_category
              ? `Kategori: ${stats.favorite_category}`
              : "Belum ada favorit"
          }
        />
      </div>

      {/* Top Merchants */}
      {stats.top_merchants.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
            🏆 Top Merchants Lo
          </h3>
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
            <ol className="divide-y divide-white/5">
              {stats.top_merchants.map((m, idx) => (
                <li
                  key={m.slug}
                  className="flex items-center gap-3 px-5 py-3 transition hover:bg-white/5"
                >
                  <span className="w-6 text-center text-sm font-bold text-gray-500">
                    {idx + 1}
                  </span>
                  <Link
                    href={`/merchant/${m.slug}`}
                    className="flex-1 text-sm font-semibold text-gray-200 hover:text-purple-300"
                  >
                    {m.name}
                  </Link>
                  <span className="text-sm font-bold text-purple-300">
                    {m.count} klaim
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {stats.total_claims === 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
          <div className="text-4xl">🎯</div>
          <h3 className="mt-2 text-base font-semibold text-amber-200">
            Belum Ada Klaim
          </h3>
          <p className="mt-1 text-sm text-amber-100/80">
            Mulai klaim kupon untuk lihat penghematan lo di sini!
          </p>
          <Link
            href="/"
            className="mt-3 inline-block rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow"
          >
            🎁 Lihat Kupon
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  hint,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
  hint: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur transition hover:border-white/20">
      <div
        className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${color} opacity-20 blur-2xl`}
      />
      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            {label}
          </span>
        </div>
        <div className="mt-2 break-words text-2xl font-bold text-white sm:text-3xl">
          {value}
        </div>
        <div className="mt-1 text-xs text-gray-500">{hint}</div>
      </div>
    </div>
  );
}

// ============================================================
// History Tab
// ============================================================

function HistoryTab({ claims }: { claims: MemberClaim[] }) {
  if (claims.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
        <div className="text-4xl">📜</div>
        <h3 className="mt-2 text-base font-semibold text-gray-300">
          History Kosong
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Kupon yang lo klaim akan muncul di sini.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
      <div className="border-b border-white/10 px-5 py-3 text-sm font-semibold text-gray-300">
        📜 {claims.length} Klaim Terakhir
      </div>
      <ol className="divide-y divide-white/5">
        {claims.map((c) => (
          <li
            key={c.id}
            className="flex flex-col gap-2 px-5 py-3 transition hover:bg-white/5 sm:flex-row sm:items-center"
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-200">
                {c.coupon_title}
              </div>
              <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-gray-500">
                <span>🏪 {c.merchant_name}</span>
                {c.category_slug && <span>🏷 {c.category_slug}</span>}
                <span>⏱ {formatRelativeTime(c.claimed_at)}</span>
                <span className="capitalize text-purple-400">
                  {c.action === "copy" ? "📋 Disalin" : "🌐 Dikunjungi"}
                </span>
              </div>
            </div>
            {c.estimated_saving_idr > 0 && (
              <div className="text-right">
                <div className="text-base font-bold text-emerald-300">
                  ~{formatRupiah(c.estimated_saving_idr)}
                </div>
                <div className="text-xs text-gray-500">est. hemat</div>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

// ============================================================
// Settings Tab
// ============================================================

function SettingsTab({
  currentUsername,
  currentEmail,
  onRefresh,
}: {
  currentUsername: string;
  currentEmail: string;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      <UpdateProfileSection
        currentUsername={currentUsername}
        currentEmail={currentEmail}
        onRefresh={onRefresh}
      />
      <ChangePasswordSection />
    </div>
  );
}

function UpdateProfileSection({
  currentUsername,
  currentEmail,
  onRefresh,
}: {
  currentUsername: string;
  currentEmail: string;
  onRefresh: () => void;
}) {
  const [username, setUsername] = useState(currentUsername);
  const [email, setEmail] = useState(currentEmail);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const dirty = username !== currentUsername || email !== currentEmail;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const updates: { username?: string; email?: string } = {};
      if (username !== currentUsername) updates.username = username;
      if (email !== currentEmail) updates.email = email;
      await updateProfile(updates);
      setMsg({ type: "success", text: "✅ Profil berhasil di-update" });
      onRefresh();
    } catch (err) {
      setMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Gagal update profil",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <h3 className="mb-4 text-base font-semibold text-gray-200">
        ✏️ Edit Profil
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={submitting}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-gray-800/50 px-3 py-2.5 text-sm text-white focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-gray-800/50 px-3 py-2.5 text-sm text-white focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
          />
        </div>
        {msg && (
          <div
            className={`rounded-xl border px-3 py-2 text-xs ${
              msg.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}
          >
            {msg.text}
          </div>
        )}
        <button
          type="submit"
          disabled={!dirty || submitting}
          className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-xl disabled:opacity-50"
        >
          {submitting ? "Saving..." : "💾 Simpan Perubahan"}
        </button>
      </form>
    </section>
  );
}

function ChangePasswordSection() {
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (newPass.length < 6) {
      setMsg({ type: "error", text: "Password baru minimal 6 karakter" });
      return;
    }
    if (newPass !== confirm) {
      setMsg({ type: "error", text: "Konfirmasi password gak match" });
      return;
    }
    setSubmitting(true);
    try {
      const result = await changePassword(current, newPass);
      setMsg({ type: "success", text: `✅ ${result.message}` });
      setCurrent("");
      setNewPass("");
      setConfirm("");
    } catch (err) {
      setMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Gagal ganti password",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <h3 className="mb-4 text-base font-semibold text-gray-200">
        🔑 Ganti Password
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <PasswordField
          label="Password Sekarang"
          value={current}
          onChange={setCurrent}
          disabled={submitting}
        />
        <PasswordField
          label="Password Baru"
          value={newPass}
          onChange={setNewPass}
          hint="Min 6 karakter"
          disabled={submitting}
        />
        <PasswordField
          label="Konfirmasi Password Baru"
          value={confirm}
          onChange={setConfirm}
          disabled={submitting}
        />
        {msg && (
          <div
            className={`rounded-xl border px-3 py-2 text-xs ${
              msg.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}
          >
            {msg.text}
          </div>
        )}
        <button
          type="submit"
          disabled={!current || !newPass || !confirm || submitting}
          className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-xl disabled:opacity-50"
        >
          {submitting ? "Updating..." : "🔐 Update Password"}
        </button>
      </form>
    </section>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  hint,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="mt-1.5 w-full rounded-xl border border-white/10 bg-gray-800/50 px-3 py-2.5 text-sm text-white focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
      />
      {hint && <p className="mt-1 text-[11px] text-gray-500">{hint}</p>}
    </div>
  );
}
