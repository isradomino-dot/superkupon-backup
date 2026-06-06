"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { getSupabase, type ProjectRow, type ProjectStatus, type ProjectUpdate } from "@/lib/supabase";
import { useAuth } from "@/lib/use-auth";
import { useActivityLogger } from "@/lib/use-project-activity";

interface NewProjectInput {
  name: string;
  description?: string;
  status?: ProjectStatus;
  emoji?: string;
  color?: string;
  url?: string;
}

export type RealtimeStatus = "off" | "connecting" | "connected" | "disconnected" | "error";

export interface RealtimeEvent {
  type: "INSERT" | "UPDATE" | "DELETE";
  projectName: string;
  at: number;
}

interface UseProjectsResult {
  projects: ProjectRow[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createProject: (input: NewProjectInput) => Promise<ProjectRow | null>;
  updateProject: (id: string, patch: ProjectUpdate) => Promise<ProjectRow | null>;
  deleteProject: (id: string) => Promise<boolean>;
  getProject: (id: string) => ProjectRow | undefined;
  realtimeStatus: RealtimeStatus;
  recentEvents: RealtimeEvent[];
  clearRecentEvents: () => void;
}

const MAX_RECENT_EVENTS = 10;

const ProjectsCtx = createContext<UseProjectsResult | null>(null);

/**
 * Mount once near root of authenticated app (e.g. dashboard layout).
 * Owns single Supabase realtime channel + shared cache.
 */
export function ProjectsProvider({ children }: { children: ReactNode }) {
  const value = useProjectsImpl();
  return <ProjectsCtx.Provider value={value}>{children}</ProjectsCtx.Provider>;
}

export function useProjects(): UseProjectsResult {
  const ctx = useContext(ProjectsCtx);
  if (ctx) return ctx;
  // Fallback for components rendered outside provider (e.g. preview/mockup).
  // This will spin up an independent instance — fine for read-only use.
  return useProjectsImpl();
}

function useProjectsImpl(): UseProjectsResult {
  const { user } = useAuth();
  const sb = getSupabase();
  const logActivity = useActivityLogger();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("off");
  const [recentEvents, setRecentEvents] = useState<RealtimeEvent[]>([]);
  /**
   * Track IDs of projects that originated from this tab's own mutations.
   * Used to skip echo from realtime channel (we already updated state optimistically).
   */
  const localOpRef = useRef<Set<string>>(new Set());

  const markLocalOp = useCallback((id: string) => {
    localOpRef.current.add(id);
    // Clear after 2s — realtime echo should arrive within that window
    setTimeout(() => localOpRef.current.delete(id), 2000);
  }, []);

  const pushEvent = useCallback((ev: RealtimeEvent) => {
    setRecentEvents((prev) => [ev, ...prev].slice(0, MAX_RECENT_EVENTS));
  }, []);

  const refresh = useCallback(async () => {
    if (!sb || !user) {
      setProjects([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await sb
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (err) throw err;
      setProjects((data ?? []) as ProjectRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal load projects");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [sb, user]);

  // Initial fetch + refetch on user change
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Realtime subscription
  useEffect(() => {
    if (!sb || !user) {
      setRealtimeStatus("off");
      return;
    }

    setRealtimeStatus("connecting");
    const channel = sb
      .channel(`projects-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as ProjectRow;
            // skip echo of our own optimistic insert
            if (localOpRef.current.has(row.id)) return;
            setProjects((prev) =>
              prev.some((p) => p.id === row.id) ? prev : [row, ...prev],
            );
            pushEvent({ type: "INSERT", projectName: row.name, at: Date.now() });
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as ProjectRow;
            if (localOpRef.current.has(row.id)) return;
            setProjects((prev) => prev.map((p) => (p.id === row.id ? row : p)));
            pushEvent({ type: "UPDATE", projectName: row.name, at: Date.now() });
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as Partial<ProjectRow>;
            if (!old.id) return;
            if (localOpRef.current.has(old.id)) return;
            const removed = projects.find((p) => p.id === old.id);
            setProjects((prev) => prev.filter((p) => p.id !== old.id));
            pushEvent({
              type: "DELETE",
              projectName: removed?.name ?? "(unknown)",
              at: Date.now(),
            });
          }
        },
      )
      .subscribe((status) => {
        // Status values: 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED'
        if (status === "SUBSCRIBED") setRealtimeStatus("connected");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
          setRealtimeStatus("error");
        else if (status === "CLOSED") setRealtimeStatus("disconnected");
      });

    return () => {
      void sb.removeChannel(channel);
      setRealtimeStatus("off");
    };
    // we intentionally exclude `projects` so the subscription doesn't re-create on every change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sb, user, pushEvent]);

  const createProject = useCallback(
    async (input: NewProjectInput): Promise<ProjectRow | null> => {
      if (!sb || !user) return null;
      setError(null);
      try {
        const { data, error: err } = await sb
          .from("projects")
          .insert({
            user_id: user.id,
            name: input.name,
            description: input.description ?? null,
            status: input.status ?? "active",
            emoji: input.emoji ?? "📁",
            color: input.color ?? "violet",
            url: input.url ?? null,
          })
          .select()
          .single();
        if (err) throw err;
        const row = data as ProjectRow;
        markLocalOp(row.id);
        setProjects((prev) => [row, ...prev]);
        void logActivity(row.id, "created", { name: row.name });
        return row;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal create project");
        return null;
      }
    },
    [sb, user, markLocalOp, logActivity],
  );

  const updateProject = useCallback(
    async (id: string, patch: ProjectUpdate): Promise<ProjectRow | null> => {
      if (!sb || !user) return null;
      setError(null);
      try {
        const { data, error: err } = await sb
          .from("projects")
          .update(patch)
          .eq("id", id)
          .eq("user_id", user.id)
          .select()
          .single();
        if (err) throw err;
        const row = data as ProjectRow;
        markLocalOp(row.id);
        setProjects((prev) => prev.map((p) => (p.id === id ? row : p)));
        // Determine which logical action was performed
        if ("is_public" in patch && patch.is_public !== undefined) {
          void logActivity(row.id, patch.is_public ? "shared" : "unshared", { name: row.name });
        } else {
          void logActivity(row.id, "updated", { name: row.name });
        }
        return row;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal update project");
        return null;
      }
    },
    [sb, user, markLocalOp, logActivity],
  );

  const deleteProject = useCallback(
    async (id: string): Promise<boolean> => {
      if (!sb || !user) return false;
      setError(null);
      try {
        markLocalOp(id);
        const { error: err } = await sb
          .from("projects")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);
        if (err) throw err;
        setProjects((prev) => prev.filter((p) => p.id !== id));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal delete project");
        return false;
      }
    },
    [sb, user, markLocalOp],
  );

  const getProject = useCallback(
    (id: string) => projects.find((p) => p.id === id),
    [projects],
  );

  const clearRecentEvents = useCallback(() => setRecentEvents([]), []);

  return useMemo(
    () => ({
      projects,
      loading,
      error,
      refresh,
      createProject,
      updateProject,
      deleteProject,
      getProject,
      realtimeStatus,
      recentEvents,
      clearRecentEvents,
    }),
    [
      projects,
      loading,
      error,
      refresh,
      createProject,
      updateProject,
      deleteProject,
      getProject,
      realtimeStatus,
      recentEvents,
      clearRecentEvents,
    ],
  );
}
