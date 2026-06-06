import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabase } from "@/lib/supabase";

/**
 * Cloud sync utility. Push pulls from localStorage and writes to Supabase tables.
 * Pull fetches Supabase data and writes back to localStorage.
 *
 * Merge strategy: dedup by primary key (coupon_id / merchant_slug).
 * No timestamp-based conflict resolution — last writer wins per row.
 */

interface PushResult {
  favorites: number;
  folders: number;
  follows: number;
  votes: number;
}

interface PullResult extends PushResult {}

const FAVORITES_KEY = "dk_favorites_v2";
const FOLDERS_KEY = "dk_fav_folders_v1";
const FOLLOWS_KEY = "sk_merchant_follows_v1";
const VOTES_KEY = "sk_coupon_votes_v1";

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLS<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export async function pushToCloud(userId: string): Promise<PushResult> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase belum dikonfigurasi");

  const favorites = readLS<Array<{ id: number; savedAt: number; folder: string }>>(
    FAVORITES_KEY,
    [],
  );
  const folders = readLS<Array<{ id: string; name: string; emoji: string; createdAt: number }>>(
    FOLDERS_KEY,
    [],
  );
  const follows = readLS<Array<{ slug: string; name: string; followedAt: number }>>(
    FOLLOWS_KEY,
    [],
  );
  const votes = readLS<Record<string, { vote: "works" | "expired"; votedAt: number }>>(
    VOTES_KEY,
    {},
  );

  // 1. Upsert folders
  if (folders.length > 0) {
    const folderRows = folders.map((f) => ({
      user_id: userId,
      id: f.id,
      name: f.name,
      emoji: f.emoji ?? "📁",
      created_at: f.createdAt ? new Date(f.createdAt).toISOString() : new Date().toISOString(),
    }));
    const { error } = await sb.from("user_folders").upsert(folderRows, {
      onConflict: "user_id,id",
    });
    if (error) throw new Error(`Folders sync gagal: ${error.message}`);
  }

  // 2. Upsert favorites
  if (favorites.length > 0) {
    const favRows = favorites
      .filter((r) => Number.isFinite(r.id))
      .map((r) => ({
        user_id: userId,
        coupon_id: r.id,
        folder_id: r.folder || "default",
        saved_at: r.savedAt ? new Date(r.savedAt).toISOString() : new Date().toISOString(),
      }));
    const { error } = await sb.from("user_favorites").upsert(favRows, {
      onConflict: "user_id,coupon_id",
    });
    if (error) throw new Error(`Favorites sync gagal: ${error.message}`);
  }

  // 3. Upsert merchant follows
  if (follows.length > 0) {
    const followRows = follows.map((f) => ({
      user_id: userId,
      merchant_slug: f.slug,
      merchant_name: f.name,
      followed_at: f.followedAt ? new Date(f.followedAt).toISOString() : new Date().toISOString(),
    }));
    const { error } = await sb.from("user_merchant_follows").upsert(followRows, {
      onConflict: "user_id,merchant_slug",
    });
    if (error) throw new Error(`Follows sync gagal: ${error.message}`);
  }

  // 4. Upsert votes
  const voteEntries = Object.entries(votes);
  if (voteEntries.length > 0) {
    const voteRows = voteEntries.map(([id, v]) => ({
      user_id: userId,
      coupon_id: Number(id),
      vote: v.vote,
      voted_at: v.votedAt ? new Date(v.votedAt).toISOString() : new Date().toISOString(),
    }));
    const { error } = await sb.from("user_coupon_votes").upsert(voteRows, {
      onConflict: "user_id,coupon_id",
    });
    if (error) throw new Error(`Votes sync gagal: ${error.message}`);
  }

  return {
    favorites: favorites.length,
    folders: folders.length,
    follows: follows.length,
    votes: voteEntries.length,
  };
}

export async function pullFromCloud(userId: string): Promise<PullResult> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase belum dikonfigurasi");

  // 1. Pull folders
  const { data: folderData, error: folderErr } = await sb
    .from("user_folders")
    .select("*")
    .eq("user_id", userId);
  if (folderErr) throw new Error(`Folders fetch gagal: ${folderErr.message}`);

  const folderLocal = (folderData ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    emoji: r.emoji,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
  }));
  writeLS(FOLDERS_KEY, folderLocal);

  // 2. Pull favorites
  const { data: favData, error: favErr } = await sb
    .from("user_favorites")
    .select("*")
    .eq("user_id", userId)
    .order("saved_at", { ascending: false });
  if (favErr) throw new Error(`Favorites fetch gagal: ${favErr.message}`);

  const favLocal = (favData ?? []).map((r) => ({
    id: r.coupon_id,
    savedAt: r.saved_at ? new Date(r.saved_at).getTime() : Date.now(),
    folder: r.folder_id,
  }));
  writeLS(FAVORITES_KEY, favLocal);

  // 3. Pull follows
  const { data: followData, error: followErr } = await sb
    .from("user_merchant_follows")
    .select("*")
    .eq("user_id", userId)
    .order("followed_at", { ascending: false });
  if (followErr) throw new Error(`Follows fetch gagal: ${followErr.message}`);

  const followLocal = (followData ?? []).map((r) => ({
    slug: r.merchant_slug,
    name: r.merchant_name,
    followedAt: r.followed_at ? new Date(r.followed_at).getTime() : Date.now(),
  }));
  writeLS(FOLLOWS_KEY, followLocal);

  // 4. Pull votes
  const { data: voteData, error: voteErr } = await sb
    .from("user_coupon_votes")
    .select("*")
    .eq("user_id", userId);
  if (voteErr) throw new Error(`Votes fetch gagal: ${voteErr.message}`);

  const voteMap: Record<string, { vote: "works" | "expired"; votedAt: number }> = {};
  for (const r of voteData ?? []) {
    voteMap[String(r.coupon_id)] = {
      vote: r.vote,
      votedAt: r.voted_at ? new Date(r.voted_at).getTime() : Date.now(),
    };
  }
  writeLS(VOTES_KEY, voteMap);

  return {
    favorites: favLocal.length,
    folders: folderLocal.length,
    follows: followLocal.length,
    votes: Object.keys(voteMap).length,
  };
}
