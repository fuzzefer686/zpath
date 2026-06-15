-- Mentor consultation feature: RPC functions (Phase 2).
--
-- All functions are SECURITY DEFINER with a pinned search_path. Because ZPath
-- has no client Supabase session (auth.uid() is NULL), the caller is the server
-- (service_role) and passes the already-authenticated id (p_user_id / p_mentor_id)
-- taken from the verified `zpath_auth` cookie. Each function re-checks ownership
-- / mentor access defensively so a server bug cannot leak across users.
--
-- EXECUTE is revoked from PUBLIC and granted only to service_role. The two
-- `_mentor_*` helpers are internal (no grant) and run inside the definer owner.

-- ---------------------------------------------------------------------------
-- Internal helpers: idempotent get-or-create for the two thread kinds.
-- The partial unique indexes (uniq_anonymous_per_user / uniq_named_per_pair)
-- guarantee one row; unique_violation under concurrency falls back to re-select.
-- ---------------------------------------------------------------------------
create or replace function public._mentor_get_or_create_anonymous_conversation(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.conversations
  where user_id = p_user_id and kind = 'anonymous'
  limit 1;
  if v_id is not null then
    return v_id;
  end if;

  begin
    insert into public.conversations (user_id, kind, status)
    values (p_user_id, 'anonymous', 'pending')
    returning id into v_id;
  exception when unique_violation then
    select id into v_id
    from public.conversations
    where user_id = p_user_id and kind = 'anonymous'
    limit 1;
  end;

  return v_id;
end;
$$;

create or replace function public._mentor_get_or_create_named_conversation(
  p_user_id uuid,
  p_mentor_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.conversations
  where user_id = p_user_id and mentor_id = p_mentor_id and kind = 'named'
  limit 1;
  if v_id is not null then
    return v_id;
  end if;

  begin
    insert into public.conversations (user_id, kind, mentor_id, status)
    values (p_user_id, 'named', p_mentor_id, 'active')
    returning id into v_id;
  exception when unique_violation then
    select id into v_id
    from public.conversations
    where user_id = p_user_id and mentor_id = p_mentor_id and kind = 'named'
    limit 1;
  end;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4.1 request_consultation: find-or-create the user's anonymous pool thread
-- and post the first user message. Idempotent across repeated requests.
-- ---------------------------------------------------------------------------
create or replace function public.request_consultation(
  p_user_id uuid,
  p_subject text,
  p_first_message text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_conversation_id uuid;
  v_username text;
begin
  if p_first_message is null or btrim(p_first_message) = '' then
    raise exception 'First message must not be empty';
  end if;

  select username into v_username from public.zpath_users where id = p_user_id;
  if not found then
    raise exception 'User % not found', p_user_id;
  end if;

  v_conversation_id := public._mentor_get_or_create_anonymous_conversation(p_user_id);

  insert into public.messages (
    conversation_id, sender_role, sender_user_id, sender_display_name, content_type, body
  )
  values (
    v_conversation_id, 'user', p_user_id, v_username, 'text', p_first_message
  );

  update public.conversations
  set subject = coalesce(nullif(btrim(coalesce(p_subject, '')), ''), subject),
      status = 'pending',
      last_message_at = now(),
      last_message_preview = left(p_first_message, 120),
      unread_count_mentor = unread_count_mentor + 1
  where id = v_conversation_id;

  return v_conversation_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4.2 send_user_message
-- ---------------------------------------------------------------------------
create or replace function public.send_user_message(
  p_user_id uuid,
  p_conversation_id uuid,
  p_content_type public.message_content_type,
  p_body text,
  p_attachment_path text default null,
  p_attachment_meta jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid;
  v_username text;
  v_message_id uuid;
  v_preview text;
begin
  select user_id into v_owner from public.conversations where id = p_conversation_id;
  if not found then
    raise exception 'Conversation % not found', p_conversation_id;
  end if;
  if v_owner <> p_user_id then
    raise exception 'User % does not own conversation %', p_user_id, p_conversation_id;
  end if;

  if p_content_type = 'text' then
    if p_body is null or btrim(p_body) = '' then
      raise exception 'Text message body is required';
    end if;
  else
    if p_attachment_path is null or btrim(p_attachment_path) = '' then
      raise exception 'Attachment path is required for % messages', p_content_type;
    end if;
  end if;

  select username into v_username from public.zpath_users where id = p_user_id;

  insert into public.messages (
    conversation_id, sender_role, sender_user_id, sender_display_name,
    content_type, body, attachment_path, attachment_meta
  )
  values (
    p_conversation_id, 'user', p_user_id, v_username,
    p_content_type, p_body, p_attachment_path, p_attachment_meta
  )
  returning id into v_message_id;

  v_preview := case p_content_type
    when 'text' then left(p_body, 120)
    when 'image' then '[Hình ảnh]'
    else '[Tệp đính kèm]'
  end;

  update public.conversations
  set last_message_at = now(),
      last_message_preview = v_preview,
      unread_count_mentor = unread_count_mentor + 1,
      status = case when status = 'closed' then 'active' else status end
  where id = p_conversation_id;

  return v_message_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4.3 send_mentor_message: routes the message to the correct thread based on
-- the mentor's chosen identity mode, snapshotting the display identity.
--   named     -> (user, mentor) named thread, real display_name/avatar
--   anonymous -> user's pooled thread, shown as 'ZPath Mentor'
-- Returns the resulting message + the (possibly different) target conversation.
-- ---------------------------------------------------------------------------
create or replace function public.send_mentor_message(
  p_mentor_id uuid,
  p_conversation_id uuid,
  p_identity_mode text,
  p_content_type public.message_content_type,
  p_body text,
  p_attachment_path text default null,
  p_attachment_meta jsonb default null
)
returns table (message_id uuid, target_conversation_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_active boolean;
  v_src_user uuid;
  v_src_kind public.conversation_kind;
  v_src_mentor uuid;
  v_target uuid;
  v_display text;
  v_avatar text;
  v_message_id uuid;
  v_preview text;
begin
  if p_identity_mode not in ('anonymous', 'named') then
    raise exception 'Invalid identity mode %', p_identity_mode;
  end if;

  select is_active into v_active from public.mentor_profiles where user_id = p_mentor_id;
  if not found or not v_active then
    raise exception 'Mentor % is not an active mentor', p_mentor_id;
  end if;

  select user_id, kind, mentor_id
    into v_src_user, v_src_kind, v_src_mentor
  from public.conversations
  where id = p_conversation_id;
  if not found then
    raise exception 'Conversation % not found', p_conversation_id;
  end if;

  -- Access: assigned named thread, or any anonymous pool thread.
  if not (v_src_kind = 'anonymous' or v_src_mentor = p_mentor_id) then
    raise exception 'Mentor % has no access to conversation %', p_mentor_id, p_conversation_id;
  end if;

  if p_content_type = 'text' then
    if p_body is null or btrim(p_body) = '' then
      raise exception 'Text message body is required';
    end if;
  else
    if p_attachment_path is null or btrim(p_attachment_path) = '' then
      raise exception 'Attachment path is required for % messages', p_content_type;
    end if;
  end if;

  if p_identity_mode = 'named' then
    v_target := public._mentor_get_or_create_named_conversation(v_src_user, p_mentor_id);
    select display_name, avatar_url
      into v_display, v_avatar
    from public.mentor_profiles
    where user_id = p_mentor_id;
  else
    v_target := public._mentor_get_or_create_anonymous_conversation(v_src_user);
    v_display := 'ZPath Mentor';
    v_avatar := null;
  end if;

  insert into public.messages (
    conversation_id, sender_role, sender_user_id, sender_display_name, sender_avatar_url,
    content_type, body, attachment_path, attachment_meta
  )
  values (
    v_target, 'mentor', p_mentor_id, v_display, v_avatar,
    p_content_type, p_body, p_attachment_path, p_attachment_meta
  )
  returning id into v_message_id;

  v_preview := case p_content_type
    when 'text' then left(p_body, 120)
    when 'image' then '[Hình ảnh]'
    else '[Tệp đính kèm]'
  end;

  update public.conversations
  set last_message_at = now(),
      last_message_preview = v_preview,
      unread_count_user = unread_count_user + 1,
      status = 'active'
  where id = v_target;

  message_id := v_message_id;
  target_conversation_id := v_target;
  return next;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4.4 claim_conversation: ensure a named (user, mentor) thread exists so the
-- mentor can take the conversation private. Returns that named thread id.
-- ---------------------------------------------------------------------------
create or replace function public.claim_conversation(
  p_mentor_id uuid,
  p_source_conversation_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_active boolean;
  v_user uuid;
  v_named uuid;
begin
  select is_active into v_active from public.mentor_profiles where user_id = p_mentor_id;
  if not found or not v_active then
    raise exception 'Mentor % is not an active mentor', p_mentor_id;
  end if;

  select user_id into v_user from public.conversations where id = p_source_conversation_id;
  if not found then
    raise exception 'Conversation % not found', p_source_conversation_id;
  end if;

  v_named := public._mentor_get_or_create_named_conversation(v_user, p_mentor_id);

  update public.conversations
  set status = 'active'
  where id = v_named and status = 'pending';

  return v_named;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4.5 mark_read: mark the other party's messages as read + reset unread counter.
-- ---------------------------------------------------------------------------
create or replace function public.mark_read(
  p_conversation_id uuid,
  p_reader_role text,
  p_reader_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid;
  v_kind public.conversation_kind;
  v_mentor uuid;
  v_active boolean;
begin
  if p_reader_role not in ('user', 'mentor') then
    raise exception 'Invalid reader role %', p_reader_role;
  end if;

  select user_id, kind, mentor_id
    into v_owner, v_kind, v_mentor
  from public.conversations
  where id = p_conversation_id;
  if not found then
    raise exception 'Conversation % not found', p_conversation_id;
  end if;

  if p_reader_role = 'user' then
    if v_owner <> p_reader_id then
      raise exception 'User % does not own conversation %', p_reader_id, p_conversation_id;
    end if;
    update public.messages
    set read_by_user_at = now()
    where conversation_id = p_conversation_id
      and sender_role <> 'user'
      and read_by_user_at is null;
    update public.conversations set unread_count_user = 0 where id = p_conversation_id;
  else
    select is_active into v_active from public.mentor_profiles where user_id = p_reader_id;
    if not found or not v_active then
      raise exception 'Mentor % is not an active mentor', p_reader_id;
    end if;
    if not (v_kind = 'anonymous' or v_mentor = p_reader_id) then
      raise exception 'Mentor % has no access to conversation %', p_reader_id, p_conversation_id;
    end if;
    update public.messages
    set read_by_mentor_at = now()
    where conversation_id = p_conversation_id
      and sender_role <> 'mentor'
      and read_by_mentor_at is null;
    update public.conversations set unread_count_mentor = 0 where id = p_conversation_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges: lock execution to service_role (server-only). Helpers stay
-- internal to the definer owner (no PUBLIC execute).
-- ---------------------------------------------------------------------------
revoke execute on function public._mentor_get_or_create_anonymous_conversation(uuid) from public;
revoke execute on function public._mentor_get_or_create_named_conversation(uuid, uuid) from public;
revoke execute on function public.request_consultation(uuid, text, text) from public;
revoke execute on function public.send_user_message(uuid, uuid, public.message_content_type, text, text, jsonb) from public;
revoke execute on function public.send_mentor_message(uuid, uuid, text, public.message_content_type, text, text, jsonb) from public;
revoke execute on function public.claim_conversation(uuid, uuid) from public;
revoke execute on function public.mark_read(uuid, text, uuid) from public;

grant execute on function public.request_consultation(uuid, text, text) to service_role;
grant execute on function public.send_user_message(uuid, uuid, public.message_content_type, text, text, jsonb) to service_role;
grant execute on function public.send_mentor_message(uuid, uuid, text, public.message_content_type, text, text, jsonb) to service_role;
grant execute on function public.claim_conversation(uuid, uuid) to service_role;
grant execute on function public.mark_read(uuid, text, uuid) to service_role;
