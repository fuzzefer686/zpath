create table if not exists public.advisor_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references public.zpath_users(id) on delete set null,
  anonymous_id text null,
  title text null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint advisor_conversations_owner_present
    check (user_id is not null or anonymous_id is not null)
);

create table if not exists public.advisor_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.advisor_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null,
  intent text null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.advisor_feedback (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.advisor_messages(id) on delete cascade,
  rating text not null check (rating in ('up', 'down')),
  comment text null,
  created_at timestamptz default now()
);

create index if not exists advisor_conversations_user_id_idx
  on public.advisor_conversations (user_id, updated_at desc);

create index if not exists advisor_conversations_anonymous_id_idx
  on public.advisor_conversations (anonymous_id, updated_at desc);

create index if not exists advisor_messages_conversation_id_idx
  on public.advisor_messages (conversation_id, created_at);

create index if not exists advisor_feedback_message_id_idx
  on public.advisor_feedback (message_id);

drop trigger if exists set_advisor_conversations_updated_at on public.advisor_conversations;
create trigger set_advisor_conversations_updated_at
  before update on public.advisor_conversations
  for each row
  execute function public.set_updated_at();

alter table public.advisor_conversations enable row level security;
alter table public.advisor_messages enable row level security;
alter table public.advisor_feedback enable row level security;

drop policy if exists "Advisor conversations are service-role only" on public.advisor_conversations;
create policy "Advisor conversations are service-role only"
  on public.advisor_conversations
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Advisor messages are service-role only" on public.advisor_messages;
create policy "Advisor messages are service-role only"
  on public.advisor_messages
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Advisor feedback is service-role only" on public.advisor_feedback;
create policy "Advisor feedback is service-role only"
  on public.advisor_feedback
  for all
  to service_role
  using (true)
  with check (true);

revoke all on table public.advisor_conversations from anon;
revoke all on table public.advisor_conversations from authenticated;
revoke all on table public.advisor_messages from anon;
revoke all on table public.advisor_messages from authenticated;
revoke all on table public.advisor_feedback from anon;
revoke all on table public.advisor_feedback from authenticated;

grant select, insert, update, delete on public.advisor_conversations to service_role;
grant select, insert, update, delete on public.advisor_messages to service_role;
grant select, insert, update, delete on public.advisor_feedback to service_role;
