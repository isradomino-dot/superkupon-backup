"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getSupabase,
  type CollaboratorRole,
  type CollaboratorRow,
  type InvitationRow,
} from "@/lib/supabase";
import { useAuth } from "@/lib/use-auth";

export interface EnrichedCollaborator extends CollaboratorRow {
  email?: string;
}

interface UseCollaboratorsResult {
  collaborators: EnrichedCollaborator[];
  invitations: InvitationRow[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  inviteByEmail: (
    email: string,
    role: CollaboratorRole,
  ) => Promise<{ invitation: InvitationRow | null; error: string | null }>;
  cancelInvitation: (id: string) => Promise<boolean>;
  changeRole: (userId: string, role: CollaboratorRole) => Promise<boolean>;
  removeCollaborator: (userId: string) => Promise<boolean>;
}

/**
 * Project-scoped collaborator management. Requires user be owner of project.
 */
export function useCollaborators(projectId?: string): UseCollaboratorsResult {
  const { user } = useAuth();
  const sb = getSupabase();
  const [collaborators, setCollaborators] = useState<EnrichedCollaborator[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!sb || !projectId) {
      setCollaborators([]);
      setInvitations([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [collabRes, inviteRes] = await Promise.all([
        sb.from("project_collaborators").select("*").eq("project_id", projectId),
        sb
          .from("project_invitations")
          .select("*")
          .eq("project_id", projectId)
          .eq("status", "pending")
          .order("invited_at", { ascending: false }),
      ]);
      if (collabRes.error) throw collabRes.error;
      if (inviteRes.error) throw inviteRes.error;
      setCollaborators((collabRes.data ?? []) as CollaboratorRow[]);
      setInvitations((inviteRes.data ?? []) as InvitationRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal load collaborators");
    } finally {
      setLoading(false);
    }
  }, [sb, projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const inviteByEmail = useCallback(
    async (
      email: string,
      role: CollaboratorRole,
    ): Promise<{ invitation: InvitationRow | null; error: string | null }> => {
      if (!sb || !user || !projectId) {
        return { invitation: null, error: "Not configured" };
      }
      const trimmed = email.trim().toLowerCase();
      if (!trimmed || !trimmed.includes("@")) {
        return { invitation: null, error: "Email tidak valid" };
      }
      if (trimmed === user.email?.toLowerCase()) {
        return { invitation: null, error: "Lo udah owner — gak perlu invite diri sendiri" };
      }
      try {
        const { data, error: err } = await sb
          .from("project_invitations")
          .insert({
            project_id: projectId,
            invited_email: trimmed,
            role,
            invited_by: user.id,
            status: "pending",
          })
          .select()
          .single();
        if (err) {
          // 23505 = unique violation: invite already exists
          if (err.code === "23505")
            return { invitation: null, error: "Email ini udah di-invite ke project ini" };
          throw err;
        }
        const row = data as InvitationRow;
        setInvitations((prev) => [row, ...prev]);
        return { invitation: row, error: null };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Invite gagal";
        return { invitation: null, error: msg };
      }
    },
    [sb, user, projectId],
  );

  const cancelInvitation = useCallback(
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
        setError(e instanceof Error ? e.message : "Cancel gagal");
        return false;
      }
    },
    [sb],
  );

  const changeRole = useCallback(
    async (userId: string, role: CollaboratorRole): Promise<boolean> => {
      if (!sb || !projectId) return false;
      try {
        const { error: err } = await sb
          .from("project_collaborators")
          .update({ role })
          .eq("project_id", projectId)
          .eq("user_id", userId);
        if (err) throw err;
        setCollaborators((prev) =>
          prev.map((c) => (c.user_id === userId ? { ...c, role } : c)),
        );
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ganti role gagal");
        return false;
      }
    },
    [sb, projectId],
  );

  const removeCollaborator = useCallback(
    async (userId: string): Promise<boolean> => {
      if (!sb || !projectId) return false;
      try {
        const { error: err } = await sb
          .from("project_collaborators")
          .delete()
          .eq("project_id", projectId)
          .eq("user_id", userId);
        if (err) throw err;
        setCollaborators((prev) => prev.filter((c) => c.user_id !== userId));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Remove gagal");
        return false;
      }
    },
    [sb, projectId],
  );

  return {
    collaborators,
    invitations,
    loading,
    error,
    refresh,
    inviteByEmail,
    cancelInvitation,
    changeRole,
    removeCollaborator,
  };
}
