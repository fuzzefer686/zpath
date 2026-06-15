import type { ZpathAuthUser } from "@/lib/zpath-auth";

// Mirrors public.mentor_profiles.role.
export type MentorRole = "mentor" | "lead_mentor" | "admin";

// Mirrors public.conversation_kind / conversation_status.
export type ConversationKind = "anonymous" | "named";
export type ConversationStatus = "pending" | "active" | "closed";

// Mirrors public.message_sender_role / message_content_type.
export type MessageSenderRole = "user" | "mentor" | "system";
export type MessageContentType = "text" | "image" | "file";

export type MentorProfile = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  showIdentityDefault: boolean;
  isActive: boolean;
  role: MentorRole;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
};

// A mentor session: the authenticated account + its active mentor profile.
export type MentorContext = {
  user: ZpathAuthUser;
  profile: MentorProfile;
};

// Raw row shape returned from public.mentor_profiles.
export type MentorProfileRow = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  show_identity_default: boolean;
  is_active: boolean;
  role: string;
  bio: string | null;
  created_at: string;
  updated_at: string;
};

// Brand identity shown to users when a mentor replies anonymously.
export const ANONYMOUS_MENTOR_NAME = "ZPath Mentor";

// A user's thread as shown in their inbox (identity resolved to the counterpart).
export type ConversationSummary = {
  id: string;
  kind: ConversationKind;
  status: ConversationStatus;
  subject: string | null;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  unreadCountUser: number;
  counterpartName: string;
  counterpartAvatarUrl: string | null;
};

export type AttachmentMeta = {
  mime: string;
  size: number;
  original_name: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderRole: MessageSenderRole;
  senderDisplayName: string | null;
  senderAvatarUrl: string | null;
  contentType: MessageContentType;
  body: string | null;
  attachmentPath: string | null;
  attachmentMeta: AttachmentMeta | null;
  // Short-lived signed URL resolved server-side at fetch time (null for text).
  attachmentUrl: string | null;
  createdAt: string;
};

type EmbeddedMentor = { display_name: string | null; avatar_url: string | null };

export type ConversationRow = {
  id: string;
  kind: ConversationKind;
  status: ConversationStatus;
  subject: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  unread_count_user: number;
  mentor: EmbeddedMentor | EmbeddedMentor[] | null;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_role: MessageSenderRole;
  sender_display_name: string | null;
  sender_avatar_url: string | null;
  content_type: MessageContentType;
  body: string | null;
  attachment_path: string | null;
  attachment_meta: unknown;
  created_at: string;
};

// A thread as shown to a mentor (counterpart is the student).
export type MentorConversationSummary = {
  id: string;
  kind: ConversationKind;
  status: ConversationStatus;
  subject: string | null;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  unreadCountMentor: number;
  studentName: string;
};

export type MentorInbox = {
  pool: MentorConversationSummary[];
  mine: MentorConversationSummary[];
};

type EmbeddedStudent = { username: string | null };

export type MentorConversationRow = {
  id: string;
  kind: ConversationKind;
  status: ConversationStatus;
  subject: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  unread_count_mentor: number;
  student: EmbeddedStudent | EmbeddedStudent[] | null;
};

export function mapMentorConversationSummary(
  row: MentorConversationRow,
): MentorConversationSummary {
  const student = Array.isArray(row.student) ? row.student[0] : row.student;
  return {
    id: String(row.id),
    kind: row.kind,
    status: row.status,
    subject: row.subject,
    lastMessageAt: String(row.last_message_at),
    lastMessagePreview: row.last_message_preview,
    unreadCountMentor: Number(row.unread_count_mentor ?? 0),
    studentName: student?.username ?? "Học sinh",
  };
}

export function mapConversationSummary(row: ConversationRow): ConversationSummary {
  const mentor = Array.isArray(row.mentor) ? row.mentor[0] : row.mentor;
  const named = row.kind === "named";

  return {
    id: String(row.id),
    kind: row.kind,
    status: row.status,
    subject: row.subject,
    lastMessageAt: String(row.last_message_at),
    lastMessagePreview: row.last_message_preview,
    unreadCountUser: Number(row.unread_count_user ?? 0),
    counterpartName: named ? mentor?.display_name ?? ANONYMOUS_MENTOR_NAME : ANONYMOUS_MENTOR_NAME,
    counterpartAvatarUrl: named ? mentor?.avatar_url ?? null : null,
  };
}

export function mapChatMessage(row: MessageRow): ChatMessage {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    senderRole: row.sender_role,
    senderDisplayName: row.sender_display_name,
    senderAvatarUrl: row.sender_avatar_url,
    contentType: row.content_type,
    body: row.body,
    attachmentPath: row.attachment_path,
    attachmentMeta: (row.attachment_meta as AttachmentMeta | null) ?? null,
    attachmentUrl: null,
    createdAt: String(row.created_at),
  };
}

export function mapMentorProfile(row: MentorProfileRow): MentorProfile {
  const role: MentorRole =
    row.role === "lead_mentor" || row.role === "admin" ? row.role : "mentor";

  return {
    userId: String(row.user_id),
    displayName: String(row.display_name),
    avatarUrl: row.avatar_url,
    showIdentityDefault: Boolean(row.show_identity_default),
    isActive: Boolean(row.is_active),
    role,
    bio: row.bio,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
