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

// Public stats — gak butuh API key
export async function fetchPublicStats(): Promise<PublicStats> {
  const res = await fetch(`${API_BASE}/stats/public`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}
