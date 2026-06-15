-- Mentor RPC hardening (Phase 2 follow-up).
--
-- Supabase sets default privileges that grant EXECUTE on public functions to
-- the `anon` and `authenticated` roles. A plain `revoke ... from public` does
-- NOT remove those explicit grants, so the SECURITY DEFINER mentor RPCs were
-- still callable directly via PostgREST by the anon key — which would let a
-- client impersonate any user by passing an arbitrary p_user_id / p_mentor_id.
--
-- These RPCs must be server-only (service_role). Explicitly revoke EXECUTE from
-- anon and authenticated on every mentor function, including internal helpers.

revoke execute on function public._mentor_get_or_create_anonymous_conversation(uuid) from anon, authenticated;
revoke execute on function public._mentor_get_or_create_named_conversation(uuid, uuid) from anon, authenticated;
revoke execute on function public.request_consultation(uuid, text, text) from anon, authenticated;
revoke execute on function public.send_user_message(uuid, uuid, public.message_content_type, text, text, jsonb) from anon, authenticated;
revoke execute on function public.send_mentor_message(uuid, uuid, text, public.message_content_type, text, text, jsonb) from anon, authenticated;
revoke execute on function public.claim_conversation(uuid, uuid) from anon, authenticated;
revoke execute on function public.mark_read(uuid, text, uuid) from anon, authenticated;
