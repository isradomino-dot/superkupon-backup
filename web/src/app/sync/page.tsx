"use client";

import Link from "next/link";
import { useState } from "react";

import { useAuth } from "@/lib/use-auth";
import { pullFromCloud, pushToCloud } from "@/lib/cloud-sync";

interface SyncStatus {
  kind: "idle" | "running" | "ok" | "err";
  message: string;
}

export default function SyncPage() {
  const { user, configured, loading } = useAuth();
  const [pushStatus, setPushStatus] = useState<SyncStatus>({ kind: "idle", message: "" });
  const [pullStatus, setPullStatus] = useState<SyncStatus>({ kind: "idle", message: "" });

  const handlePush = async () => {
    if (!user) return;
    setPushStatus({ kind: "running", message: "Uploading..." });
    try {
      const r = await pushToCloud(user.id);
      setPushStatus({
        kind: "ok",
        message: `✓ Pushed: ${r.favorites} favorit · ${r.folders} folder · ${r.follows} follows · ${r.votes} votes`,
      });
    } catch (e) {
      setPushStatus({
        kind: "err",
        message: e instanceof Error ? e.message : "Push gagal",
      });
    }
  };

  const handlePull = async () => {
    if (!user) return;
    if (!confirm("Pull cloud akan REPLACE data lokal lo. Yakin?")) return;
    setPullStatus({ kind: "running", message: "Downloading..." });
    try {
      const r = await pullFromCloud(user.id);
      setPullStatus({
        kind: "ok",
        message: `✓ Pulled: ${r.favorites} favorit · ${r.folders} folder · ${r.follows} follows · ${r.votes} votes. Reload buat liat changes.`,
      });
    } catch (e) {
      setPullStatus({
        kind: "err",
        message: e instanceof Error ? e.message : "Pull gagal",
      });
    }
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl bg-gradient-to-br from-violet-600 via-purple-700 to-blue-700 p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
              ☁️ Cloud Sync
            </div>
            <h1 className="mt-2 text-3xl font-black">Sync ke Cloud</h1>
            <p className="mt-1 text-sm text-violet-100">
              Backup favorit, folder, merchant follows, dan votes ke Supabase — bisa akses dari device manapun.
            </p>
          </div>
          <Link href="/" className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25">
            ← Beranda
          </Link>
        </div>
      </header>

      {!configured && <UnconfiguredCard />}
      {configured && loading && (
        <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-8 text-center text-sm text-gray-400">
          Loading auth state...
        </div>
      )}
      {configured && !loading && !user && <NotSignedInCard />}

      {configured && user && (
        <>
          <UserInfoCard email={user.email ?? ""} userId={user.id} />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SyncCard
              icon="⬆"
              title="Push ke Cloud"
              description="Upload data lokal lo (localStorage) ke Supabase. Existing cloud data di-overwrite per key (upsert)."
              actionLabel="Push sekarang"
              tone="violet"
              status={pushStatus}
              onClick={handlePush}
            />
            <SyncCard
              icon="⬇"
              title="Pull dari Cloud"
              description="Download cloud data dan REPLACE data lokal lo. Berguna buat first-time setup di device baru."
              actionLabel="Pull sekarang"
              tone="emerald"
              status={pullStatus}
              onClick={handlePull}
            />
          </div>

          <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-4 text-xs text-gray-400">
            <h3 className="mb-1 font-bold text-gray-300">ℹ️ Cara kerja sync</h3>
            <ul className="list-inside list-disc space-y-1">
              <li>
                Push = lokal → cloud (upsert, gak hapus cloud data yang lokal-nya gak ada)
              </li>
              <li>
                Pull = cloud → lokal (replace localStorage dengan data Supabase)
              </li>
              <li>
                Data yang ke-sync: favorit kupon, folder, merchant follows, votes (works/expired)
              </li>
              <li>
                Search history, streak, view history TIDAK ke-sync (privacy-first per device)
              </li>
              <li>Row Level Security: tiap user cuma bisa baca/tulis data dia sendiri</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function UnconfiguredCard() {
  return (
    <div className="rounded-xl border-2 border-amber-400/40 bg-amber-500/10 p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-amber-300">
        ⚠️ Supabase belum dikonfigurasi
      </h2>
      <p className="mt-2 text-sm text-amber-200">
        Bikin Supabase project + isi env vars dulu sebelum bisa sync. Step:
      </p>
      <ol className="mt-3 list-inside list-decimal space-y-1.5 text-xs text-amber-100/90">
        <li>
          Buat project di <a href="https://supabase.com" target="_blank" rel="noreferrer" className="underline">supabase.com</a>
        </li>
        <li>
          SQL Editor → copy-paste isi <code className="rounded bg-black/30 px-1.5">supabase_schema.sql</code> di project root → Run
        </li>
        <li>
          Settings → API → copy <strong>Project URL</strong> & <strong>anon public key</strong>
        </li>
        <li>
          Buka <code className="rounded bg-black/30 px-1.5">web/.env.local</code>, tambahin:
        </li>
        <li>
          <pre className="rounded bg-black/30 px-2 py-1.5 text-[10px]">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...`}
          </pre>
        </li>
        <li>Restart Next.js dev (Ctrl+C di terminal, run ulang)</li>
      </ol>
      <p className="mt-3 text-[11px] text-amber-200/80">
        Detail lengkap: lihat <code>supabase_setup.md</code> di project root.
      </p>
    </div>
  );
}

function NotSignedInCard() {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-8 text-center">
      <div className="text-5xl">🔐</div>
      <h2 className="mt-3 text-lg font-bold text-white">Sign in dulu</h2>
      <p className="mt-1 text-sm text-gray-400">
        Klik tombol Masuk di header buat sign in atau buat akun baru.
      </p>
    </div>
  );
}

function UserInfoCard({ email, userId }: { email: string; userId: string }) {
  return (
    <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
          ✓
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
            Signed in
          </div>
          <div className="truncate font-semibold text-white">{email}</div>
          <div className="truncate font-mono text-[10px] text-emerald-200/70">{userId}</div>
        </div>
      </div>
    </div>
  );
}

function SyncCard({
  icon,
  title,
  description,
  actionLabel,
  tone,
  status,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  actionLabel: string;
  tone: "violet" | "emerald";
  status: SyncStatus;
  onClick: () => void;
}) {
  const bg = tone === "violet" ? "bg-violet-500 hover:bg-violet-600" : "bg-emerald-500 hover:bg-emerald-600";
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-5">
      <div className="text-3xl">{icon}</div>
      <h3 className="mt-2 text-lg font-bold text-white">{title}</h3>
      <p className="mt-1 text-xs text-gray-400">{description}</p>
      <button
        type="button"
        onClick={onClick}
        disabled={status.kind === "running"}
        className={[
          "mt-4 w-full rounded-md px-4 py-2 text-sm font-bold text-white shadow transition",
          bg,
          status.kind === "running" ? "cursor-not-allowed opacity-50" : "",
        ].join(" ")}
      >
        {status.kind === "running" ? "Syncing..." : actionLabel}
      </button>
      {status.message && (
        <div
          className={[
            "mt-3 rounded-md px-3 py-2 text-xs font-medium",
            status.kind === "ok"
              ? "bg-emerald-500/15 text-emerald-300"
              : status.kind === "err"
                ? "bg-rose-500/15 text-rose-300"
                : "bg-gray-700/40 text-gray-300",
          ].join(" ")}
        >
          {status.message}
        </div>
      )}
    </div>
  );
}
