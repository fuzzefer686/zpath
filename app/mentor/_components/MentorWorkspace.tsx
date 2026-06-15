"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ConversationSummary } from "@/lib/mentor/types";
import { userInboxChannel } from "@/lib/mentor/channels";
import { subscribeToPing } from "@/lib/supabase/realtime";
import { ConversationList } from "./ConversationList";
import { ChatThread } from "./ChatThread";
import { RequestConsultationForm } from "./RequestConsultationForm";

// Realtime drives instant updates; polling is a slow safety net.
const POLL_INTERVAL_MS = 20000;

type Mode = "thread" | "new";

export function MentorWorkspace({
  userId,
  initialConversations,
}: {
  userId: string;
  initialConversations: ConversationSummary[];
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("thread");

  const refetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/mentor/conversations");
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data?.conversations)) {
        setConversations(data.conversations as ConversationSummary[]);
      }
    } catch {
      // Silent: polling will retry.
    }
  }, []);

  // Realtime ping on inbox changes + slow poll fallback.
  useEffect(() => {
    const unsubscribe = subscribeToPing(userInboxChannel(userId), refetchConversations);
    const timer = setInterval(refetchConversations, POLL_INTERVAL_MS);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [userId, refetchConversations]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setMode("thread");
  };

  const handleNewRequest = () => {
    setSelectedId(null);
    setMode("new");
  };

  const handleCreated = async (conversationId: string) => {
    await refetchConversations();
    setSelectedId(conversationId);
    setMode("thread");
  };

  const selected =
    mode === "thread" && selectedId
      ? conversations.find((c) => c.id === selectedId) ?? null
      : null;

  const showDetailOnMobile = mode === "new" || selected !== null;

  return (
    <div className="grid h-[calc(100vh-9rem)] grid-cols-1 overflow-hidden rounded-2xl border border-border/60 md:grid-cols-[340px_1fr]">
      {/* Inbox column */}
      <aside
        className={`flex flex-col border-border/60 md:border-r ${
          showDetailOnMobile ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
          <h1 className="text-base font-black tracking-tight">Hộp thư tư vấn</h1>
          <Button size="sm" variant="hero" onClick={handleNewRequest}>
            <Plus className="h-4 w-4" /> Yêu cầu
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        </div>
      </aside>

      {/* Detail column */}
      <section
        className={`min-h-0 ${showDetailOnMobile ? "flex" : "hidden md:flex"} flex-col`}
      >
        {mode === "new" ? (
          <div className="flex-1 overflow-y-auto">
            <RequestConsultationForm
              onCreated={handleCreated}
              onCancel={() => setMode("thread")}
            />
          </div>
        ) : selected ? (
          <ChatThread
            key={selected.id}
            conversation={selected}
            onBack={() => setSelectedId(null)}
            onActivity={refetchConversations}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-sm text-muted-foreground">
            <p>Chọn một cuộc trò chuyện hoặc gửi yêu cầu tư vấn mới.</p>
            <Button variant="outline" className="mt-4 md:hidden" onClick={handleNewRequest}>
              <Plus className="h-4 w-4" /> Yêu cầu tư vấn
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
