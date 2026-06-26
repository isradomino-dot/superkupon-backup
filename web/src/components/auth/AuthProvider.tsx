"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  clearMemberToken,
  getMemberUser,
  isMemberLoggedIn,
  logoutMember,
  refreshMemberSession,
  type MemberUser,
} from "@/lib/auth-api";
import { AuthModal } from "./AuthModal";

/**
 * Global auth context — expose user state + openAuthModal() function ke
 * semua component. Pattern: components seperti CouponActionGroup tinggal
 * call `useAuth()` untuk cek user + trigger login modal saat klik.
 */

interface AuthContextValue {
  user: MemberUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  openLogin: () => void;
  openRegister: () => void;
  /** Cek apakah user logged in; kalau gak, auto-trigger login modal + return false */
  requireLogin: () => boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MemberUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"login" | "register">("login");

  // Hydrate from localStorage + verify token in background
  useEffect(() => {
    if (isMemberLoggedIn()) {
      const cached = getMemberUser();
      if (cached) setUser(cached);
      refreshMemberSession().then((fresh) => {
        if (fresh) {
          setUser(fresh);
        } else if (!getMemberUser()) {
          setUser(null);
        }
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const openLogin = useCallback(() => {
    setModalMode("login");
    setModalOpen(true);
  }, []);

  const openRegister = useCallback(() => {
    setModalMode("register");
    setModalOpen(true);
  }, []);

  const requireLogin = useCallback((): boolean => {
    if (user) return true;
    setModalMode("login");
    setModalOpen(true);
    return false;
  }, [user]);

  const logout = useCallback(async () => {
    try {
      await logoutMember();
    } catch {
      clearMemberToken();
    }
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const fresh = await refreshMemberSession();
    if (fresh) {
      setUser(fresh);
    } else if (!getMemberUser()) {
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoggedIn: user !== null,
      isLoading,
      openLogin,
      openRegister,
      requireLogin,
      logout,
      refresh,
    }),
    [user, isLoading, openLogin, openRegister, requireLogin, logout, refresh],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthModal
        open={modalOpen}
        initialMode={modalMode}
        onClose={() => setModalOpen(false)}
        onSuccess={(u) => {
          setUser(u);
          setModalOpen(false);
        }}
      />
    </AuthContext.Provider>
  );
}
