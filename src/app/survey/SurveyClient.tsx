"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ZPATH_TALLY_SESSION_STORAGE_KEY } from "@/src/lib/forms/tallySession";

const TALLY_BASE_URL = "https://tally.so/r";

function createSessionId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function SurveyClient() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const formId = process.env.NEXT_PUBLIC_TALLY_FORM_ID?.trim();

  useEffect(() => {
    const nextSessionId = createSessionId();

    setSessionId(nextSessionId);

    try {
      window.localStorage.setItem(ZPATH_TALLY_SESSION_STORAGE_KEY, nextSessionId);
    } catch {
      // Some browsers can block storage; the URL still carries the session id.
    }
  }, []);

  const tallyUrl = useMemo(() => {
    if (!formId || !sessionId) return null;

    const url = new URL(`${TALLY_BASE_URL}/${formId}`);
    url.searchParams.set("source", "zpath");
    url.searchParams.set("session_id", sessionId);
    url.searchParams.set("student_ref", "guest");

    return url.toString();
  }, [formId, sessionId]);

  if (!formId) {
    return (
      <SurveyShell>
        <h1 className="text-2xl font-bold">Chưa cấu hình biểu mẫu khảo sát</h1>
        <p className="mt-3 text-muted-foreground">
          Vui lòng cấu hình NEXT_PUBLIC_TALLY_FORM_ID để mở khảo sát ZPath.
        </p>
      </SurveyShell>
    );
  }

  return (
    <SurveyShell>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Khảo sát định hướng ZPath
          </h1>
          <p className="mt-2 text-muted-foreground">
            Hãy trả lời trung thực. Kết quả chỉ mang tính tham khảo.
          </p>
        </div>

        {tallyUrl ? (
          <Button asChild variant="outline">
            <Link href={tallyUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
              Mở trong Tally
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        {tallyUrl ? (
          <iframe
            title="ZPath career orientation survey"
            src={tallyUrl}
            className="h-[760px] w-full border-0"
            loading="lazy"
          />
        ) : (
          <div className="flex h-[360px] items-center justify-center text-muted-foreground">
            Đang chuẩn bị biểu mẫu...
          </div>
        )}
      </div>
    </SurveyShell>
  );
}

function SurveyShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground sm:py-14">
      <div className="mx-auto max-w-5xl">{children}</div>
    </main>
  );
}
