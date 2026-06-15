"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ChatMessage, ConversationSummary } from "@/lib/mentor/types";
import { conversationChannel } from "@/lib/mentor/channels";
import { subscribeToPing } from "@/lib/supabase/realtime";
import { MessageBubble } from "./MessageBubble";
import { AttachmentPicker } from "./AttachmentPicker";

// Realtime drives instant updates; polling is a slow safety net.
const POLL_INTERVAL_MS = 15000;

export function ChatThread({
  conversation,
  onBack,
  onActivity,
}: {
  conversation: ConversationSummary;
  onBack: () => void;
  onActivity: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const conversationId = conversation.id;

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/mentor/conversations/${conversationId}/messages`);
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data?.messages)) {
        setMessages(data.messages as ChatMessage[]);
      }
    } finally {
      // `loading` starts true; the component remounts per thread via `key`.
      setLoading(false);
    }
  }, [conversationId]);

  // Initial load + realtime ping + slow poll fallback.
  useEffect(() => {
    fetchMessages();
    const unsubscribe = subscribeToPing(conversationChannel(conversationId), fetchMessages);
    const timer = setInterval(fetchMessages, POLL_INTERVAL_MS);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [conversationId, fetchMessages]);

  // Keep the view pinned to the latest message.
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
      const res = await fetch(`/api/mentor/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Không thể gửi tin nhắn.");
        return;
      }
      setDraft("");
      await fetchMessages();
      onActivity();
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
      const upRes = await fetch(`/api/mentor/conversations/${conversationId}/attachments`, {
        method: "POST",
        body: fd,
      });
      const up = await upRes.json().catch(() => null);
      if (!upRes.ok || !up?.path) {
        setError(up?.error ?? "Không thể tải tệp lên.");
        return;
      }
      const msgRes = await fetch(`/api/mentor/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_type: up.contentType,
          attachment_path: up.path,
          attachment_meta: up.meta,
        }),
      });
      if (!msgRes.ok) {
        const d = await msgRes.json().catch(() => null);
        setError(d?.error ?? "Không thể gửi tệp.");
        return;
      }
      await fetchMessages();
      onActivity();
    } catch {
      setError("Lỗi mạng. Vui lòng thử lại.");
    } finally {
      setUploading(false);
    }
  };

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
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{conversation.counterpartName}</p>
          {conversation.subject && (
            <p className="truncate text-xs text-muted-foreground">{conversation.subject}</p>
          )}
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground">Đang tải...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">Chưa có tin nhắn.</p>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
      </div>

      <form onSubmit={handleSend} className="border-t border-border/60 p-3">
        {error && <p className="mb-2 px-1 text-xs font-medium text-destructive">{error}</p>}
        {uploading && (
          <p className="mb-2 px-1 text-xs font-medium text-muted-foreground">Đang tải tệp lên...</p>
        )}
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
            placeholder="Nhập tin nhắn..."
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
    </div>
  );
}
