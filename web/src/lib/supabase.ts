import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

/**
 * Returns the Supabase client singleton.
 * Returns null if env vars not configured — app should degrade gracefully.
 */
export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/* Database row types — match supabase_schema.sql */

export interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
}

export interface FavoriteRow {
  user_id: string;
  coupon_id: number;
  folder_id: string;
  saved_at: string;
}

export interface FolderRow {
  user_id: string;
  id: string;
  name: string;
  emoji: string;
  created_at: string;
}

export interface MerchantFollowRow {
  user_id: string;
  merchant_slug: string;
  merchant_name: string;
  followed_at: string;
}

export interface CouponVoteRow {
  user_id: string;
  coupon_id: number;
  vote: "works" | "expired";
  voted_at: string;
}

export type ProjectStatus = "active" | "archived" | "draft";

export interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  emoji: string;
  color: string;
  url: string | null;
  is_public: boolean;
  share_token: string;
  created_at: string;
  updated_at: string;
}

export type ProjectInsert = Omit<ProjectRow, "id" | "user_id" | "is_public" | "share_token" | "created_at" | "updated_at"> & {
  user_id: string;
};

export type ProjectUpdate = Partial<Omit<ProjectRow, "id" | "user_id" | "share_token" | "created_at" | "updated_at">>;

export interface TagDefRow {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface ProjectTagRow {
  project_id: string;
  tag_id: string;
  added_at: string;
}

export type ActivityAction =
  | "created"
  | "updated"
  | "deleted"
  | "shared"
  | "unshared"
  | "tag_added"
  | "tag_removed"
  | "file_uploaded"
  | "file_deleted";

export interface ProjectActivityRow {
  id: string;
  project_id: string;
  user_id: string;
  action: ActivityAction;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface ProjectFileRow {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  size_bytes: number;
  mime_type: string | null;
  storage_path: string;
  uploaded_at: string;
}

export const STORAGE_BUCKET = "project-files";

export type CollaboratorRole = "viewer" | "editor";

export interface CollaboratorRow {
  project_id: string;
  user_id: string;
  role: CollaboratorRole;
  invited_by: string | null;
  joined_at: string;
}

export type InvitationStatus = "pending" | "accepted" | "cancelled";

export interface InvitationRow {
  id: string;
  project_id: string;
  invited_email: string;
  role: CollaboratorRole;
  invitation_token: string;
  status: InvitationStatus;
  invited_by: string;
  invited_at: string;
  accepted_at: string | null;
}
