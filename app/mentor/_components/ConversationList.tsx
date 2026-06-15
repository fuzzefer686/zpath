import type { ConversationSummary } from "@/lib/mentor/types";

function formatWhen(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="h-10 w-10 rounded-full object-cover" />;
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-sm font-bold text-white">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: {
  conversations: ConversationSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (conversations.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-sm text-muted-foreground">
        Chưa có cuộc trò chuyện nào. Hãy gửi yêu cầu tư vấn đầu tiên.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border/60">
      {conversations.map((c) => {
        const active = c.id === selectedId;
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              className={`flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-muted/60 ${
                active ? "bg-muted" : ""
              }`}
            >
              <Avatar name={c.counterpartName} url={c.counterpartAvatarUrl} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{c.counterpartName}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {formatWhen(c.lastMessageAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-muted-foreground">
                    {c.lastMessagePreview ?? "Bắt đầu trò chuyện"}
                  </span>
                  {c.unreadCountUser > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                      {c.unreadCountUser}
                    </span>
                  )}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
