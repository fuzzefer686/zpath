-- =============================================================================
-- ZPath — System flags: runtime kill-switches (AI, features, etc.)
--
-- Admin toggles via service role only; no public/anonymous access.
-- Service role bypasses RLS — server-side reads always work.
-- RLS enabled with no public policies → anon/authenticated get nothing.
--
-- How to flip the AI kill-switch:
--   ON:  update public.system_flags set enabled = true, updated_at = now() where key = 'ai_enabled';
--   OFF: update public.system_flags set enabled = false, updated_at = now() where key = 'ai_enabled';
-- Or set the env var AI_ENABLED=true|false on Vercel for an instant override
-- that takes effect without a DB write (see lib/ai/flags.ts).
-- =============================================================================

create table public.system_flags (
  key        text primary key,
  enabled    boolean not null default false,
  updated_at timestamptz not null default now()
);

-- RLS: enabled, no public policies → blocked for anon/authenticated.
-- Service role bypasses RLS → full access from the server.
alter table public.system_flags enable row level security;

-- Seed: AI kill-switch starts OFF. Enable when Vertex credentials are live
-- and DPA/CTIA obligations (lib/ai/vertex.ts § TODO) have been cleared.
insert into public.system_flags (key, enabled) values ('ai_enabled', false);
