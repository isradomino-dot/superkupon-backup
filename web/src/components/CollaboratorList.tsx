"use client";

import { useState } from "react";

import { useCollaborators } from "@/lib/use-collaborators";
import type { CollaboratorRole } from "@/lib/supabase";
import { InviteModal } from "@/components/InviteModal";

interface Props {
  projectId: string;
  projectName: string;
  ownerUserId: string;
  currentUserId: string;
}

function userInitial(id: string): string {
  return id.charAt(0).toUpperCase();
}

function shortUserId(id: string): string {
  return `${id.slice(0, 8)}…`;
}

export function CollaboratorList({
  projectId,
  projectName,
  ownerUserId,
  currentUserId,
}: Props) {
  const {
    collaborators,
    invitations,
    loading,
    changeRole,
    removeCollaborator,
    cancelInvitation,
  } = useCollaborators(projectId);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const isOwner = currentUserId === ownerUserId;
  const totalSeats = 1 + collaborators.length;

  return (
    <section className="rounded-2xl border border-gray-700 bg-gray-900/40 p-5">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-white">
          👥 Collaborators{" "}
          <span className="text-[10px] font-normal text-gray-500">({totalSeats})</span>
        </h2>
        {isOwner && (
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="rounded-md bg-brand-500 px-3 py-1 text-xs font-bold text-white shadow hover:bg-brand-600"
          >
            + Invite
          </button>
        )}
      </header>

      <ul className="space-y-2">
        {/* Owner row (always first) */}
        <li className="flex items-center gap-3 rounded-md border border-amber-400/30 bg-amber-500/10 p-3">
          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-sm font-bold text-white shadow-md">
            {userInitial(ownerUserId)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-white">
                {ownerUserId === currentUserId ? "Lo" : shortUserId(ownerUserId)}
              </span>
              <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                Owner
              </span>
            </div>
            <div className="text-[10px] text-amber-300/80">Full control · cannot remove</div>
          </div>
        </li>

        {/* Collaborator rows */}
        {collaborators.map((c) => {
          const isSelf = c.user_id === currentUserId;
          return (
            <li
              key={c.user_id}
              className="flex items-center gap-3 rounded-md border border-gray-700 bg-gray-800/40 p-3"
            >
              <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-700 text-sm font-bold text-white shadow-md">
                {userInitial(c.user_id)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-white">
                    {isSelf ? "Lo" : shortUserId(c.user_id)}
                  </span>
                  {isOwner && !isSelf ? (
                    <select
                      value={c.role}
                      onChange={(e) => changeRole(c.user_id, e.target.value as CollaboratorRole)}
                      className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-200 focus:outline-none"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                  ) : (
                    <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-200">
                      {c.role}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-gray-500">
                  Joined {new Date(c.joined_at).toLocaleDateString("id-ID")}
                </div>
              </div>
              {(isOwner || isSelf) && (
                <div className="flex-none">
                  {confirmRemove === c.user_id ? (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={async () => {
                          await removeCollaborator(c.user_id);
                          setConfirmRemove(null);
                        }}
                        className="rounded bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white"
                      >
                        {isSelf ? "Leave?" : "Remove?"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmRemove(null)}
                        className="rounded bg-gray-700 px-2 py-0.5 text-[10px] font-bold text-gray-300"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmRemove(c.user_id)}
                      className="rounded px-2 py-0.5 text-[10px] font-bold text-rose-400 hover:bg-rose-500/15"
                    >
                      {isSelf ? "Leave" : "Remove"}
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}

        {/* Pending invitations (owner only) */}
        {isOwner && invitations.map((inv) => (
          <li
            key={inv.id}
            className="flex items-center gap-3 rounded-md border border-dashed border-amber-400/40 bg-amber-500/5 p-3"
          >
            <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/30 text-sm font-bold text-amber-200">
              ?
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-amber-200">
                  {inv.invited_email}
                </span>
                <span className="rounded-full bg-amber-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                  {inv.role}
                </span>
              </div>
              <div className="text-[10px] text-amber-300/70">
                ⏳ Pending · invited {new Date(inv.invited_at).toLocaleDateString("id-ID")}
              </div>
            </div>
            <button
              type="button"
              onClick={() => cancelInvitation(inv.id)}
              className="flex-none rounded px-2 py-0.5 text-[10px] font-bold text-rose-400 hover:bg-rose-500/15"
            >
              Cancel
            </button>
          </li>
        ))}
      </ul>

      {loading && (
        <div className="mt-2 text-center text-[10px] text-gray-500">Loading...</div>
      )}

      {!isOwner && collaborators.length === 0 && invitations.length === 0 && (
        <p className="mt-3 rounded-md border border-dashed border-gray-600 p-4 text-center text-xs text-gray-500">
          Cuma owner yang bisa invite. Lo cuma punya 1-to-1 access ke project ini.
        </p>
      )}

      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        projectId={projectId}
        projectName={projectName}
      />
    </section>
  );
}
