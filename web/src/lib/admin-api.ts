/**
 * Admin API client — handles X-API-Key auth for /admin/* endpoints.
 *
 * Storage: API key disimpan di localStorage (key: 'sk_admin_api_key').
 * Authentication gate (AdminGate) ngecek keberadaan + validitas key sebelum
 * render dashboard.
 *
 * Security note: localStorage gak super secure (vulnerable to XSS), tapi
 * admin dashboard ini buat internal use only. Untuk production scale,
 * pertimbangkan httpOnly cookie + backend session.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://superkupon-backend-production.up.railway.app";

const STORAGE_KEY = "sk_admin_api_key";

export interface ScrapeLog {
  id: number;
  target_id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  items_found: number;
  items_new: number;
  items_updated: number;
  error: string | null;
}

export interface ScraperInfo {
  target_id: string;
  name: string;
  merchant_slug: string;
  interval_minutes: number;
  tier: string;
  enabled: boolean;
}

export interface PublicStats {
  total_active: number;
  merchant_count: number;
  category_count: number;
  new_24h: number;
  new_7d: number;
  total_views: number;
  total_redeems: number;
  total_potential_savings: number;
  excellent_quality_count: number;
  top_merchants: Array<{ slug: string; name: string; count: number }>;
  last_updated: string;
}

// ============================================================
// API Key management
// ============================================================

export function getAdminKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAdminKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // localStorage blocked — ignore
  }
}

export function clearAdminKey(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// ============================================================
// Fetch wrapper
// ============================================================

async function adminFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const key = getAdminKey();
  if (!key) {
    throw new Error("Admin API key not set. Login first.");
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    cache: "no-store",
    headers: {
      ...opts.headers,
      "X-API-Key": key,
      "Content-Type": "application/json",
    },
  });

  if (res.status === 401) {
    // Key salah — clear & throw
    clearAdminKey();
    throw new Error("Invalid API key. Please login again.");
  }

  if (res.status === 503) {
    throw new Error("Admin API disabled on server (ADMIN_API_KEY env not set).");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text || path}`);
  }

  return res.json();
}

// ============================================================
// API methods
// ============================================================

export async function verifyAdminKey(key: string): Promise<boolean> {
  // Test key dengan hit /admin/scrapers endpoint
  try {
    const res = await fetch(`${API_BASE}/admin/scrapers`, {
      headers: { "X-API-Key": key },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export type AdminRole = "admin" | "staff";

export interface LoginResponse {
  api_key: string;
  username: string;
  role: AdminRole;
}

const USERNAME_STORAGE_KEY = "sk_admin_username";
const ROLE_STORAGE_KEY = "sk_admin_role";

export function getAdminUsername(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(USERNAME_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAdminUsername(username: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USERNAME_STORAGE_KEY, username);
  } catch {
    // ignore
  }
}

export function clearAdminUsername(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(USERNAME_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function getAdminRole(): AdminRole {
  if (typeof window === "undefined") return "staff";
  try {
    const stored = localStorage.getItem(ROLE_STORAGE_KEY);
    if (stored === "admin" || stored === "staff") return stored;
    return "admin"; // backward compat: kalau pernah login via API key direct
  } catch {
    return "staff";
  }
}

export function setAdminRole(role: AdminRole): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ROLE_STORAGE_KEY, role);
  } catch {
    // ignore
  }
}

export function clearAdminRole(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ROLE_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function isAdminFullAccess(): boolean {
  return getAdminRole() === "admin";
}

/**
 * Login dengan username + password — return api_key kalau sukses.
 * Throws Error dengan readable message kalau gagal.
 */
export async function loginAdmin(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ username, password }),
  });

  if (res.status === 401) {
    throw new Error("Username atau password salah.");
  }
  if (res.status === 503) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "Admin login disabled di server.");
  }
  if (!res.ok) {
    throw new Error(`Login gagal: HTTP ${res.status}`);
  }

  return res.json();
}

export async function fetchScrapeLogs(limit = 50): Promise<ScrapeLog[]> {
  return adminFetch<ScrapeLog[]>(`/admin/scrape-logs?limit=${limit}`);
}

export async function fetchScrapers(): Promise<ScraperInfo[]> {
  return adminFetch<ScraperInfo[]>("/admin/scrapers");
}

export async function triggerScrapeAll(): Promise<{ results: ScrapeLog[] }> {
  return adminFetch<{ results: ScrapeLog[] }>("/admin/scrape-all", {
    method: "POST",
  });
}

export async function triggerScraper(targetId: string): Promise<ScrapeLog> {
  return adminFetch<ScrapeLog>(`/admin/scrape/${targetId}`, {
    method: "POST",
  });
}

// ============================================================
// Password Reset Requests
// ============================================================

export interface PasswordResetRequest {
  id: number;
  user_id: number;
  username: string;
  email_at_request: string;
  token: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  requester_user_agent: string | null;
  minutes_remaining: number;
}

export async function fetchPasswordResets(
  includeUsed = false,
): Promise<PasswordResetRequest[]> {
  return adminFetch<PasswordResetRequest[]>(
    `/admin/password-resets?include_used=${includeUsed}`,
  );
}

export async function cancelPasswordReset(
  resetId: number,
): Promise<{ ok: boolean; deleted_id: number }> {
  return adminFetch(`/admin/password-resets/${resetId}`, {
    method: "DELETE",
  });
}

// Public stats — gak butuh API key
export async function fetchPublicStats(): Promise<PublicStats> {
  const res = await fetch(`${API_BASE}/stats/public`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

// ============================================================
// Member Management (admin)
// ============================================================

export interface AdminMember {
  id: number;
  email: string;
  username: string;
  role: string;
  status: string;
  created_at: string;
  last_login_at: string | null;
  claim_count: number;
}

/**
 * List semua member terdaftar (untuk admin dashboard).
 * Backend: GET /admin/users (require X-API-Key).
 */
export async function fetchMembers(): Promise<AdminMember[]> {
  return adminFetch<AdminMember[]>("/admin/users");
}

/**
 * Reset password member secara manual (admin-mediated).
 * Backend: POST /admin/users/{id}/reset-password.
 *
 * Flow: admin generate password baru → backend hash + simpan →
 * password baru dikirim balik ke admin → admin share via WA ke member.
 *
 * Error codes:
 * - 403: bukan admin role / unauthorized
 * - 404: user gak ditemukan
 * - 500: server error
 */
export async function adminResetMemberPassword(
  userId: number,
  newPassword: string,
): Promise<{ ok: boolean; message: string }> {
  return adminFetch<{ ok: boolean; message: string }>(
    `/admin/users/${userId}/reset-password`,
    {
      method: "POST",
      body: JSON.stringify({ new_password: newPassword }),
    },
  );
}
