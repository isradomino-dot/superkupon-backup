"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

export type OAuthProvider = "google" | "github";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const sb = getSupabase();
  const configured = isSupabaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    if (!sb) {
      setLoading(false);
      return;
    }
    let mounted = true;

    sb.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, sess) => {
      if (!mounted) return;
      setSession(sess);
      setUser(sess?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [sb]);

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      if (!sb) return { error: "Supabase belum dikonfigurasi" };
      const { error } = await sb.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    [sb],
  );

  const signUpWithPassword = useCallback(
    async (email: string, password: string) => {
      if (!sb) return { error: "Supabase belum dikonfigurasi", needsConfirmation: false };
      const { data, error } = await sb.auth.signUp({ email, password });
      const needsConfirmation = !!data?.user && !data.session;
      return { error: error?.message ?? null, needsConfirmation };
    },
    [sb],
  );

  const signInWithMagicLink = useCallback(
    async (email: string) => {
      if (!sb) return { error: "Supabase belum dikonfigurasi" };
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      return { error: error?.message ?? null };
    },
    [sb],
  );

  const signInWithOAuth = useCallback(
    async (provider: OAuthProvider) => {
      if (!sb) return { error: "Supabase belum dikonfigurasi" };
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
      const { error } = await sb.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      return { error: error?.message ?? null };
    },
    [sb],
  );

  const signOut = useCallback(async () => {
    if (!sb) return;
    await sb.auth.signOut();
  }, [sb]);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      session,
      loading,
      configured,
      signInWithPassword,
      signUpWithPassword,
      signInWithMagicLink,
      signInWithOAuth,
      signOut,
    }),
    [user, session, loading, configured, signInWithPassword, signUpWithPassword, signInWithMagicLink, signInWithOAuth, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside <AuthProvider>");
  return ctx;
}
