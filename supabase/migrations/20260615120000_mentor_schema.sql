-- Mentor consultation feature: core schema (Phase 1).
--
-- Identity/auth note: ZPath uses a custom auth model (public.zpath_users +
-- HMAC-signed `zpath_auth` cookie), NOT Supabase Auth. There is no client
-- Supabase session, so `auth.uid()` is always NULL here. Accordingly:
--   * Foreign keys point at public.zpath_users, not auth.users.
--   * RLS is locked to service_role only; per-user/per-mentor authorization is
--     enforced in SECURITY DEFINER RPCs + server API routes (Phase 2/3), which
--     receive the already-authenticated user id from the verified cookie.

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'conversation_kind') then
    create type public.conversation_kind as enum ('anonymous', 'named');
  end if;

  if not exists (select 1 from pg_type where typname = 'conversation_status') then
    create type public.conversation_status as enum ('pending', 'active', 'closed');
  end if;

  if not exists (select 1 from pg_type where typname = 'message_sender_role') then
    create type public.message_sender_role as enum ('user', 'mentor', 'system');
  end if;

  if not exists (select 1 from pg_type where typname = 'message_content_type') then
    create type public.message_content_type as enum ('text', 'image', 'file');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- mentor_profiles: 1-1 with zpath_users, marks a user as a mentor.
-- `role` here is mentor-scoped and independent from zpath_users.role.
-- ---------------------------------------------------------------------------
create table if not exists public.mentor_profiles (
  user_id uuid primary key references public.zpath_users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  show_identity_default boolean not null default false,
  is_active boolean not null default true,
  role text not null default 'mentor' check (role in ('mentor', 'lead_mentor', 'admin')),
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mentor_profiles_active
  on public.mentor_profiles(is_active) where is_active = true;

-- ---------------------------------------------------------------------------
-- conversations: one thread between a user and a mentor pool (anonymous)
-- or a specific mentor (named).
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.zpath_users(id) on delete cascade,
  kind public.conversation_kind not null,
  mentor_id uuid references public.mentor_profiles(user_id) on delete set null,
  status public.conversation_status not null default 'pending',
  subject text,
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  unread_count_user int not null default 0,
  unread_count_mentor int not null default 0,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  -- Anonymous threads have no mentor (shared pool); named threads require one.
  constraint chk_named_requires_mentor check (
    (kind = 'named' and mentor_id is not null) or
    (kind = 'anonymous' and mentor_id is null)
  )
);

-- Each user has at most one anonymous (pooled) thread.
create unique index if not exists uniq_anonymous_per_user
  on public.conversations(user_id)
  where kind = 'anonymous';

-- Each (user, mentor) pair has at most one named thread.
create unique index if not exists uniq_named_per_pair
  on public.conversations(user_id, mentor_id)
  where kind = 'named';

create index if not exists idx_conversations_user
  on public.conversations(user_id, last_message_at desc);
create index if not exists idx_conversations_mentor
  on public.conversations(mentor_id, last_message_at desc) where mentor_id is not null;
create index if not exists idx_conversations_pending_anon
  on public.conversations(last_message_at desc)
  where kind = 'anonymous' and status in ('pending', 'active');

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_role public.message_sender_role not null,
  sender_user_id uuid references public.zpath_users(id) on delete set null,
  -- Identity snapshot at send time, so history stays consistent even if the
  -- mentor later renames or the thread changes identity mode.
  sender_display_name text,
  sender_avatar_url text,
  content_type public.message_content_type not null default 'text',
  body text,
  attachment_path text,
  attachment_meta jsonb,
  created_at timestamptz not null default now(),
  read_by_user_at timestamptz,
  read_by_mentor_at timestamptz,
  is_deleted boolean not null default false
);

create index if not exists idx_messages_conv_time
  on public.messages(conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- mentor_sessions: lightweight presence/identity-mode tracking.
-- ---------------------------------------------------------------------------
create table if not exists public.mentor_sessions (
  mentor_id uuid primary key references public.mentor_profiles(user_id) on delete cascade,
  is_online boolean not null default false,
  last_seen_at timestamptz not null default now(),
  current_identity_mode text not null default 'anonymous'
    check (current_identity_mode in ('anonymous', 'named'))
);

-- ---------------------------------------------------------------------------
-- updated_at trigger (reuse existing public.set_updated_at()).
-- ---------------------------------------------------------------------------
drop trigger if exists set_mentor_profiles_updated_at on public.mentor_profiles;
create trigger set_mentor_profiles_updated_at
  before update on public.mentor_profiles
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: service-role only. App-layer (RPC/API) enforces user/mentor scoping.
-- ---------------------------------------------------------------------------
alter table public.mentor_profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.mentor_sessions enable row level security;

drop policy if exists "Mentor profiles are service-role only" on public.mentor_profiles;
create policy "Mentor profiles are service-role only"
  on public.mentor_profiles
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Conversations are service-role only" on public.conversations;
create policy "Conversations are service-role only"
  on public.conversations
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Messages are service-role only" on public.messages;
create policy "Messages are service-role only"
  on public.messages
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Mentor sessions are service-role only" on public.mentor_sessions;
create policy "Mentor sessions are service-role only"
  on public.mentor_sessions
  for all
  to service_role
  using (true)
  with check (true);

revoke all on table public.mentor_profiles from anon;
revoke all on table public.mentor_profiles from authenticated;
revoke all on table public.conversations from anon;
revoke all on table public.conversations from authenticated;
revoke all on table public.messages from anon;
revoke all on table public.messages from authenticated;
revoke all on table public.mentor_sessions from anon;
revoke all on table public.mentor_sessions from authenticated;

grant select, insert, update, delete on public.mentor_profiles to service_role;
grant select, insert, update, delete on public.conversations to service_role;
grant select, insert, update, delete on public.messages to service_role;
grant select, insert, update, delete on public.mentor_sessions to service_role;
