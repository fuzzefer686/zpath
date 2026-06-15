import "server-only";

import { randomUUID } from "crypto";

import { supabaseServer } from "@/src/lib/db/supabaseServer";
import {
  ATTACHMENT_BUCKET,
  validateAttachment,
  type AttachmentValidation,
} from "@/lib/mentor/attachments";
import type { AttachmentMeta } from "@/lib/mentor/types";
import {
  mapChatMessage,
  mapConversationSummary,
  mapMentorConversationSummary,
  type ChatMessage,
  type ConversationKind,
  type ConversationRow,
  type ConversationSummary,
  type MentorConversationRow,
  type MentorInbox,
  type MessageContentType,
  type MessageRow,
} from "@/lib/mentor/types";

// Disambiguate the embed: conversations has two FKs to mentor_profiles
// (mentor_id + flagged_by), so name the relationship explicitly.
const CONVERSATION_SELECT =
  "id, kind, status, subject, last_message_at, last_message_preview, unread_count_user, mentor:mentor_profiles!conversations_mentor_id_fkey(display_name, avatar_url)";

const MESSAGE_SELECT =
  "id, conversation_id, sender_role, sender_display_name, sender_avatar_url, content_type, body, attachment_path, attachment_meta, created_at";

/** All of a user's threads (anonymous pool + named), newest activity first. */
export async function listUserConversations(
  userId: string,
): Promise<ConversationSummary[]> {
  const { data, error } = await supabaseServer
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .eq("user_id", userId)
    .eq("flagged_spam", false)
    .order("last_message_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as ConversationRow[]).map(mapConversationSummary);
}

/** Returns the conversation owner's user_id, or null if it does not exist. */
export async function getConversationOwner(conversationId: string): Promise<string | null> {
  const { data, error } = await supabaseServer
    .from("conversations")
    .select("user_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (error) throw error;
  return data ? String((data as { user_id: string }).user_id) : null;
}

const SIGNED_URL_TTL_SECONDS = 3600; // 1 hour

export async function listMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabaseServer
    .from("messages")
    .select(MESSAGE_SELECT)
    .eq("conversation_id", conversationId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const messages = ((data ?? []) as unknown as MessageRow[]).map(mapChatMessage);

  // Resolve short-lived signed URLs for attachments (private bucket).
  await Promise.all(
    messages.map(async (message) => {
      if (!message.attachmentPath) return;
      const { data: signed } = await supabaseServer.storage
        .from(ATTACHMENT_BUCKET)
        .createSignedUrl(message.attachmentPath, SIGNED_URL_TTL_SECONDS);
      message.attachmentUrl = signed?.signedUrl ?? null;
    }),
  );

  return messages;
}

function sanitizeFileName(name: string): string {
  const cleaned = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return cleaned.length > 0 ? cleaned : "file";
}

export type UploadedAttachment = {
  path: string;
  contentType: "image" | "file";
  meta: AttachmentMeta;
};

/**
 * Validate + upload a chat attachment to the private bucket under
 * `{conversationId}/{uuid}/{filename}`. Returns the storage path + metadata to
 * pass into send_user_message / send_mentor_message. Caller must have already
 * verified the requester's access to the conversation.
 */
export async function uploadConversationAttachment(
  conversationId: string,
  file: File,
): Promise<UploadedAttachment> {
  const validation: AttachmentValidation = validateAttachment({
    type: file.type,
    size: file.size,
  });
  if (!validation.ok) {
    const err = new Error(validation.error) as Error & { code?: string };
    err.code = "INVALID_ATTACHMENT";
    throw err;
  }

  const path = `${conversationId}/${randomUUID()}/${sanitizeFileName(file.name)}`;

  const { error } = await supabaseServer.storage
    .from(ATTACHMENT_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw error;

  return {
    path,
    contentType: validation.contentType,
    meta: { mime: file.type, size: file.size, original_name: file.name },
  };
}

/** Find-or-create the user's anonymous thread + post the first message. */
export async function requestConsultation(
  userId: string,
  subject: string | null,
  firstMessage: string,
): Promise<string> {
  const { data, error } = await supabaseServer.rpc("request_consultation", {
    p_user_id: userId,
    p_subject: subject,
    p_first_message: firstMessage,
  });

  if (error) throw error;
  return String(data);
}

export async function sendUserMessage(
  userId: string,
  conversationId: string,
  contentType: MessageContentType,
  body: string | null,
  attachmentPath: string | null = null,
  attachmentMeta: unknown = null,
): Promise<string> {
  const { data, error } = await supabaseServer.rpc("send_user_message", {
    p_user_id: userId,
    p_conversation_id: conversationId,
    p_content_type: contentType,
    p_body: body,
    p_attachment_path: attachmentPath,
    p_attachment_meta: attachmentMeta,
  });

  if (error) throw error;
  return String(data);
}

// --------------------------------------------------------------------------
// Rate limiting (count-based, no schema change)
// --------------------------------------------------------------------------

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT_USER = 30; // messages / minute
const RATE_LIMIT_MENTOR = 100;

export class RateLimitError extends Error {
  code = "RATE_LIMITED" as const;
  constructor() {
    super("Bạn đang gửi quá nhanh. Vui lòng thử lại sau giây lát.");
    this.name = "RateLimitError";
  }
}

/** Throws RateLimitError if the sender exceeded their per-minute message quota. */
export async function assertSendRateLimit(
  senderUserId: string,
  role: "user" | "mentor",
): Promise<void> {
  const limit = role === "mentor" ? RATE_LIMIT_MENTOR : RATE_LIMIT_USER;
  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();

  const { count, error } = await supabaseServer
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("sender_user_id", senderUserId)
    .gte("created_at", since);

  if (error) throw error;
  if ((count ?? 0) >= limit) throw new RateLimitError();
}

export async function markConversationRead(
  conversationId: string,
  readerRole: "user" | "mentor",
  readerId: string,
): Promise<void> {
  const { error } = await supabaseServer.rpc("mark_read", {
    p_conversation_id: conversationId,
    p_reader_role: readerRole,
    p_reader_id: readerId,
  });

  if (error) throw error;
}

// --------------------------------------------------------------------------
// Mentor dashboard side
// --------------------------------------------------------------------------

const MENTOR_CONVERSATION_SELECT =
  "id, kind, status, subject, last_message_at, last_message_preview, unread_count_mentor, student:zpath_users(username)";

/** Two inboxes: the shared anonymous pool + this mentor's named threads. */
export async function getMentorInbox(mentorId: string): Promise<MentorInbox> {
  const [poolRes, mineRes] = await Promise.all([
    supabaseServer
      .from("conversations")
      .select(MENTOR_CONVERSATION_SELECT)
      .eq("kind", "anonymous")
      .eq("flagged_spam", false)
      .in("status", ["pending", "active"])
      .order("last_message_at", { ascending: false }),
    supabaseServer
      .from("conversations")
      .select(MENTOR_CONVERSATION_SELECT)
      .eq("kind", "named")
      .eq("mentor_id", mentorId)
      .eq("flagged_spam", false)
      .order("last_message_at", { ascending: false }),
  ]);

  if (poolRes.error) throw poolRes.error;
  if (mineRes.error) throw mineRes.error;

  return {
    pool: ((poolRes.data ?? []) as unknown as MentorConversationRow[]).map(
      mapMentorConversationSummary,
    ),
    mine: ((mineRes.data ?? []) as unknown as MentorConversationRow[]).map(
      mapMentorConversationSummary,
    ),
  };
}

type MentorAccessRow = { id: string; kind: ConversationKind; mentor_id: string | null };

/**
 * Returns the conversation if the mentor may access it (anonymous pool, or a
 * named thread assigned to them); otherwise null.
 */
export async function getConversationForMentor(
  conversationId: string,
  mentorId: string,
): Promise<MentorAccessRow | null> {
  const { data, error } = await supabaseServer
    .from("conversations")
    .select("id, kind, mentor_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as MentorAccessRow;
  const allowed = row.kind === "anonymous" || row.mentor_id === mentorId;
  return allowed ? row : null;
}

export async function sendMentorMessage(
  mentorId: string,
  conversationId: string,
  identityMode: "anonymous" | "named",
  contentType: MessageContentType,
  body: string | null,
  attachmentPath: string | null = null,
  attachmentMeta: unknown = null,
): Promise<{ messageId: string; targetConversationId: string }> {
  const { data, error } = await supabaseServer.rpc("send_mentor_message", {
    p_mentor_id: mentorId,
    p_conversation_id: conversationId,
    p_identity_mode: identityMode,
    p_content_type: contentType,
    p_body: body,
    p_attachment_path: attachmentPath,
    p_attachment_meta: attachmentMeta,
  });

  if (error) throw error;
  // RPC returns a single-row table.
  const row = Array.isArray(data) ? data[0] : data;
  return {
    messageId: String(row.message_id),
    targetConversationId: String(row.target_conversation_id),
  };
}

export async function claimConversation(
  mentorId: string,
  sourceConversationId: string,
): Promise<string> {
  const { data, error } = await supabaseServer.rpc("claim_conversation", {
    p_mentor_id: mentorId,
    p_source_conversation_id: sourceConversationId,
  });

  if (error) throw error;
  return String(data);
}

/** Soft-close a conversation the mentor has access to (history stays readable). */
export async function closeConversationAsMentor(
  conversationId: string,
): Promise<void> {
  const { error } = await supabaseServer
    .from("conversations")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", conversationId);

  if (error) throw error;
}

/** Flag a conversation as spam: hides it from the student inbox + shared pool. */
export async function flagConversationAsSpam(
  conversationId: string,
  mentorId: string,
): Promise<void> {
  const { error } = await supabaseServer
    .from("conversations")
    .update({
      flagged_spam: true,
      flagged_at: new Date().toISOString(),
      flagged_by: mentorId,
    })
    .eq("id", conversationId);

  if (error) throw error;
}
