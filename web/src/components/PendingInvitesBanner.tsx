"use client";

import { useState } from "react";

import { usePendingInvitations } from "@/lib/use-invitations";

export function PendingInvitesBanner() {
  const { invitations, acceptInvitation, declineInvitation } = usePendingInvitations();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  if (invitations.length === 0) return null;

  return (
    <section className="rounded-2xl border-2 border-amber-400/40 bg-gradient-to-br from-amber-500/15 to-orange-500/10 p-5 animate-slide-up">
      <header className="mb-3 flex items-center gap-2">
        <span className="text-2xl">📨</span>
        <div>
          <h2 className="text-lg font-bold text-amber-200">
            {invitations.length} Pending Invitation{invitations.length > 1 ? "s" : ""}
          </h2>
          <p className="text-xs text-amber-300/80">
            Project owner ngundang lo collaborate
          </p>
        </div>
      </header>

      <ul className="space-y-2">
        {invitations.map((inv) => (
          <li
            key={inv.id}
            className="flex items-center gap-3 rounded-md border border-amber-400/30 bg-amber-500/5 p-3"
          >
            <span className="text-2xl flex-none" aria-hidden>
              {inv.project?.emoji ?? "📁"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-bold text-white">
                  {inv.project?.name ?? "Project"}
                </span>
                <span className="rounded-full bg-amber-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                  {inv.role}
                </span>
              </div>
              <div className="text-[10px] text-amber-300/70">
                Invited {new Date(inv.invited_at).toLocaleDateString("id-ID")}
              </div>
            </div>
            <div className="flex flex-none gap-1">
              <button
                type="button"
                disabled={acceptingId === inv.id}
                onClick={async () => {
                  setAcceptingId(inv.id);
                  await acceptInvitation(inv.invitation_token);
                  setAcceptingId(null);
                }}
                className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {acceptingId === inv.id ? "..." : "✓ Accept"}
              </button>
              <button
                type="button"
                onClick={() => declineInvitation(inv.id)}
                className="rounded-md border border-gray-600 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-white/5"
              >
                Decline
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
