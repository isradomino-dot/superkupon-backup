"use client";

import { useCallback, useEffect, useState } from "react";

import { getSupabase, type InvitationRow, type ProjectRow } from "@/lib/supabase";
import { useAuth } from "@/lib/use-auth";

export interface InvitationWithProject extends InvitationRow {
  project?: Pick<ProjectRow, "id" | "name" | "emoji" | "color"> | null;
}

interface AcceptResult {
  ok: boolean;
  error: string | null;
  projectId: string | null;
}

interface UsePendingInvitationsResult {
  invitations: InvitationWithProject[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  acceptInvitation: (token: string) => Promise<AcceptResult>;
  declineInvitation: (id: string) => Promise<boolean>;
  fetchByToken: (token: string) => Promise<InvitationWithProject | null>;
}

/**
 * Lists pending invitations for the signed-in user (matched by email).
 */
export function usePendingInvitations(): UsePendingInvitationsResult {
  const { user } = useAuth();
  const sb = getSupabase();
  const [invitations, setInvitations] = useState<InvitationWithProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!sb || !user?.email) {
      setInvitations([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await sb
        .from("project_invitations")
        .select("*, projects(id, name, emoji, color)")
        .eq("invited_email", user.email.toLowerCase())
        .eq("status", "pending")
        .order("invited_at", { ascending: false });
      if (err) throw err;
      const rows = (data ?? []).map((r: InvitationRow & { projects: ProjectRow | null }) => ({
        ...r,
        project: r.projects,
      })) as InvitationWithProject[];
      setInvitations(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal load invitations");
    } finally {
      setLoading(false);
    }
  }, [sb, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /**
   * Fetch invitation by token (anyone authenticated can read via RLS policy).
   * Used by /invite/[token] accept page.
   */
  const fetchByToken = useCallback(
    async (token: string): Promise<InvitationWithProject | null> => {
      if (!sb) return null;
      try {
        const { data, error: err } = await sb
          .from("project_invitations")
          .select("*, projects(id, name, emoji, color)")
          .eq("invitation_token", token)
          .limit(1)
          .single();
        if (err) return null;
        const row = data as InvitationRow & { projects: ProjectRow | null };
        return { ...row, project: row.projects };
      } catch {
        return null;
      }
    },
    [sb],
  );

  const acceptInvitation = useCallback(
    async (token: string): Promise<AcceptResult> => {
      if (!sb || !user) {
        return { ok: false, error: "Sign in dulu", projectId: null };
      }
      try {
        // 1. Find pending invitation by token
        const { data: inviteData, error: findErr } = await sb
          .from("project_invitations")
          .select("*")
          .eq("invitation_token", token)
          .eq("status", "pending")
          .limit(1)
          .single();
        if (findErr || !inviteData) {
          return { ok: false, error: "Invitation gak ditemukan atau udah accepted", projectId: null };
        }
        const invite = inviteData as InvitationRow;

        // 2. Validate email match (server-side RLS also enforces this, but check di client untuk error message bagus)
        if (invite.invited_email.toLowerCase() !== user.email?.toLowerCase()) {
          return {
            ok: false,
            error: `Invitation ini untuk ${invite.invited_email}, tapi lo login as ${user.email}`,
            projectId: null,
          };
        }

        // 3. Insert into collaborators
        const { error: collabErr } = await sb.from("project_collaborators").insert({
          project_id: invite.project_id,
          user_id: user.id,
          role: invite.role,
          invited_by: invite.invited_by,
        });
        if (collabErr && collabErr.code !== "23505") {
          throw collabErr;
        }

        // 4. Mark invitation accepted
        const { error: updateErr } = await sb
          .from("project_invitations")
          .update({
            status: "accepted",
            accepted_at: new Date().toISOString(),
          })
          .eq("id", invite.id);
        if (updateErr) throw updateErr;

        setInvitations((prev) => prev.filter((i) => i.id !== invite.id));
        return { ok: true, error: null, projectId: invite.project_id };
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : "Accept gagal",
          projectId: null,
        };
      }
    },
    [sb, user],
  );

  const declineInvitation = useCallback(
    async (id: string): Promise<boolean> => {
      if (!sb) return false;
      try {
        const { error: err } = await sb
          .from("project_invitations")
          .update({ status: "cancelled" })
          .eq("id", id);
        if (err) throw err;
        setInvitations((prev) => prev.filter((i) => i.id !== id));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Decline gagal");
        return false;
      }
    },
    [sb],
  );

  return {
    invitations,
    loading,
    error,
    refresh,
    acceptInvitation,
    declineInvitation,
    fetchByToken,
  };
}
