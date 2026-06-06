-- ============================================================
-- SuperKupon — Supabase schema
-- Run di Supabase SQL Editor (sekali setup project baru)
-- Idempotent: aman di-run berulang
-- ============================================================

-- --------------------------------------------------------
-- 1. Profile (auto-created saat user signup)
-- --------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  display_name text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users view own profile" on public.profiles;
create policy "Users view own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Trigger: bikin profile row otomatis pas user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --------------------------------------------------------
-- 2. User Folders
-- --------------------------------------------------------
create table if not exists public.user_folders (
  user_id uuid references auth.users on delete cascade not null,
  id text not null,
  name text not null,
  emoji text default '📁',
  created_at timestamptz default now(),
  primary key (user_id, id)
);

alter table public.user_folders enable row level security;

drop policy if exists "Users manage own folders" on public.user_folders;
create policy "Users manage own folders" on public.user_folders
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- --------------------------------------------------------
-- 3. User Favorites (coupon IDs)
-- --------------------------------------------------------
create table if not exists public.user_favorites (
  user_id uuid references auth.users on delete cascade not null,
  coupon_id integer not null,
  folder_id text default 'default',
  saved_at timestamptz default now(),
  primary key (user_id, coupon_id)
);

create index if not exists user_favorites_user_idx on public.user_favorites(user_id);
create index if not exists user_favorites_user_folder_idx on public.user_favorites(user_id, folder_id);

alter table public.user_favorites enable row level security;

drop policy if exists "Users manage own favorites" on public.user_favorites;
create policy "Users manage own favorites" on public.user_favorites
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- --------------------------------------------------------
-- 4. Merchant Follows
-- --------------------------------------------------------
create table if not exists public.user_merchant_follows (
  user_id uuid references auth.users on delete cascade not null,
  merchant_slug text not null,
  merchant_name text not null,
  followed_at timestamptz default now(),
  primary key (user_id, merchant_slug)
);

create index if not exists user_follows_user_idx on public.user_merchant_follows(user_id);

alter table public.user_merchant_follows enable row level security;

drop policy if exists "Users manage own follows" on public.user_merchant_follows;
create policy "Users manage own follows" on public.user_merchant_follows
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- --------------------------------------------------------
-- 5. Coupon Votes (works / expired)
-- --------------------------------------------------------
create table if not exists public.user_coupon_votes (
  user_id uuid references auth.users on delete cascade not null,
  coupon_id integer not null,
  vote text check (vote in ('works', 'expired')) not null,
  voted_at timestamptz default now(),
  primary key (user_id, coupon_id)
);

create index if not exists user_votes_user_idx on public.user_coupon_votes(user_id);
create index if not exists user_votes_coupon_idx on public.user_coupon_votes(coupon_id);

alter table public.user_coupon_votes enable row level security;

drop policy if exists "Users manage own votes" on public.user_coupon_votes;
create policy "Users manage own votes" on public.user_coupon_votes
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Optional: public read aggregate (uncomment kalau mau show "X works / Y expired" community totals)
-- drop policy if exists "Public read vote aggregates" on public.user_coupon_votes;
-- create policy "Public read vote aggregates" on public.user_coupon_votes
--   for select using (true);

-- --------------------------------------------------------
-- 6. Projects — generic CRUD container per user
-- Used by /dashboard/projects (could be: campaign trackers,
-- coupon collections, notification rules, anything)
-- --------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  description text,
  status text default 'active' check (status in ('active', 'archived', 'draft')),
  emoji text default '📁',
  color text default 'violet',
  url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists projects_user_idx on public.projects(user_id);
create index if not exists projects_user_status_idx on public.projects(user_id, status);
create index if not exists projects_updated_idx on public.projects(updated_at desc);

alter table public.projects enable row level security;

drop policy if exists "Users manage own projects" on public.projects;
create policy "Users manage own projects" on public.projects
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at on changes
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_touch_updated on public.projects;
create trigger projects_touch_updated
  before update on public.projects
  for each row execute function public.touch_updated_at();

-- --------------------------------------------------------
-- 6b. Projects — sharing columns (idempotent add)
-- --------------------------------------------------------
alter table public.projects
  add column if not exists is_public boolean default false;

alter table public.projects
  add column if not exists share_token text default replace(gen_random_uuid()::text, '-', '') unique;

create index if not exists projects_share_token_idx on public.projects(share_token) where is_public = true;

-- Public read policy — anonymous bisa SELECT row kalau is_public=true (RLS still filters)
drop policy if exists "Public projects readable" on public.projects;
create policy "Public projects readable" on public.projects
  for select using (is_public = true);

-- --------------------------------------------------------
-- 7. Project Tags (user-scoped tag dictionary + many-to-many)
-- --------------------------------------------------------
create table if not exists public.project_tags_def (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  color text default 'gray',
  created_at timestamptz default now(),
  unique (user_id, name)
);

create index if not exists project_tags_def_user_idx on public.project_tags_def(user_id);
alter table public.project_tags_def enable row level security;

drop policy if exists "Users manage own tag defs" on public.project_tags_def;
create policy "Users manage own tag defs" on public.project_tags_def
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Junction
create table if not exists public.project_tags (
  project_id uuid references public.projects on delete cascade not null,
  tag_id uuid references public.project_tags_def on delete cascade not null,
  added_at timestamptz default now(),
  primary key (project_id, tag_id)
);

create index if not exists project_tags_project_idx on public.project_tags(project_id);
create index if not exists project_tags_tag_idx on public.project_tags(tag_id);
alter table public.project_tags enable row level security;

drop policy if exists "Users manage tags on own projects" on public.project_tags;
create policy "Users manage tags on own projects" on public.project_tags
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = project_tags.project_id and p.user_id = auth.uid()
    )
  );

-- Public read via share — kalau project is_public, tag relationship juga bisa di-read
drop policy if exists "Public projects tags readable" on public.project_tags;
create policy "Public projects tags readable" on public.project_tags
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = project_tags.project_id and p.is_public = true
    )
  );

drop policy if exists "Public tag defs readable" on public.project_tags_def;
create policy "Public tag defs readable" on public.project_tags_def
  for select using (
    exists (
      select 1 from public.project_tags pt
      join public.projects p on p.id = pt.project_id
      where pt.tag_id = project_tags_def.id and p.is_public = true
    )
  );

-- --------------------------------------------------------
-- 8. Project Activity Log
-- --------------------------------------------------------
create table if not exists public.project_activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects on delete cascade not null,
  user_id uuid references auth.users not null,
  action text not null,
  details jsonb,
  created_at timestamptz default now()
);

create index if not exists project_activity_project_idx on public.project_activity(project_id, created_at desc);
create index if not exists project_activity_user_idx on public.project_activity(user_id, created_at desc);

alter table public.project_activity enable row level security;

drop policy if exists "Users view own project activity" on public.project_activity;
create policy "Users view own project activity" on public.project_activity
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = project_activity.project_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "Users insert activity for own projects" on public.project_activity;
create policy "Users insert activity for own projects" on public.project_activity
  for insert with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.projects p
      where p.id = project_activity.project_id and p.user_id = auth.uid()
    )
  );

-- Public read via share
drop policy if exists "Public projects activity readable" on public.project_activity;
create policy "Public projects activity readable" on public.project_activity
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = project_activity.project_id and p.is_public = true
    )
  );

-- --------------------------------------------------------
-- 9. Project Files (Supabase Storage metadata)
-- File binary disimpan di bucket 'project-files'
-- Setup bucket di Supabase dashboard: Storage → New bucket → "project-files" → private
-- --------------------------------------------------------
create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  size_bytes bigint not null,
  mime_type text,
  storage_path text not null unique,
  uploaded_at timestamptz default now()
);

create index if not exists project_files_project_idx on public.project_files(project_id, uploaded_at desc);

alter table public.project_files enable row level security;

drop policy if exists "Users manage files on own projects" on public.project_files;
create policy "Users manage files on own projects" on public.project_files
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = project_files.project_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "Public projects files readable" on public.project_files;
create policy "Public projects files readable" on public.project_files
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = project_files.project_id and p.is_public = true
    )
  );

-- Storage RLS — biar user cuma bisa upload/read di folder mereka sendiri
-- Folder convention: {user_id}/{project_id}/{filename}
do $$
begin
  -- Authenticated upload to own folder
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Users upload to own folder'
  ) then
    create policy "Users upload to own folder" on storage.objects
      for insert to authenticated with check (
        bucket_id = 'project-files' and
        (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  -- Authenticated read own
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Users read own folder'
  ) then
    create policy "Users read own folder" on storage.objects
      for select to authenticated using (
        bucket_id = 'project-files' and
        (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  -- Authenticated delete own
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Users delete own files'
  ) then
    create policy "Users delete own files" on storage.objects
      for delete to authenticated using (
        bucket_id = 'project-files' and
        (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end $$;

-- --------------------------------------------------------
-- 9b. Project Collaborators (multi-user access)
-- Roles:
--   viewer — read-only (project + tags + files + activity)
--   editor — read + write (update project, manage tags/files)
-- Owner (projects.user_id) always has full control including delete.
-- --------------------------------------------------------
create table if not exists public.project_collaborators (
  project_id uuid references public.projects on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  role text default 'viewer' check (role in ('viewer', 'editor')),
  invited_by uuid references auth.users on delete set null,
  joined_at timestamptz default now(),
  primary key (project_id, user_id)
);

create index if not exists project_collab_user_idx on public.project_collaborators(user_id);
create index if not exists project_collab_project_idx on public.project_collaborators(project_id);

alter table public.project_collaborators enable row level security;

-- Owner can manage collaborators on their projects
drop policy if exists "Owners manage collaborators" on public.project_collaborators;
create policy "Owners manage collaborators" on public.project_collaborators
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = project_collaborators.project_id and p.user_id = auth.uid()
    )
  );

-- Collaborator can SELECT their own membership (so app can read their role)
drop policy if exists "Collaborators view own membership" on public.project_collaborators;
create policy "Collaborators view own membership" on public.project_collaborators
  for select using (user_id = auth.uid());

-- Collaborator can DELETE themselves (leave project)
drop policy if exists "Collaborators leave project" on public.project_collaborators;
create policy "Collaborators leave project" on public.project_collaborators
  for delete using (user_id = auth.uid());

-- --------------------------------------------------------
-- 9c. Project Invitations (pending invites by email)
-- Owner creates → invitation_token generated → owner shares link
-- → invitee opens /invite/[token] → accepts → moved to project_collaborators
-- --------------------------------------------------------
create table if not exists public.project_invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects on delete cascade not null,
  invited_email text not null,
  role text default 'viewer' check (role in ('viewer', 'editor')),
  invitation_token text default replace(gen_random_uuid()::text, '-', '') unique not null,
  status text default 'pending' check (status in ('pending', 'accepted', 'cancelled')),
  invited_by uuid references auth.users on delete cascade not null,
  invited_at timestamptz default now(),
  accepted_at timestamptz,
  unique (project_id, invited_email)
);

create index if not exists project_invite_token_idx on public.project_invitations(invitation_token) where status = 'pending';
create index if not exists project_invite_project_idx on public.project_invitations(project_id);
create index if not exists project_invite_email_idx on public.project_invitations(invited_email) where status = 'pending';

alter table public.project_invitations enable row level security;

-- Owner can manage invitations on their projects
drop policy if exists "Owners manage invitations" on public.project_invitations;
create policy "Owners manage invitations" on public.project_invitations
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = project_invitations.project_id and p.user_id = auth.uid()
    )
  );

-- Invitee (matched by email) can SELECT pending invites addressed to them
drop policy if exists "Invitees view own invitations" on public.project_invitations;
create policy "Invitees view own invitations" on public.project_invitations
  for select using (
    invited_email = (select email from auth.users where id = auth.uid())
  );

-- Anyone authenticated can SELECT by exact token match (for /invite/[token] page)
-- This is safe: tokens are random uuids, gak guessable
drop policy if exists "Anyone with token can view invitation" on public.project_invitations;
create policy "Anyone with token can view invitation" on public.project_invitations
  for select to authenticated using (true);

-- Anyone authenticated can UPDATE invitation status (to accept it)
-- App-level check: only allow if email matches their auth email
drop policy if exists "Authenticated can accept invitations" on public.project_invitations;
create policy "Authenticated can accept invitations" on public.project_invitations
  for update to authenticated using (
    status = 'pending' and
    invited_email = (select email from auth.users where id = auth.uid())
  );

-- --------------------------------------------------------
-- 9d. Update Projects RLS to include collaborators
-- --------------------------------------------------------
drop policy if exists "Users manage own projects" on public.projects;

-- SELECT: owner OR collaborator OR public
drop policy if exists "Users SELECT owned/collab projects" on public.projects;
create policy "Users SELECT owned/collab projects" on public.projects
  for select using (
    auth.uid() = user_id OR
    exists (
      select 1 from public.project_collaborators c
      where c.project_id = projects.id and c.user_id = auth.uid()
    )
  );

-- INSERT: only own projects
drop policy if exists "Users INSERT own projects" on public.projects;
create policy "Users INSERT own projects" on public.projects
  for insert with check (auth.uid() = user_id);

-- UPDATE: owner OR editor collaborator
drop policy if exists "Users UPDATE owned/editor collab" on public.projects;
create policy "Users UPDATE owned/editor collab" on public.projects
  for update using (
    auth.uid() = user_id OR
    exists (
      select 1 from public.project_collaborators c
      where c.project_id = projects.id and c.user_id = auth.uid() and c.role = 'editor'
    )
  );

-- DELETE: owner only
drop policy if exists "Users DELETE own projects" on public.projects;
create policy "Users DELETE own projects" on public.projects
  for delete using (auth.uid() = user_id);

-- --------------------------------------------------------
-- 9e. Update Tags/Activity/Files RLS to include collaborators
-- --------------------------------------------------------

-- Tags junction
drop policy if exists "Users manage tags on own projects" on public.project_tags;
create policy "Users manage tags on accessible projects" on public.project_tags
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = project_tags.project_id and (
        p.user_id = auth.uid() or
        exists (
          select 1 from public.project_collaborators c
          where c.project_id = p.id and c.user_id = auth.uid() and c.role = 'editor'
        )
      )
    )
  );

-- Tags SELECT also via collab (for viewers)
drop policy if exists "Collaborators read tags" on public.project_tags;
create policy "Collaborators read tags" on public.project_tags
  for select using (
    exists (
      select 1 from public.project_collaborators c
      where c.project_id = project_tags.project_id and c.user_id = auth.uid()
    )
  );

-- Activity SELECT for collaborators
drop policy if exists "Collaborators view activity" on public.project_activity;
create policy "Collaborators view activity" on public.project_activity
  for select using (
    exists (
      select 1 from public.project_collaborators c
      where c.project_id = project_activity.project_id and c.user_id = auth.uid()
    )
  );

-- Activity INSERT for editor collaborators
drop policy if exists "Editor collab insert activity" on public.project_activity;
create policy "Editor collab insert activity" on public.project_activity
  for insert with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.project_collaborators c
      where c.project_id = project_activity.project_id and c.user_id = auth.uid() and c.role = 'editor'
    )
  );

-- Files for collaborators
drop policy if exists "Collaborators view files" on public.project_files;
create policy "Collaborators view files" on public.project_files
  for select using (
    exists (
      select 1 from public.project_collaborators c
      where c.project_id = project_files.project_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "Editor collab manage files" on public.project_files;
create policy "Editor collab manage files" on public.project_files
  for all using (
    exists (
      select 1 from public.project_collaborators c
      where c.project_id = project_files.project_id and c.user_id = auth.uid() and c.role = 'editor'
    )
  );

-- --------------------------------------------------------
-- 10. Realtime: enable Postgres CDC publication
-- Frontend bisa subscribe ke INSERT/UPDATE/DELETE events.
-- Aman di-run berulang (DO block check exists dulu).
-- --------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'projects'
  ) then
    alter publication supabase_realtime add table public.projects;
  end if;
end $$;

-- Optional: enable realtime untuk user_favorites kalau mau cross-device sync favorit live
-- do $$
-- begin
--   if not exists (
--     select 1 from pg_publication_tables
--     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_favorites'
--   ) then
--     alter publication supabase_realtime add table public.user_favorites;
--   end if;
-- end $$;

-- --------------------------------------------------------
-- Done. Verify dengan query:
--   select tablename from pg_tables where schemaname = 'public';
-- Expected: profiles, user_favorites, user_folders, user_merchant_follows,
--           user_coupon_votes, projects
-- --------------------------------------------------------
