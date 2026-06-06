"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/lib/use-auth";
import { usePendingInvitations, type InvitationWithProject } from "@/lib/use-invitations";
import { SignInModal } from "@/components/SignInModal";

type Phase = "loading" | "not-found" | "email-mismatch" | "ready" | "accepting" | "done" | "error";

const COLOR_GRADIENTS: Record<string, string> = {
  violet: "from-violet-500 to-violet-700",
  emerald: "from-emerald-500 to-emerald-700",
  rose: "from-rose-500 to-rose-700",
  amber: "from-amber-500 to-orange-600",
  sky: "from-sky-500 to-blue-700",
  pink: "from-pink-500 to-pink-700",
};

export default function AcceptInvitationPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";

  const { user, loading: authLoading, configured } = useAuth();
  const { acceptInvitation, fetchByToken } = usePendingInvitations();

  const [phase, setPhase] = useState<Phase>("loading");
  const [invite, setInvite] = useState<InvitationWithProject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);

  // Fetch invitation once user is loaded
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      // not signed in — show CTA
      setPhase("ready");
      return;
    }
    let cancelled = false;
    (async () => {
      const inv = await fetchByToken(token);
      if (cancelled) return;
      if (!inv) {
        setPhase("not-found");
        return;
      }
      setInvite(inv);
      if (inv.invited_email.toLowerCase() !== user.email?.toLowerCase()) {
        setPhase("email-mismatch");
      } else if (inv.status === "accepted") {
        setPhase("done");
      } else if (inv.status === "cancelled") {
        setPhase("not-found");
      } else {
        setPhase("ready");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, token, fetchByToken]);

  const handleAccept = async () => {
    if (!user) return;
    setPhase("accepting");
    const result = await acceptInvitation(token);
    if (result.ok && result.projectId) {
      setPhase("done");
      setTimeout(() => {
        router.push(`/dashboard/projects/${result.projectId}`);
      }, 1500);
    } else {
      setError(result.error);
      setPhase("error");
    }
  };

  if (!configured) {
    return (
      <div className="rounded-2xl border-2 border-amber-400/40 bg-amber-500/10 p-8 text-center">
        <div className="text-5xl">⚠️</div>
        <h1 className="mt-3 text-xl font-bold text-amber-300">Supabase belum dikonfigurasi</h1>
        <p className="mt-2 text-sm text-amber-200">
          App butuh Supabase untuk accept invitation. Lihat supabase_setup.md.
        </p>
      </div>
    );
  }

  if (phase === "loading" || authLoading) {
    return (
      <div className="rounded-2xl border border-gray-700 bg-gray-900/40 p-12 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        <p className="mt-3 text-sm text-gray-400">Loading invitation...</p>
      </div>
    );
  }

  if (phase === "not-found") {
    return (
      <div className="rounded-2xl border border-dashed border-gray-600 p-12 text-center">
        <div className="text-5xl">🚫</div>
        <h1 className="mt-3 text-2xl font-bold text-white">Invitation tidak valid</h1>
        <p className="mt-2 text-sm text-gray-400">
          Link expired, invitation udah di-cancel, atau gak pernah ada.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-md bg-brand-500 px-4 py-2 text-sm font-bold text-white"
        >
          ← Ke beranda
        </Link>
      </div>
    );
  }

  if (phase === "email-mismatch" && invite) {
    return (
      <div className="rounded-2xl border-2 border-rose-400/40 bg-rose-500/10 p-8 text-center">
        <div className="text-5xl">📧</div>
        <h1 className="mt-3 text-xl font-bold text-rose-300">Email tidak cocok</h1>
        <p className="mt-2 text-sm text-rose-200">
          Invitation ini untuk{" "}
          <strong className="block break-all font-mono">{invite.invited_email}</strong>
          tapi lo login as{" "}
          <strong className="block break-all font-mono">{user?.email}</strong>
        </p>
        <p className="mt-4 text-xs text-rose-200/80">
          Sign out dan login dengan email yang sesuai untuk accept.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-md bg-rose-500 px-4 py-2 text-sm font-bold text-white"
        >
          ← Ke beranda
        </Link>
      </div>
    );
  }

  if (phase === "done" && invite) {
    return (
      <div className="rounded-2xl border-2 border-emerald-400/40 bg-emerald-500/10 p-8 text-center">
        <div className="text-5xl">✅</div>
        <h1 className="mt-3 text-2xl font-bold text-emerald-300">Berhasil!</h1>
        <p className="mt-2 text-sm text-emerald-200">
          Lo udah join project{" "}
          <strong>
            {invite.project?.emoji} {invite.project?.name}
          </strong>{" "}
          sebagai <strong>{invite.role}</strong>.
        </p>
        <p className="mt-1 text-xs text-emerald-200/80">Redirecting ke project...</p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="rounded-2xl border-2 border-rose-400/40 bg-rose-500/10 p-8 text-center">
        <div className="text-5xl">✗</div>
        <h1 className="mt-3 text-xl font-bold text-rose-300">Accept gagal</h1>
        <p className="mt-2 text-sm text-rose-200">{error ?? "Unknown error"}</p>
        <button
          type="button"
          onClick={() => setPhase("ready")}
          className="mt-4 rounded-md bg-rose-500 px-4 py-2 text-sm font-bold text-white"
        >
          ↻ Coba lagi
        </button>
      </div>
    );
  }

  // Phase: ready — show invitation card with accept button
  const gradient = invite?.project?.color ? COLOR_GRADIENTS[invite.project.color] : "from-violet-500 to-blue-700";

  return (
    <div className="space-y-6">
      <header className="rounded-2xl bg-gradient-to-br from-violet-600 via-purple-700 to-blue-700 p-6 text-white shadow-xl">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
          📨 Project Invitation
        </div>
        <h1 className="mt-2 text-3xl font-black">Lo di-invite ke project!</h1>
      </header>

      {invite && (
        <div className={["overflow-hidden rounded-2xl bg-gradient-to-br shadow-xl", gradient].join(" ")}>
          <div className="p-6 text-white">
            <div className="flex items-center gap-4">
              <span className="text-5xl" aria-hidden>{invite.project?.emoji ?? "📁"}</span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-2xl font-black">{invite.project?.name ?? "Untitled Project"}</h2>
                <p className="mt-1 text-sm text-white/80">
                  Sebagai{" "}
                  <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs font-bold uppercase">
                    {invite.role}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!user ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-5 text-center">
          <p className="text-sm font-semibold text-amber-200">
            🔐 Sign in dulu untuk accept invitation
          </p>
          <p className="mt-1 text-xs text-amber-200/80">
            Lo harus login dengan email yang sama persis dengan invitation.
          </p>
          <button
            type="button"
            onClick={() => setSignInOpen(true)}
            className="mt-4 rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-white shadow hover:bg-amber-600"
          >
            👤 Sign In / Buat Akun
          </button>
          <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
        </div>
      ) : (
        invite && (
          <div className="space-y-3">
            <div className="rounded-xl border border-gray-700 bg-gray-900/40 p-4 text-xs text-gray-400">
              <p>
                ✓ Logged in as <strong className="text-white">{user.email}</strong>
              </p>
              <p className="mt-1">
                ✓ Email match invitation untuk <strong className="text-white">{invite.invited_email}</strong>
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAccept}
                disabled={phase === "accepting"}
                className="flex-1 rounded-md bg-emerald-500 px-4 py-3 text-sm font-bold text-white shadow transition hover:bg-emerald-600 disabled:opacity-50"
              >
                {phase === "accepting" ? "Accepting..." : "✓ Accept Invitation"}
              </button>
              <Link
                href="/"
                className="flex items-center rounded-md border border-gray-600 px-4 py-3 text-sm font-medium text-gray-300 hover:bg-white/5"
              >
                Decline
              </Link>
            </div>
          </div>
        )
      )}
    </div>
  );
}
