"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  isValidTallySessionId,
  ZPATH_TALLY_SESSION_STORAGE_KEY,
} from "@/src/lib/forms/tallySession";

type PollResponse =
  | { status: "processing" }
  | { status: "completed"; evaluation_id: string }
  | { status: "error"; message?: string };

export function ProcessingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawSessionId = searchParams.get("session_id");
  const querySessionId = isValidTallySessionId(rawSessionId)
    ? rawSessionId.trim()
    : null;
  const [storedSessionId, setStoredSessionId] = useState<string | null>(null);
  const [checkedStoredSession, setCheckedStoredSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionId = querySessionId || storedSessionId;

  useEffect(() => {
    if (querySessionId) {
      setCheckedStoredSession(true);
      return;
    }

    try {
      const storedValue = window.localStorage.getItem(ZPATH_TALLY_SESSION_STORAGE_KEY);

      if (isValidTallySessionId(storedValue)) {
        const nextSessionId = storedValue.trim();

        setStoredSessionId(nextSessionId);
        router.replace(`/processing?session_id=${encodeURIComponent(nextSessionId)}`);
      }
    } catch {
      setStoredSessionId(null);
    } finally {
      setCheckedStoredSession(true);
    }
  }, [querySessionId, router]);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const pollEvaluation = async () => {
      try {
        const response = await fetch(
          `/api/evaluation/by-session?session_id=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error("Polling request failed");
        }

        const data = (await response.json()) as PollResponse;

        if (cancelled) return;

        if (data.status === "completed") {
          router.replace(`/result/${data.evaluation_id}`);
          return;
        }

        if (data.status === "error") {
          setError(data.message || "Không thể kiểm tra kết quả phân tích.");
          return;
        }

        timeoutId = setTimeout(pollEvaluation, 2000);
      } catch {
        if (!cancelled) {
          setError("Có lỗi khi kiểm tra kết quả. Vui lòng thử lại sau.");
        }
      }
    };

    pollEvaluation();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [router, sessionId]);

  if (!sessionId && !checkedStoredSession) {
    return (
      <ProcessingShell>
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
        <h1 className="mt-6 text-2xl font-bold">
          Đang kiểm tra mã phiên khảo sát...
        </h1>
      </ProcessingShell>
    );
  }

  if (!sessionId) {
    return (
      <ProcessingShell>
        <h1 className="text-2xl font-bold">
          Không tìm thấy mã phiên khảo sát.
        </h1>
        <p className="mt-3 text-muted-foreground">
          Vui lòng quay lại trang khảo sát và thử lại.
        </p>
      </ProcessingShell>
    );
  }

  return (
    <ProcessingShell>
      {error ? (
        <>
          <h1 className="text-2xl font-bold">Chưa thể tải kết quả</h1>
          <p className="mt-3 text-muted-foreground">{error}</p>
        </>
      ) : (
        <>
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <h1 className="mt-6 text-2xl font-bold">
            ZPath đang phân tích hồ sơ của bạn...
          </h1>
          <p className="mt-3 text-muted-foreground">
            Quá trình này thường mất vài giây. Trang sẽ tự chuyển khi kết quả sẵn sàng.
          </p>
        </>
      )}
    </ProcessingShell>
  );
}

function ProcessingShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="max-w-md text-center">{children}</div>
    </main>
  );
}
