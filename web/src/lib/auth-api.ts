/**
 * Member Auth API client — public site user authentication.
 *
 * Beda dari `admin-api.ts` (yang untuk staff/admin dashboard /admin via
 * env-based ADMIN_USERS_JSON). Module ini untuk MEMBER public yang
 * register sendiri di superkupon.vercel.app.
 *
 * Storage: session token + user info di localStorage.
 * Token disertakan di Authorization header (Bearer) untuk subsequent requests.
 *
 * Security note: localStorage rentan XSS. Untuk production scale,
 * pertimbangkan httpOnly cookie + CSRF token. MVP: localStorage OK.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://superkupon-backend-production.up.railway.app";

const TOKEN_STORAGE_KEY = "sk_member_token";
const USER_STORAGE_KEY = "sk_member_user";

// ============================================================
// Types
// ============================================================

export interface MemberUser {
  id: number;
  email: string;
  username: string;
  role: string;
  status: string;
  created_at: string;
  last_login_at: string | null;
}

export interface LoginResponse {
  session_token: string;
  expires_at: string;
  user: MemberUser;
}

export interface RegisterResponse {
  user: MemberUser;
  message: string;
}

export interface LogoutResponse {
  ok: boolean;
  message: string;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

// ============================================================
// Token & user storage
// ============================================================

export function getMemberToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setMemberToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // ignore
  }
}

export function clearMemberToken(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function getMemberUser(): MemberUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MemberUser;
  } catch {
    return null;
  }
}

export function setMemberUser(user: MemberUser): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

export function isMemberLoggedIn(): boolean {
  return getMemberToken() !== null && getMemberUser() !== null;
}

// ============================================================
// HTTP wrapper
// ============================================================

async function authFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string>),
  };

  const token = getMemberToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail || body.message || detail;
    } catch {
      // body not JSON
    }
    throw new AuthError(detail, res.status);
  }

  return res.json();
}

// ============================================================
// API methods
// ============================================================

export async function registerMember(
  email: string,
  username: string,
  password: string,
): Promise<RegisterResponse> {
  return authFetch<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, username, password }),
  });
}

export async function loginMember(
  identifier: string,
  password: string,
): Promise<LoginResponse> {
  const result = await authFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
  setMemberToken(result.session_token);
  setMemberUser(result.user);
  return result;
}

export async function logoutMember(): Promise<LogoutResponse> {
  try {
    const result = await authFetch<LogoutResponse>("/auth/logout", {
      method: "POST",
    });
    return result;
  } finally {
    // Always clear local state, even kalau API call gagal
    clearMemberToken();
  }
}

export async function fetchMe(): Promise<MemberUser> {
  return authFetch<MemberUser>("/auth/me");
}

/**
 * Background: verify stored token masih valid (di mount layout).
 * Kalau invalid (401), auto-clear localStorage.
 */
export async function refreshMemberSession(): Promise<MemberUser | null> {
  if (!getMemberToken()) return null;
  try {
    const user = await fetchMe();
    setMemberUser(user);
    return user;
  } catch (e) {
    if (e instanceof AuthError && (e.status === 401 || e.status === 403)) {
      clearMemberToken();
    }
    return null;
  }
}

// ============================================================
// Forgot / Reset Password (Admin Mediated)
// ============================================================

export interface ForgotPasswordResponse {
  ok: boolean;
  message: string;
}

export interface ResetPasswordResponse {
  ok: boolean;
  message: string;
}

/** Request password reset — admin akan terima notif untuk share token via WA. */
export async function requestPasswordReset(
  email: string,
): Promise<ForgotPasswordResponse> {
  return authFetch<ForgotPasswordResponse>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/** Reset password pakai token dari admin + password baru. */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<ResetPasswordResponse> {
  return authFetch<ResetPasswordResponse>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, new_password: newPassword }),
  });
}

// ============================================================
// Profile & Stats (Member Dashboard)
// ============================================================

export interface MemberClaim {
  id: number;
  coupon_id: number;
  action: "copy" | "visit";
  claimed_at: string;
  coupon_code: string | null;
  coupon_title: string;
  merchant_slug: string;
  merchant_name: string;
  category_slug: string | null;
  discount_type: string;
  discount_value: number;
  estimated_saving_idr: number;
}

export interface CategoryCount {
  slug: string;
  count: number;
}

export interface MerchantCount {
  slug: string;
  name: string;
  count: number;
}

export interface MemberStats {
  total_claims: number;
  total_savings_idr: number;
  favorite_category: string | null;
  favorite_merchant: string | null;
  claims_this_week: number;
  claims_this_month: number;
  top_categories: CategoryCount[];
  top_merchants: MerchantCount[];
  member_since: string;
  days_active: number;
}

/** Record claim (call pas user copy code atau visit merchant). Silent fail. */
export async function recordClaim(
  couponId: number,
  action: "copy" | "visit" = "copy",
): Promise<void> {
  if (!getMemberToken()) return; // skip kalau guest (gating udah handle)
  try {
    await authFetch<MemberClaim>("/auth/me/claims", {
      method: "POST",
      body: JSON.stringify({ coupon_id: couponId, action }),
    });
  } catch {
    // Silent fail — tracking shouldn't block UX
  }
}

export async function fetchMyStats(): Promise<MemberStats> {
  return authFetch<MemberStats>("/auth/me/stats");
}

export async function fetchMyClaims(
  limit = 50,
  offset = 0,
): Promise<MemberClaim[]> {
  return authFetch<MemberClaim[]>(
    `/auth/me/claims?limit=${limit}&offset=${offset}`,
  );
}

export async function updateProfile(updates: {
  username?: string;
  email?: string;
}): Promise<MemberUser> {
  const result = await authFetch<MemberUser>("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  setMemberUser(result);
  return result;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: boolean; message: string }> {
  return authFetch("/auth/me/change-password", {
    method: "POST",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}
