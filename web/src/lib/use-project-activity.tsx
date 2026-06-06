"use client";

import { useCallback, useEffect, useState } from "react";

import { getSupabase, type ActivityAction, type ProjectActivityRow } from "@/lib/supabase";
import { useAuth } from "@/lib/use-auth";

interface UseProjectActivityResult {
  activities: ProjectActivityRow[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  logActivity: (
    projectId: string,
    action: ActivityAction,
    details?: Record<string, unknown>,
  ) => Promise<void>;
}

const PAGE_SIZE = 20;

/**
 * Project-scoped activity feed. If projectId omitted, returns empty.
 */
export function useProjectActivity(projectId?: string): UseProjectActivityResult {
  const { user } = useAuth();
  const sb = getSupabase();
  const [activities, setActivities] = useState<ProjectActivityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!sb || !projectId) {
      setActivities([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await sb
        .from("project_activity")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      if (err) throw err;
      setActivities((data ?? []) as ProjectActivityRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal load activity");
    } finally {
      setLoading(false);
    }
  }, [sb, projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logActivity = useCallback(
    async (pid: string, action: ActivityAction, details?: Record<string, unknown>) => {
      if (!sb || !user) return;
      try {
        const { data, error: err } = await sb
          .from("project_activity")
          .insert({
            project_id: pid,
            user_id: user.id,
            action,
            details: details ?? null,
          })
          .select()
          .single();
        if (err) throw err;
        if (pid === projectId) {
          setActivities((prev) => [data as ProjectActivityRow, ...prev].slice(0, PAGE_SIZE));
        }
      } catch {
        /* silent — activity log is best-effort, jangan ganggu user flow */
      }
    },
    [sb, user, projectId],
  );

  return {
    activities,
    loading,
    error,
    refresh,
    logActivity,
  };
}

/**
 * Logger-only variant — buat hooks lain (useProjects) yang perlu insert activity
 * tanpa nampilin feed.
 */
export function useActivityLogger() {
  const { user } = useAuth();
  const sb = getSupabase();

  return useCallback(
    async (projectId: string, action: ActivityAction, details?: Record<string, unknown>) => {
      if (!sb || !user) return;
      try {
        await sb.from("project_activity").insert({
          project_id: projectId,
          user_id: user.id,
          action,
          details: details ?? null,
        });
      } catch {
        /* silent */
      }
    },
    [sb, user],
  );
}
