"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  CircleAlert,
  FileQuestion,
  ImageUp,
  Loader2,
  PencilLine,
  RotateCcw,
  SendHorizontal,
  X,
} from "lucide-react";

import { MarkdownContent } from "@/components/advisor/MarkdownContent";
import { useZpathExamSession } from "@/hooks/useZpathExamSession";
import { Button } from "@/components/ui/button";

type ExamSolverWorkspaceProps = {
  conversationId?: string | null;
  onClose: () => void;
};

const MAX_EXAM_IMAGE_COUNT = 5;
const OCR_ESTIMATED_SECONDS_PER_IMAGE = 15;

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)}MB`;
  return `${Math.max(1, Math.round(size / 1024))}KB`;
}

export function ExamSolverWorkspace({
  conversationId,
  onClose,
}: ExamSolverWorkspaceProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const latestAiMessageRef = useRef<HTMLElement | null>(null);
  const chatSectionRef = useRef<HTMLElement | null>(null);
  const isNearBottomRef = useRef(true);
  const [question, setQuestion] = useState("");
  const [hasNewAnswer, setHasNewAnswer] = useState(false);
  const [selectedExamFiles, setSelectedExamFiles] = useState<File[]>([]);
  const [fileSelectionError, setFileSelectionError] = useState<string | null>(null);
  const [openFullSolveMenuId, setOpenFullSolveMenuId] = useState<string | null>(null);
  const exam = useZpathExamSession();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const isBusy =
    exam.isUploading ||
    exam.isSaving ||
    exam.isConfirming ||
    exam.isAnswering ||
    exam.isVerifying;

  const selectedEstimatedSeconds =
    Math.max(1, selectedExamFiles.length) * OCR_ESTIMATED_SECONDS_PER_IMAGE;

  const handleFileChange = (files: FileList | null | undefined) => {
    const nextFiles = Array.from(files ?? []);
    if (!nextFiles.length) return;

    if (nextFiles.length > MAX_EXAM_IMAGE_COUNT) {
      setFileSelectionError(`Chỉ hỗ trợ tối đa ${MAX_EXAM_IMAGE_COUNT} ảnh cho mỗi đề.`);
      setSelectedExamFiles(nextFiles.slice(0, MAX_EXAM_IMAGE_COUNT));
    } else {
      setFileSelectionError(null);
      setSelectedExamFiles(nextFiles);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const moveSelectedFile = (fromIndex: number, direction: -1 | 1) => {
    setSelectedExamFiles((prev) => {
      const toIndex = fromIndex + direction;
      if (toIndex < 0 || toIndex >= prev.length) return prev;

      const nextFiles = [...prev];
      const [file] = nextFiles.splice(fromIndex, 1);
      nextFiles.splice(toIndex, 0, file);
      return nextFiles;
    });
  };

  const removeSelectedFile = (index: number) => {
    setSelectedExamFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
    setFileSelectionError(null);
  };

  const handleUploadSelectedFiles = async () => {
    if (!selectedExamFiles.length) {
      setFileSelectionError("Hãy chọn ít nhất một ảnh đề thi.");
      return;
    }

    const didUpload = await exam.uploadImages(selectedExamFiles, conversationId);
    if (didUpload) {
      setSelectedExamFiles([]);
      setFileSelectionError(null);
    }
  };

  const handleAsk = () => {
    const trimmed = question.trim();
    if (!trimmed) return;
    void exam.answer(trimmed, "custom");
    setQuestion("");
  };

  const nextQuestionNumber = (exam.session?.currentQuestionIndex ?? 0) + 1;
  const latestAiMessageId = [...exam.messages]
    .reverse()
    .find((message) => message.type !== "user")?.id;

  const scrollElementInsideChat = useCallback((element: HTMLElement | null) => {
    const viewport = messagesViewportRef.current;
    if (!viewport || !element) return;

    const viewportRect = viewport.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const targetTop = viewport.scrollTop + elementRect.top - viewportRect.top - 12;

    viewport.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "smooth",
    });
  }, []);

  const scrollToLatestAnswer = useCallback(() => {
    scrollElementInsideChat(latestAiMessageRef.current);
    setHasNewAnswer(false);
  }, [scrollElementInsideChat]);

  const handleMessageScroll = () => {
    const viewport = messagesViewportRef.current;
    if (!viewport) return;

    const distanceFromBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    const isNearBottom = distanceFromBottom < 120;
    isNearBottomRef.current = isNearBottom;
    if (isNearBottom) setHasNewAnswer(false);
  };

  useEffect(() => {
    const latestMessage = exam.messages.at(-1);
    if (!latestMessage) return;

    if (latestMessage.type !== "user" && isNearBottomRef.current) {
      window.requestAnimationFrame(scrollToLatestAnswer);
      return;
    }

    if (latestMessage.type !== "user") {
      window.requestAnimationFrame(() => setHasNewAnswer(true));
    }
  }, [exam.messages, scrollToLatestAnswer]);

  useEffect(() => {
    if (exam.session?.status !== "confirmed") return;
    window.requestAnimationFrame(() => {
      scrollElementInsideChat(chatSectionRef.current);
    });
  }, [exam.session?.status, scrollElementInsideChat]);

  const renderSolveActions = (compact = false, menuId = "default") => (
    <div className={`flex flex-wrap gap-2 ${compact ? "mt-3" : "mt-5"}`}>
      <button
        type="button"
        onClick={() => {
          setOpenFullSolveMenuId(null);
          void exam.answer("", "next");
        }}
        disabled={isBusy}
        className="rounded-full bg-foreground px-4 py-2 text-xs font-black text-background transition hover:bg-foreground/90 disabled:opacity-50"
      >
        Giải câu tiếp theo
      </button>
      <div className="relative">
        <button
          type="button"
          onClick={() =>
            setOpenFullSolveMenuId((currentMenuId) =>
              currentMenuId === menuId ? null : menuId,
            )
          }
          disabled={isBusy}
          className="rounded-full bg-primary px-4 py-2 text-xs font-black text-white transition hover:bg-primary/90 disabled:opacity-50"
        >
          Giải cả đề
        </button>
        {openFullSolveMenuId === menuId && !isBusy && (
          <div className="absolute left-0 top-11 z-30 w-56 overflow-hidden rounded-2xl border border-border bg-white p-1.5 text-left shadow-lg">
            <button
              type="button"
              onClick={() => {
                setOpenFullSolveMenuId(null);
                void exam.answer("giải cả đề, chỉ hiện đáp án cuối", "full_answers_only");
              }}
              className="block w-full rounded-xl px-3 py-2 text-left text-xs font-black text-foreground transition hover:bg-muted"
            >
              Chỉ đáp án
            </button>
            <button
              type="button"
              onClick={() => {
                setOpenFullSolveMenuId(null);
                void exam.answer("giải cả đề đầy đủ", "full");
              }}
              className="block w-full rounded-xl px-3 py-2 text-left text-xs font-black text-foreground transition hover:bg-muted"
            >
              Giải đầy đủ
            </button>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          setOpenFullSolveMenuId(null);
          exam.reset();
        }}
        disabled={isBusy}
        className="rounded-full border border-border bg-white px-4 py-2 text-xs font-black text-foreground transition hover:bg-muted disabled:opacity-50"
      >
        Giải đề mới
      </button>
    </div>
  );

  return (
    <main className="h-[calc(100dvh-64px)] overflow-hidden bg-background text-foreground">
      <div className="mx-auto flex h-full w-full max-w-[100rem] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-white px-4 text-sm font-bold text-foreground shadow-sm transition hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Zpath AI
          </button>

          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-primary">
            <FileQuestion className="h-4 w-4" />
            Công cụ giải đề thi
          </div>

          <button
            type="button"
            onClick={exam.reset}
            disabled={!exam.session || isBusy}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-white px-4 text-sm font-bold text-foreground shadow-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" />
            Đề mới
          </button>
        </div>

        <section className="grid min-h-0 flex-1 overflow-hidden rounded-[1.75rem] border border-border/70 bg-white/68 shadow-sm backdrop-blur-xl lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="hidden border-r border-border/70 bg-muted/25 p-5 lg:block">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
              Trạng thái
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <div className="text-sm font-black text-foreground">1. Tải ảnh đề</div>
                <div className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">
                  PNG, JPEG hoặc WebP, tối đa 10MB.
                </div>
              </div>
              <div>
                <div className="text-sm font-black text-foreground">2. Kiểm tra OCR</div>
                <div className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">
                  Sửa bản đề nếu AI đọc thiếu hoặc sai. Ước tính{" "}
                  {selectedExamFiles.length ? selectedEstimatedSeconds : exam.ocrEstimatedSeconds} giây,
                  tự dừng sau {exam.ocrMaxSeconds} giây.
                </div>
                {exam.isUploading && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary/10">
                    <div
                      className="h-full rounded-full bg-primary transition-[width]"
                      style={{
                        width: `${Math.min(
                          100,
                          (exam.ocrElapsedSeconds / exam.ocrEstimatedSeconds) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm font-black text-foreground">3. Giải từng bước</div>
                <div className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">
                  Câu tiếp theo hiện tại: câu {nextQuestionNumber}.
                </div>
              </div>
            </div>
          </aside>

          <div className="relative flex min-h-0 flex-col">
            <div
              ref={messagesViewportRef}
              onScroll={handleMessageScroll}
              className="relative flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8"
            >
              {!exam.session && (
                <div className="flex min-h-[56vh] flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-primary/25 bg-background/70 p-8 text-center transition hover:border-primary/45 hover:bg-background">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    disabled={exam.isUploading}
                    onChange={(event) => handleFileChange(event.target.files)}
                  />
                  {exam.isUploading ? (
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  ) : (
                    <ImageUp className="h-11 w-11 text-primary" />
                  )}
                  <span className="mt-4 text-xl font-black text-foreground">
                    {exam.isUploading ? "Zpath AI đang đọc ảnh đề" : "Tải ảnh đề thi"}
                  </span>
                  {exam.isUploading && (
                    <span className="mt-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                      AI đang đọc đề: {exam.ocrElapsedSeconds}s · Ước tính{" "}
                      {exam.ocrEstimatedSeconds}s
                    </span>
                  )}
                  <span className="mt-2 max-w-md text-sm font-semibold leading-6 text-muted-foreground">
                    Chọn tối đa {MAX_EXAM_IMAGE_COUNT} ảnh theo đúng thứ tự trang. AI sẽ chép lại
                    đề bằng Markdown + LaTeX để bạn xác nhận trước khi giải.
                  </span>

                  {!exam.isUploading && (
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="gap-2 rounded-full"
                      >
                        <ImageUp className="h-4 w-4" />
                        Chọn ảnh
                      </Button>
                      <Button
                        type="button"
                        variant="hero"
                        onClick={handleUploadSelectedFiles}
                        disabled={!selectedExamFiles.length}
                        className="gap-2 rounded-full"
                      >
                        <FileQuestion className="h-4 w-4" />
                        Đọc đề
                      </Button>
                    </div>
                  )}

                  {fileSelectionError && (
                    <div className="mt-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">
                      {fileSelectionError}
                    </div>
                  )}

                  {!exam.isUploading && selectedExamFiles.length > 0 && (
                    <div className="mt-5 w-full max-w-2xl rounded-2xl border border-border bg-white p-3 text-left">
                      <div className="mb-3 flex items-center justify-between gap-3 px-1">
                        <div className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">
                          {selectedExamFiles.length} ảnh đã chọn
                        </div>
                        <div className="text-xs font-bold text-muted-foreground">
                          Ước tính {selectedEstimatedSeconds}s
                        </div>
                      </div>
                      <div className="space-y-2">
                        {selectedExamFiles.map((file, index) => (
                          <div
                            key={`${file.name}-${file.size}-${index}`}
                            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-background/80 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-black text-foreground">
                                Trang {index + 1}
                              </div>
                              <div className="truncate text-xs font-semibold text-muted-foreground">
                                {file.name} · {formatFileSize(file.size)}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveSelectedFile(index, -1)}
                                disabled={index === 0}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-foreground transition hover:bg-muted disabled:opacity-35"
                                aria-label={`Đưa trang ${index + 1} lên trước`}
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveSelectedFile(index, 1)}
                                disabled={index === selectedExamFiles.length - 1}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-foreground transition hover:bg-muted disabled:opacity-35"
                                aria-label={`Đưa trang ${index + 1} xuống sau`}
                              >
                                <ArrowDown className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeSelectedFile(index)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-destructive transition hover:bg-destructive/10"
                                aria-label={`Xóa trang ${index + 1}`}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {exam.errorMessage && (
                <div className="mb-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">
                  {exam.errorMessage}
                </div>
              )}

              {exam.session && (
                <div className="mx-auto max-w-4xl space-y-7">
                  <section className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                          Bản đề AI đọc được
                        </div>
                        <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground">
                          Kiểm tra lại nội dung đề
                        </h1>
                      </div>
                      <div className="text-xs font-bold text-muted-foreground">
                        {exam.session.questions.length
                          ? `${exam.session.questions.length} câu được nhận diện`
                          : "Chưa tách được danh sách câu"}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-primary/10 px-4 py-3 text-xs font-bold leading-5 text-muted-foreground">
                      Phần hình vẽ, ảnh hoặc biểu đồ được ẩn trong bản chép đề. Hãy đối chiếu trực tiếp
                      với ảnh gốc nếu câu hỏi phụ thuộc vào hình.
                    </div>

                    {exam.isEditing ? (
                      <textarea
                        value={exam.draftMarkdown}
                        onChange={(event) => exam.setDraftMarkdown(event.target.value)}
                        className="min-h-80 w-full rounded-2xl border border-border bg-white p-4 font-mono text-sm leading-6 text-foreground outline-none focus:border-primary"
                        disabled={isBusy}
                      />
                    ) : (
                      <div className="max-h-[42vh] overflow-y-auto rounded-2xl bg-background/72 p-5">
                        <MarkdownContent content={exam.draftMarkdown} />
                      </div>
                    )}

                    {exam.session.status === "reviewing" && (
                      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        {exam.isEditing ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={exam.saveMarkdown}
                            disabled={isBusy || !exam.draftMarkdown.trim()}
                            className="gap-2 rounded-full"
                          >
                            {exam.isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                            Lưu bản sửa
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => exam.setIsEditing(true)}
                            disabled={isBusy}
                            className="gap-2 rounded-full"
                          >
                            <PencilLine className="h-4 w-4" />
                            Sửa đề
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="hero"
                          onClick={exam.confirmMarkdown}
                          disabled={isBusy || exam.isEditing}
                          className="gap-2 rounded-full"
                        >
                          {exam.isConfirming ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          Đề đã đúng
                        </Button>
                      </div>
                    )}
                  </section>

                  {exam.session.status === "confirmed" && (
                    <section
                      ref={chatSectionRef}
                      className="space-y-5 border-t border-border/70 pt-6"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                            Chat giải đề
                          </div>
                          <div className="mt-1 text-sm font-bold text-muted-foreground">
                            Câu tiếp theo: câu {nextQuestionNumber}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {exam.messages.length === 0 && (
                          <div className="rounded-2xl bg-background/72 p-4">
                            <div className="text-sm font-bold text-foreground">
                              Chọn cách bắt đầu giải đề.
                            </div>
                            {renderSolveActions(true, "initial")}
                          </div>
                        )}

                        {exam.messages.map((message) => {
                          if (message.type === "user") {
                            return (
                              <div key={message.id} className="flex justify-end">
                                <div className="max-w-[78%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm font-bold text-white">
                                  {message.content}
                                </div>
                              </div>
                            );
                          }

                          if (message.type === "progress") {
                            const isLatestAiMessage = message.id === latestAiMessageId;
                            const hasIssue = message.content.includes("sai sót");
                            return (
                              <div
                                key={message.id}
                                ref={(node) => {
                                  if (isLatestAiMessage) latestAiMessageRef.current = node;
                                }}
                                className={`flex items-center gap-2 text-sm font-black ${
                                  hasIssue ? "text-destructive" : "text-primary"
                                }`}
                              >
                                {message.status === "completed" && hasIssue ? (
                                  <CircleAlert className="h-4 w-4 text-destructive" />
                                ) : message.status === "completed" ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                ) : (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                )}
                                {message.content}
                                {message.status === "completed" && (
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                                      hasIssue
                                        ? "bg-destructive/10 text-destructive"
                                        : "bg-emerald-50 text-emerald-700"
                                    }`}
                                  >
                                    {hasIssue ? "Cần xem lại" : "Đã xong"}
                                  </span>
                                )}
                              </div>
                            );
                          }

                          const isLatestAiMessage = message.id === latestAiMessageId;
                          return (
                            <article
                              key={message.id}
                              ref={(node) => {
                                if (isLatestAiMessage) latestAiMessageRef.current = node;
                              }}
                              className="max-w-none scroll-mt-4"
                            >
                              <MarkdownContent content={message.content} />
                              {renderSolveActions(false, message.id)}
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>

            {exam.session?.status === "confirmed" && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleAsk();
                }}
                className="border-t border-border/70 bg-white/70 p-3 sm:p-4"
              >
                <div className="mx-auto flex max-w-4xl gap-2">
                  <input
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Hỏi cụ thể, ví dụ: giải câu 2 hoặc vì sao chọn C..."
                    className="h-12 flex-1 rounded-full border border-border bg-white px-4 text-sm font-semibold outline-none transition focus:border-primary"
                    disabled={isBusy}
                  />
                  <Button
                    type="submit"
                    variant="hero"
                    disabled={isBusy || !question.trim()}
                    className="h-12 gap-2 rounded-full px-5"
                  >
                    <SendHorizontal className="h-4 w-4" />
                    Hỏi
                  </Button>
                </div>
              </form>
            )}

            {hasNewAnswer && (
              <button
                type="button"
                onClick={scrollToLatestAnswer}
                className="absolute bottom-22 right-6 z-20 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-black text-background shadow-lg transition hover:bg-foreground/90"
              >
                <ArrowDown className="h-4 w-4" />
                AI đã có kết quả
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
