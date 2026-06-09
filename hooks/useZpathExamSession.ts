"use client";

import { useCallback, useState } from "react";

export type ZpathExamQuestion = {
  index: number;
  label: string;
  content: string;
};

export type ZpathExamMessage = {
  id: string;
  type: "user" | "answer" | "progress" | "verification";
  content: string;
  status?: "running" | "completed";
};

export type ZpathExamAnswerAction = "next" | "full" | "full_answers_only" | "custom";

type ExamSessionState = {
  examSessionId: string;
  conversationId: string | null;
  extractedMarkdown: string;
  questions: ZpathExamQuestion[];
  status: "reviewing" | "confirmed";
  currentQuestionIndex: number;
};

type ExamApiSessionResponse = ExamSessionState & {
  error?: {
    message?: string;
  };
};

const anonymousIdKey = "zpath:advisor_anonymous_id";
const OCR_TIMEOUT_SECONDS = 90;
const OCR_ESTIMATED_SECONDS_PER_IMAGE = 15;

function createAnonymousId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `anon-${crypto.randomUUID()}`;
  }

  return `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getAnonymousId() {
  if (typeof window === "undefined") return undefined;

  const existing = window.localStorage.getItem(anonymousIdKey);
  if (existing) return existing;

  const nextId = createAnonymousId();
  window.localStorage.setItem(anonymousIdKey, nextId);
  return nextId;
}

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getVerificationDisplayIndex(runIndex: number) {
  return runIndex === 2 ? 1 : 2;
}

function getVerificationStatusText(hasIssue: boolean) {
  return hasIssue ? "Kết quả có sai sót" : "Kết quả đã chính xác";
}

async function readApiJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as
    | (T & { error?: { message?: string } })
    | null;

  if (!response.ok) {
    throw new Error(data?.error?.message ?? "Không thể xử lý yêu cầu.");
  }

  if (!data) {
    throw new Error("Phản hồi từ Zpath AI không hợp lệ.");
  }

  return data;
}

export function useZpathExamSession() {
  const [session, setSession] = useState<ExamSessionState | null>(null);
  const [draftMarkdown, setDraftMarkdown] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [messages, setMessages] = useState<ZpathExamMessage[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [ocrElapsedSeconds, setOcrElapsedSeconds] = useState(0);
  const [ocrEstimatedSeconds, setOcrEstimatedSeconds] = useState(
    OCR_ESTIMATED_SECONDS_PER_IMAGE,
  );

  const uploadImages = useCallback(async (files: File[], conversationId?: string | null) => {
    const estimatedSeconds =
      Math.max(1, files.length) * OCR_ESTIMATED_SECONDS_PER_IMAGE;
    setErrorMessage(null);
    setIsUploading(true);
    setOcrElapsedSeconds(0);
    setOcrEstimatedSeconds(estimatedSeconds);
    setMessages([]);
    const controller = new AbortController();
    let didTimeout = false;
    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      const elapsed = Math.min(
        OCR_TIMEOUT_SECONDS,
        Math.floor((Date.now() - startedAt) / 1000),
      );
      setOcrElapsedSeconds(elapsed);
    }, 250);
    const timeoutId = window.setTimeout(() => {
      didTimeout = true;
      setOcrElapsedSeconds(OCR_TIMEOUT_SECONDS);
      controller.abort();
    }, OCR_TIMEOUT_SECONDS * 1000);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("images[]", file);
      });
      const anonymousId = getAnonymousId();
      if (anonymousId) formData.append("anonymousId", anonymousId);
      if (conversationId) formData.append("conversationId", conversationId);

      const response = await fetch("/api/advisor/exam/upload", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      const data = await readApiJson<ExamApiSessionResponse>(response);

      setSession(data);
      setDraftMarkdown(data.extractedMarkdown);
      setIsEditing(false);
      return true;
    } catch (error) {
      if (didTimeout || (error instanceof DOMException && error.name === "AbortError")) {
        setErrorMessage(
          "Zpath AI đọc đề quá 90 giây. Hãy thử ảnh rõ hơn, cắt sát vùng đề hơn hoặc tải lại.",
        );
      } else {
        setErrorMessage(error instanceof Error ? error.message : "Không thể đọc ảnh đề thi.");
      }
      return false;
    } finally {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
      setIsUploading(false);
    }
  }, []);

  const uploadImage = useCallback(
    async (file: File, conversationId?: string | null) => {
      return uploadImages([file], conversationId);
    },
    [uploadImages],
  );

  const saveMarkdown = useCallback(async () => {
    if (!session) return;
    setErrorMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/advisor/exam/${session.examSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markdown: draftMarkdown,
          anonymousId: getAnonymousId(),
        }),
      });
      const data = await readApiJson<ExamApiSessionResponse>(response);

      setSession(data);
      setDraftMarkdown(data.extractedMarkdown);
      setIsEditing(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không thể lưu đề đã sửa.");
    } finally {
      setIsSaving(false);
    }
  }, [draftMarkdown, session]);

  const confirmMarkdown = useCallback(async () => {
    if (!session) return;
    setErrorMessage(null);
    setIsConfirming(true);

    try {
      const response = await fetch(`/api/advisor/exam/${session.examSessionId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonymousId: getAnonymousId() }),
      });
      const data = await readApiJson<ExamApiSessionResponse>(response);

      setSession(data);
      setDraftMarkdown(data.extractedMarkdown);
      setIsEditing(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không thể xác nhận đề.");
    } finally {
      setIsConfirming(false);
    }
  }, [session]);

  const answer = useCallback(
    async (message: string, action: ZpathExamAnswerAction = "custom") => {
      if (!session) return;
      setErrorMessage(null);
      setIsAnswering(true);
      const displayMessage =
        action === "next"
          ? "Giải câu tiếp theo"
          : action === "full" || action === "full_answers_only"
            ? action === "full_answers_only"
              ? "Giải cả đề - chỉ đáp án"
              : "Giải cả đề - giải đầy đủ"
            : message.trim();

      if (!displayMessage) {
        setIsAnswering(false);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          type: "user",
          content: displayMessage,
        },
      ]);
      const thinkingMessageId =
        action === "full" || action === "full_answers_only" ? createMessageId() : null;
      let thinkingIntervalId: number | null = null;

      if (thinkingMessageId) {
        const thinkingStartedAt = Date.now();
        setMessages((prev) => [
          ...prev,
          {
            id: thinkingMessageId,
            type: "progress",
            content: "Zpath AI đang suy nghĩ... 0s",
            status: "running",
          },
        ]);
        thinkingIntervalId = window.setInterval(() => {
          const elapsed = Math.floor((Date.now() - thinkingStartedAt) / 1000);
          setMessages((prev) =>
            prev.map((message) =>
              message.id === thinkingMessageId
                ? { ...message, content: `Zpath AI đang suy nghĩ... ${elapsed}s` }
                : message,
            ),
          );
        }, 1000);
      }

      try {
        const response = await fetch(`/api/advisor/exam/${session.examSessionId}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            action,
            anonymousId: getAnonymousId(),
          }),
        });
        const data = await readApiJson<{
          mode: "single_question" | "next_question" | "full_exam" | "custom_prompt";
          answer: string;
          shouldVerify: boolean;
          currentQuestionIndex?: number;
          error?: { message?: string };
        }>(response);

        if (typeof data.currentQuestionIndex === "number") {
          setSession((prev) =>
            prev ? { ...prev, currentQuestionIndex: data.currentQuestionIndex ?? prev.currentQuestionIndex } : prev,
          );
        }

        setMessages((prev) => [
          ...prev.filter((message) => message.id !== thinkingMessageId),
          {
            id: createMessageId(),
            type: "answer",
            content: data.answer,
          },
        ]);

        if (data.shouldVerify) {
          setIsVerifying(true);
          const verificationOneId = createMessageId();
          const verificationTwoId = createMessageId();
          setMessages((prev) => [
            ...prev,
            {
              id: verificationOneId,
              type: "progress",
              content: "Đang tự kiểm tra kết quả lần 1/2",
              status: "running",
            },
            {
              id: verificationTwoId,
              type: "progress",
              content: "Đang tự kiểm tra kết quả lần 2/2",
              status: "running",
            },
          ]);

          const verifyResponse = await fetch(
            `/api/advisor/exam/${session.examSessionId}/verify`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                firstAnswer: data.answer,
                anonymousId: getAnonymousId(),
              }),
            },
          );

          const verifyData = await readApiJson<{
            progress: string;
            verifications: Array<{
              runIndex: number;
              answer: string;
              progressLabel: string;
              hasIssue: boolean;
              summary: string;
            }>;
          }>(verifyResponse);
          const firstVerification = verifyData.verifications[0];
          const secondVerification = verifyData.verifications[1];

          setMessages((prev) =>
            prev.map((message) => {
              if (message.id === verificationOneId) {
                return {
                  ...message,
                  content: `Tự kiểm tra kết quả lần 1/2 - ${getVerificationStatusText(
                    Boolean(firstVerification?.hasIssue),
                  )}`,
                  status: "completed" as const,
                };
              }

              if (message.id === verificationTwoId) {
                return {
                  ...message,
                  content: `Tự kiểm tra kết quả lần 2/2 - ${getVerificationStatusText(
                    Boolean(secondVerification?.hasIssue),
                  )}`,
                  status: "completed" as const,
                };
              }

              return message;
            }),
          );

          const issueVerifications = verifyData.verifications.filter(
            (verification) => verification.hasIssue,
          );
          if (!issueVerifications.length) return;

          setMessages((prev) => [
            ...prev,
            ...issueVerifications.map((verification) => ({
              id: createMessageId(),
              type: "verification" as const,
              content: `### Sai sót phát hiện ở lần tự kiểm tra ${getVerificationDisplayIndex(
                verification.runIndex,
              )}/2\n\n${verification.answer}`,
            })),
          ]);
        }
      } catch (error) {
        setMessages((prev) => prev.filter((message) => message.id !== thinkingMessageId));
        setErrorMessage(error instanceof Error ? error.message : "Không thể giải đề.");
      } finally {
        if (thinkingIntervalId) window.clearInterval(thinkingIntervalId);
        setIsAnswering(false);
        setIsVerifying(false);
      }
    },
    [session],
  );

  const reset = useCallback(() => {
    setSession(null);
    setDraftMarkdown("");
    setIsEditing(false);
    setMessages([]);
    setErrorMessage(null);
    setOcrElapsedSeconds(0);
    setOcrEstimatedSeconds(OCR_ESTIMATED_SECONDS_PER_IMAGE);
  }, []);

  return {
    session,
    draftMarkdown,
    isEditing,
    messages,
    errorMessage,
    isUploading,
    isSaving,
    isConfirming,
    isAnswering,
    isVerifying,
    ocrElapsedSeconds,
    ocrRemainingSeconds: Math.max(0, OCR_TIMEOUT_SECONDS - ocrElapsedSeconds),
    ocrEstimatedSeconds,
    ocrMaxSeconds: OCR_TIMEOUT_SECONDS,
    setDraftMarkdown,
    setIsEditing,
    uploadImages,
    uploadImage,
    saveMarkdown,
    confirmMarkdown,
    answer,
    reset,
  };
}
