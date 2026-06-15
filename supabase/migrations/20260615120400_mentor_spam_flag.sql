-- Mentor consultation: spam moderation (Phase 10.5).
-- A mentor can flag a conversation as spam; flagged threads are hidden from the
-- student's inbox and the shared pool. History is retained for moderation.

alter table public.conversations
  add column if not exists flagged_spam boolean not null default false,
  add column if not exists flagged_at timestamptz,
  add column if not exists flagged_by uuid references public.mentor_profiles(user_id) on delete set null;

-- Keep inbox listing queries (which filter flagged_spam = false) index-friendly.
create index if not exists idx_conversations_not_spam
  on public.conversations(last_message_at desc)
  where flagged_spam = false;
