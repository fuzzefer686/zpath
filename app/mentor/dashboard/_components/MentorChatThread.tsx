"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Flag, Send, UserPlus, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ANONYMOUS_MENTOR_NAME,
  type ChatMessage,
  type MentorConversationSummary,
} from "@/lib/mentor/types";
import { conversationChannel } from "@/lib/mentor/channels";
import { subscribeToPing } from "@/lib/supabase/realtime";
import { MessageBubble } from "@/app/mentor/_components/MessageBubble";
import { AttachmentPicker } from "@/app/mentor/_components/AttachmentPicker";
import {
  IdentityWarningModal,
  hasSeenIdentityWarning,
  markIdentityWarningSeen,
} from "./IdentityWarningModal";

// Realtime drives instant updates; polling is a slow safety net.
const POLL_INTERVAL_MS = 15000;

export function MentorChatThread({
  conversation,
  identityMode,
  mentorDisplayName,
  onBack,
  onMessageSent,
  onClaim,
  onClose,
  onFlag,
}: {
  conversation: MentorConversationSummary;
  identityMode: "anonymous" | "named";
  mentorDisplayName: string;
  onBack: () => void;
  onMessageSent: (targetConversationId: string) => void;
  onClaim: () => void;
  onClose: () => void;
  onFlag: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Per-message override: null = follow the dashboard's global toggle.
  const [overrideNamed, setOverrideNamed] = useState<boolean | null>(null);
  const [warningOpen, setWarningOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const conversationId = conversation.id;
  const isClosed = conversation.status === "closed";

  const effectiveNamed = overrideNamed ?? identityMode === "named";
  const effectiveMode: "anonymous" | "named" = effectiveNamed ? "named" : "anonymous";

  const handleToggleIdentity = () => {
    if (effectiveNamed) {
      setOverrideNamed(false);
      return;
    }
    if (hasSeenIdentityWarning()) {
      setOverrideNamed(true);
    } else {
      setWarningOpen(true);
    }
  };

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/mentor/dashboard/conversations/${conversationId}/messages`,
      );
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data?.messages)) {
        setMessages(data.messages as ChatMessage[]);
      }
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();
    const unsubscribe = subscribeToPing(conversationChannel(conversationId), fetchMessages);
    const timer = setInterval(fetchMessages, POLL_INTERVAL_MS);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [conversationId, fetchMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (text.length === 0 || sending) return;

    setSending(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/mentor/dashboard/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: text, identity_mode: effectiveMode }),
        },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Không thể gửi tin nhắn.");
        return;
      }
      setDraft("");
      await fetchMessages();
      onMessageSent(String(data?.targetConversationId ?? conversationId));
    } catch {
      setError("Lỗi mạng. Vui lòng thử lại.");
    } finally {
      setSending(false);
    }
  };

  const handlePick = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const upRes = await fetch(
        `/api/mentor/dashboard/conversations/${conversationId}/attachments`,
        { method: "POST", body: fd },
      );
      const up = await upRes.json().catch(() => null);
      if (!upRes.ok || !up?.path) {
        setError(up?.error ?? "Không thể tải tệp lên.");
        return;
      }
      const msgRes = await fetch(
        `/api/mentor/dashboard/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identity_mode: effectiveMode,
            content_type: up.contentType,
            attachment_path: up.path,
            attachment_meta: up.meta,
          }),
        },
      );
      const msgData = await msgRes.json().catch(() => null);
      if (!msgRes.ok) {
        setError(msgData?.error ?? "Không thể gửi tệp.");
        return;
      }
      await fetchMessages();
      onMessageSent(String(msgData?.targetConversationId ?? conversationId));
    } catch {
      setError("Lỗi mạng. Vui lòng thử lại.");
    } finally {
      setUploading(false);
    }
  };

  const sendingIdentityLabel = effectiveNamed ? mentorDisplayName : ANONYMOUS_MENTOR_NAME;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted md:hidden"
          aria-label="Quay lại"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{conversation.studentName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {conversation.kind === "anonymous" ? "Hộp thư chung" : "Chat cá nhân"}
            {isClosed && " · Đã đóng"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {conversation.kind === "anonymous" && (
            <Button size="sm" variant="outline" onClick={onClaim} title="Chuyển thành chat cá nhân">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Nhận riêng</span>
            </Button>
          )}
          {!isClosed && (
            <Button size="sm" variant="ghost" onClick={onClose} title="Đóng cuộc hội thoại">
              <XCircle className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onFlag}
            title="Báo cáo spam (ẩn khỏi học sinh)"
            className="text-destructive hover:text-destructive"
          >
            <Flag className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground">Đang tải...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">Chưa có tin nhắn.</p>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} selfRole="mentor" />)
        )}
      </div>

      <form onSubmit={handleSend} className="border-t border-border/60 p-3">
        {error && <p className="mb-2 px-1 text-xs font-medium text-destructive">{error}</p>}
        <div className="mb-1.5 flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
          <span>Gửi với danh tính:</span>
          <button
            type="button"
            onClick={handleToggleIdentity}
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold transition ${
              effectiveNamed
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-foreground/70"
            }`}
            title="Bấm để đổi danh tính cho tin nhắn này"
          >
            {sendingIdentityLabel}
          </button>
          {uploading && <span>· Đang tải tệp lên...</span>}
        </div>
        <div className="flex items-end gap-2">
          <AttachmentPicker onPick={handlePick} onError={setError} disabled={sending || uploading} />
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            rows={1}
            placeholder="Nhập câu trả lời..."
            className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl border border-input bg-background px-4 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button
            type="submit"
            size="icon"
            disabled={sending || uploading || draft.trim().length === 0}
            aria-label="Gửi"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>

      <IdentityWarningModal
        open={warningOpen}
        onConfirm={() => {
          markIdentityWarningSeen();
          setOverrideNamed(true);
          setWarningOpen(false);
        }}
        onCancel={() => setWarningOpen(false)}
      />
    </div>
  );
}
