"use client";

import { useCallback, useEffect, useState } from "react";

import type { MentorConversationSummary, MentorInbox } from "@/lib/mentor/types";
import { mentorInboxChannel, mentorPoolChannel } from "@/lib/mentor/channels";
import { subscribeToPing } from "@/lib/supabase/realtime";
import { MentorChatThread } from "./MentorChatThread";
import {
  IdentityWarningModal,
  hasSeenIdentityWarning,
  markIdentityWarningSeen,
} from "./IdentityWarningModal";

// Realtime drives instant updates; polling is a slow safety net.
const POLL_INTERVAL_MS = 20000;

type Tab = "pool" | "mine";

function formatWhen(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function totalUnread(inbox: MentorInbox) {
  const sum = (list: MentorConversationSummary[]) =>
    list.reduce((acc, c) => acc + c.unreadCountMentor, 0);
  return sum(inbox.pool) + sum(inbox.mine);
}

function InboxList({
  items,
  selectedId,
  emptyLabel,
  onSelect,
}: {
  items: MentorConversationSummary[];
  selectedId: string | null;
  emptyLabel: string;
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) {
    return <div className="px-4 py-10 text-center text-sm text-muted-foreground">{emptyLabel}</div>;
  }
  return (
    <ul className="divide-y divide-border/60">
      {items.map((c) => (
        <li key={c.id}>
          <button
            type="button"
            onClick={() => onSelect(c.id)}
            className={`flex w-full flex-col gap-0.5 px-4 py-3 text-left transition hover:bg-muted/60 ${
              c.id === selectedId ? "bg-muted" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-semibold">{c.studentName}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {formatWhen(c.lastMessageAt)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs text-muted-foreground">
                {c.lastMessagePreview ?? "—"}
              </span>
              {c.unreadCountMentor > 0 && (
                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {c.unreadCountMentor}
                </span>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function MentorDashboard({
  mentorId,
  initialInbox,
  mentorDisplayName,
  defaultIdentityNamed,
}: {
  mentorId: string;
  initialInbox: MentorInbox;
  mentorDisplayName: string;
  defaultIdentityNamed: boolean;
}) {
  const [inbox, setInbox] = useState(initialInbox);
  const [tab, setTab] = useState<Tab>("pool");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [identityNamed, setIdentityNamed] = useState(defaultIdentityNamed);
  const [warningOpen, setWarningOpen] = useState(false);

  const handleToggleIdentity = () => {
    if (identityNamed) {
      setIdentityNamed(false); // disabling never needs a warning
      return;
    }
    if (hasSeenIdentityWarning()) {
      setIdentityNamed(true);
    } else {
      setWarningOpen(true);
    }
  };

  const refetchInbox = useCallback(async () => {
    try {
      const res = await fetch("/api/mentor/dashboard/inbox");
      const data = await res.json().catch(() => null);
      if (res.ok && data?.pool && data?.mine) setInbox(data as MentorInbox);
    } catch {
      // Silent: polling retries.
    }
  }, []);

  // Realtime pings on pool + named-inbox changes, plus slow poll fallback.
  useEffect(() => {
    const unsubPool = subscribeToPing(mentorPoolChannel(), refetchInbox);
    const unsubMine = subscribeToPing(mentorInboxChannel(mentorId), refetchInbox);
    const timer = setInterval(refetchInbox, POLL_INTERVAL_MS);
    return () => {
      unsubPool();
      unsubMine();
      clearInterval(timer);
    };
  }, [mentorId, refetchInbox]);

  const selected =
    [...inbox.pool, ...inbox.mine].find((c) => c.id === selectedId) ?? null;

  const handleMessageSent = async (targetConversationId: string) => {
    await refetchInbox();
    if (targetConversationId !== selectedId) {
      // A named reply branched the thread into "my conversations".
      setSelectedId(targetConversationId);
      setTab("mine");
    }
  };

  const handleClaim = async () => {
    if (!selectedId) return;
    try {
      const res = await fetch(`/api/mentor/dashboard/conversations/${selectedId}/claim`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.namedConversationId) {
        await refetchInbox();
        setSelectedId(String(data.namedConversationId));
        setTab("mine");
      }
    } catch {
      // ignore
    }
  };

  const handleClose = async () => {
    if (!selectedId) return;
    try {
      await fetch(`/api/mentor/dashboard/conversations/${selectedId}/close`, { method: "POST" });
      await refetchInbox();
      setSelectedId(null);
    } catch {
      // ignore
    }
  };

  const handleFlag = async () => {
    if (!selectedId) return;
    if (!window.confirm("Báo cáo cuộc trò chuyện này là spam? Nó sẽ bị ẩn khỏi học sinh và hộp thư chung.")) {
      return;
    }
    try {
      await fetch(`/api/mentor/dashboard/conversations/${selectedId}/flag`, { method: "POST" });
      await refetchInbox();
      setSelectedId(null);
    } catch {
      // ignore
    }
  };

  const unread = totalUnread(inbox);
  const tabItems = tab === "pool" ? inbox.pool : inbox.mine;

  return (
    <div className="space-y-4">
      {/* Identity toggle bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold">Tổng tin chưa đọc:</span>
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground">
            {unread}
          </span>
        </div>
        <button
          type="button"
          onClick={handleToggleIdentity}
          className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
            identityNamed
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-foreground/70"
          }`}
        >
          Chế độ: {identityNamed ? `Hiển thị danh tính (${mentorDisplayName})` : "Ẩn danh (ZPath Mentor)"}
        </button>
      </div>

      <IdentityWarningModal
        open={warningOpen}
        onConfirm={() => {
          markIdentityWarningSeen();
          setIdentityNamed(true);
          setWarningOpen(false);
        }}
        onCancel={() => setWarningOpen(false)}
      />

      <div className="grid h-[calc(100vh-13rem)] grid-cols-1 overflow-hidden rounded-2xl border border-border/60 md:grid-cols-[340px_1fr]">
        {/* Inbox column */}
        <aside
          className={`flex flex-col border-border/60 md:border-r ${
            selected ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="flex border-b border-border/60">
            <button
              type="button"
              onClick={() => setTab("pool")}
              className={`flex-1 px-3 py-3 text-sm font-semibold transition ${
                tab === "pool" ? "border-b-2 border-primary text-primary" : "text-foreground/60"
              }`}
            >
              Hộp thư chung
            </button>
            <button
              type="button"
              onClick={() => setTab("mine")}
              className={`flex-1 px-3 py-3 text-sm font-semibold transition ${
                tab === "mine" ? "border-b-2 border-primary text-primary" : "text-foreground/60"
              }`}
            >
              Của tôi
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <InboxList
              items={tabItems}
              selectedId={selectedId}
              emptyLabel={
                tab === "pool" ? "Hộp thư chung trống." : "Bạn chưa nhận cuộc trò chuyện nào."
              }
              onSelect={setSelectedId}
            />
          </div>
        </aside>

        {/* Detail column */}
        <section className={`min-h-0 ${selected ? "flex" : "hidden md:flex"} flex-col`}>
          {selected ? (
            <MentorChatThread
              key={selected.id}
              conversation={selected}
              identityMode={identityNamed ? "named" : "anonymous"}
              mentorDisplayName={mentorDisplayName}
              onBack={() => setSelectedId(null)}
              onMessageSent={handleMessageSent}
              onClaim={handleClaim}
              onClose={handleClose}
              onFlag={handleFlag}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
              Chọn một cuộc trò chuyện để trả lời.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
