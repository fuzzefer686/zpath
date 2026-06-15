// Attachment validation rules + bucket, shared by client (pre-flight checks)
// and server (authoritative validation). Must stay in sync with the bucket's
// allowed_mime_types in 20260615120100_mentor_storage.sql.

export const ATTACHMENT_BUCKET = "mentor-chat-attachments";

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const FILE_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "application/zip",
] as const;

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

// `accept` attribute for the file picker.
export const ATTACHMENT_ACCEPT = [...IMAGE_MIME_TYPES, ...FILE_MIME_TYPES].join(",");

export function classifyAttachment(mime: string): "image" | "file" | null {
  if ((IMAGE_MIME_TYPES as readonly string[]).includes(mime)) return "image";
  if ((FILE_MIME_TYPES as readonly string[]).includes(mime)) return "file";
  return null;
}

export type AttachmentValidation =
  | { ok: true; contentType: "image" | "file" }
  | { ok: false; error: string };

/** Authoritative-shaped validation (also used client-side before upload). */
export function validateAttachment(input: { type: string; size: number }): AttachmentValidation {
  const kind = classifyAttachment(input.type);
  if (!kind) {
    return { ok: false, error: "Định dạng tệp không được hỗ trợ." };
  }
  const limit = kind === "image" ? MAX_IMAGE_BYTES : MAX_FILE_BYTES;
  if (input.size > limit) {
    const mb = Math.round(limit / (1024 * 1024));
    return { ok: false, error: `Tệp vượt quá giới hạn ${mb}MB.` };
  }
  if (input.size <= 0) {
    return { ok: false, error: "Tệp rỗng." };
  }
  return { ok: true, contentType: kind };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
