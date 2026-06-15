import { Download, FileText } from "lucide-react";

import type { ChatMessage, MessageSenderRole } from "@/lib/mentor/types";
import { formatBytes } from "@/lib/mentor/attachments";

function formatTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function Attachment({ message }: { message: ChatMessage }) {
  const url = message.attachmentUrl;
  const meta = message.attachmentMeta;
  if (!url) {
    return <div className="text-xs italic text-muted-foreground">[Tệp đính kèm hết hạn]</div>;
  }

  if (message.contentType === "image") {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={meta?.original_name ?? "Hình ảnh"}
          className="max-h-64 rounded-lg object-cover"
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download={meta?.original_name}
      className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 p-2.5"
    >
      <FileText className="h-8 w-8 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {meta?.original_name ?? "Tệp đính kèm"}
        </p>
        {meta?.size != null && (
          <p className="text-xs text-muted-foreground">{formatBytes(meta.size)}</p>
        )}
      </div>
      <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
    </a>
  );
}

/**
 * `selfRole` decides which side is "mine" (right-aligned, primary colour).
 * User view passes "user" (default); mentor dashboard passes "mentor".
 */
export function MessageBubble({
  message,
  selfRole = "user",
}: {
  message: ChatMessage;
  selfRole?: MessageSenderRole;
}) {
  if (message.senderRole === "system") {
    return (
      <div className="my-2 text-center text-xs text-muted-foreground">{message.body}</div>
    );
  }

  const isSelf = message.senderRole === selfRole;

  return (
    <div className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}>
      {!isSelf && message.senderDisplayName && (
        <span className="mb-0.5 px-1 text-[11px] font-semibold text-muted-foreground">
          {message.senderDisplayName}
        </span>
      )}
      {message.contentType !== "text" && (
        <div className="max-w-[78%]">
          <Attachment message={message} />
        </div>
      )}
      {message.body && (
        <div
          className={`mt-1 max-w-[78%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${
            isSelf
              ? "rounded-br-sm bg-primary text-primary-foreground"
              : "rounded-bl-sm bg-muted text-foreground"
          }`}
        >
          {message.body}
        </div>
      )}
      <span className="mt-0.5 px-1 text-[10px] text-muted-foreground">
        {formatTime(message.createdAt)}
      </span>
    </div>
  );
}
