"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Clock3, FileImage, Flame, ImagePlus, Loader2, ShieldCheck, X } from "lucide-react";

import { useAuth } from "@/components/zpath/AuthProvider";
import type { ExamDocumentType, ExamScheduleRow } from "@/lib/static-news-routes";

type UploadedExamImage = {
  id: string;
  route_slug: string;
  subject: string;
  document_type: ExamDocumentType;
  storage_path: string;
  public_url: string;
  mime_type: string;
  file_size: number;
  created_at: string;
};

type ExamScheduleBoardProps = {
  routeSlug: string;
  scheduleRows: ExamScheduleRow[];
};

const DOCUMENT_TYPE_LABELS: Record<ExamDocumentType, string> = {
  de: "Đề",
  dap_an: "Đáp án",
};

function createImageKey(subject: string, documentType: ExamDocumentType) {
  return `${subject}::${documentType}`;
}

function formatUpdatedAt(value?: string) {
  if (!value) return "Chưa có";

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function getSessionTone(session: string) {
  return session === "Sáng"
    ? "border-primary/25 bg-primary/10 text-primary"
    : "border-tier-high/30 bg-tier-high-soft text-tier-high";
}

export function ExamScheduleBoard({ routeSlug, scheduleRows }: ExamScheduleBoardProps) {
  const { user } = useAuth();
  const [images, setImages] = useState<UploadedExamImage[]>([]);
  const [selectedSubject, setSelectedSubject] = useState(
    scheduleRows.find((row) => !row.subject.includes("thủ tục"))?.subject ?? "Toán",
  );
  const [preview, setPreview] = useState<{
    subject: string;
    documentType: ExamDocumentType;
    images: UploadedExamImage[];
  } | null>(null);
  const [isLoadingImages, setIsLoadingImages] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";
  const examSubjects = useMemo(
    () => scheduleRows.filter((row) => !row.subject.includes("thủ tục")).map((row) => row.subject),
    [scheduleRows],
  );
  const imageGroups = useMemo(() => {
    const groups = new Map<string, UploadedExamImage[]>();

    images.forEach((image) => {
      const key = createImageKey(image.subject, image.document_type);
      groups.set(key, [...(groups.get(key) ?? []), image]);
    });

    groups.forEach((group) => {
      group.sort((left, right) => (
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
      ));
    });

    return groups;
  }, [images]);

  useEffect(() => {
    let isCancelled = false;

    async function loadImages() {
      setIsLoadingImages(true);
      try {
        const response = await fetch(`/api/exam/images?routeSlug=${encodeURIComponent(routeSlug)}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as { images?: UploadedExamImage[]; error?: string };

        if (!response.ok) throw new Error(data.error || "Không thể tải danh sách ảnh đề.");
        if (!isCancelled) setImages(data.images ?? []);
      } catch (loadError) {
        console.warn("Không thể tải danh sách ảnh đề, tạm hiển thị trạng thái đang cập nhật.", loadError);
        if (!isCancelled) setImages([]);
      } finally {
        if (!isCancelled) setIsLoadingImages(false);
      }
    }

    void loadImages();
    return () => {
      isCancelled = true;
    };
  }, [routeSlug]);

  const handleUpload = async (documentType: ExamDocumentType, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploading(true);
    setMessage(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("routeSlug", routeSlug);
      formData.append("subject", selectedSubject);
      formData.append("documentType", documentType);

      const response = await fetch("/api/exam/images", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as { image?: UploadedExamImage; error?: string };

      if (!response.ok || !data.image) {
        throw new Error(data.error || "Không thể tải ảnh đề.");
      }

      const uploadedImage = {
        ...(data.image as UploadedExamImage),
        created_at: new Date().toISOString(),
      };

      setImages((current) => [uploadedImage, ...current]);
      setMessage(`Đã tải ${DOCUMENT_TYPE_LABELS[documentType].toLowerCase()} ${selectedSubject}.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Không thể tải ảnh đề.");
    } finally {
      setIsUploading(false);
    }
  };

  const openPreview = (subject: string, documentType: ExamDocumentType) => {
    const group = imageGroups.get(createImageKey(subject, documentType)) ?? [];
    setPreview({ subject, documentType, images: group });
  };

  const renderDocumentCell = (
    subject: string,
    documentType: ExamDocumentType,
    latestImage?: UploadedExamImage,
  ) => (
    <div
      className={`min-w-0 rounded-2xl border p-2.5 ${
        latestImage
          ? "border-destructive/30 bg-destructive/5 shadow-[0_0_0_1px_hsl(var(--destructive)/0.08)]"
          : "border-border bg-background"
      }`}
    >
      <button
        type="button"
        onClick={() => openPreview(subject, documentType)}
        className={`flex h-9 w-full items-center justify-center gap-1.5 rounded-full px-2 text-xs font-bold transition-all hover:-translate-y-0.5 active:scale-[0.97] ${
          latestImage
            ? "bg-gradient-coral text-white shadow-coral"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
      >
        <FileImage className="h-3.5 w-3.5 shrink-0" />
        <span className="break-words leading-tight">{DOCUMENT_TYPE_LABELS[documentType]}</span>
      </button>

      <div
        className={`mt-2 flex min-h-7 items-center justify-center gap-1.5 rounded-full border px-2 text-center text-[11px] font-bold leading-tight ${
          latestImage
            ? "animate-pulse border-destructive/30 bg-destructive/10 text-destructive"
            : "border-primary/20 bg-primary/10 text-primary"
        }`}
      >
        {latestImage ? <Flame className="h-3 w-3 shrink-0" /> : <Clock3 className="h-3 w-3 shrink-0" />}
        <span className="break-words">{latestImage ? "HOT · Đã cập nhật" : "Đang cập nhật"}</span>
      </div>

      <button
        type="button"
        onClick={() => openPreview(subject, documentType)}
        className="mt-1.5 block min-h-4 w-full text-center text-[11px] font-semibold leading-tight text-muted-foreground transition-colors hover:text-foreground"
      >
        Lúc: {formatUpdatedAt(latestImage?.created_at)}
      </button>
    </div>
  );

  return (
    <div className="min-h-0 rounded-[1.25rem] border border-border bg-background/94 p-3 shadow-sm backdrop-blur sm:p-4">
      <div className="flex flex-col gap-3 border-b border-border pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div>
            <p className="text-xs font-bold text-primary">Bảng cập nhật</p>
            <h2 className="font-display text-2xl font-bold leading-tight sm:text-3xl">Lịch thi, đề và đáp án</h2>
          </div>
          {isLoadingImages && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Đang tải
            </span>
          )}
        </div>

        {isAdmin && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-2.5">
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-bold text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin upload
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(130px,180px)_1fr]">
              <select
                value={selectedSubject}
                onChange={(event) => setSelectedSubject(event.target.value)}
                className="h-10 rounded-full border border-input bg-background px-3 text-sm font-semibold"
              >
                {examSubjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-primary/20 bg-background px-3 text-xs font-bold transition-colors hover:border-primary hover:text-primary">
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  Tải lên đề
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => void handleUpload("de", event)}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
                <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-tier-high/30 bg-background px-3 text-xs font-bold transition-colors hover:border-tier-high hover:text-tier-high">
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  Tải lên đáp án
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => void handleUpload("dap_an", event)}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {(message || error) && (
        <div
          className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
            error
              ? "border-destructive/30 bg-destructive/5 text-destructive"
              : "border-tier-high/30 bg-tier-high-soft text-tier-high"
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="mt-3 grid min-h-0 gap-3 md:grid-cols-2">
        {scheduleRows.map((row) => {
          const examImages = imageGroups.get(createImageKey(row.subject, "de")) ?? [];
          const answerImages = imageGroups.get(createImageKey(row.subject, "dap_an")) ?? [];
          const latestExamImage = examImages[0];
          const latestAnswerImage = answerImages[0];
          const isHot = Boolean(latestExamImage || latestAnswerImage);

          return (
            <article
              key={`${row.date}-${row.session}-${row.subject}`}
              className={`min-w-0 rounded-[1.25rem] border p-3 transition-colors ${
                isHot ? "border-destructive/25 bg-destructive/5" : "border-border bg-card"
              }`}
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className={`inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-bold ${getSessionTone(row.session)}`}>
                      {row.session}
                    </span>
                    <span className="text-xs font-bold text-muted-foreground">{row.date}</span>
                    {isHot && (
                      <span className="inline-flex h-7 animate-pulse items-center gap-1 rounded-full bg-destructive px-2 text-[10px] font-black text-destructive-foreground">
                        <Flame className="h-3 w-3" />
                        HOT
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 break-words font-display text-2xl font-bold leading-tight">{row.subject}</h3>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                {[
                  ["Làm bài", row.duration],
                  ["Phát đề", row.distributionTime],
                  ["Bắt đầu", row.startTime],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-border bg-background px-2 py-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
                    <div className="mt-0.5 break-words text-xs font-black">{value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                {renderDocumentCell(row.subject, "de", latestExamImage)}
                {renderDocumentCell(row.subject, "dap_an", latestAnswerImage)}
              </div>
            </article>
          );
        })}
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/45 p-3 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          onMouseDown={() => setPreview(null)}
        >
          <div
            className="max-h-[92dvh] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-border bg-background shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border bg-card p-5">
              <div>
                <p className="text-xs font-bold text-primary">
                  {DOCUMENT_TYPE_LABELS[preview.documentType]}
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold">{preview.subject}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cập nhật lúc: {formatUpdatedAt(preview.images[0]?.created_at)}
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng ảnh đề"
                onClick={() => setPreview(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[72dvh] overflow-auto p-4">
              {preview.images.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-12 text-center text-sm text-muted-foreground">
                  Chưa có ảnh {DOCUMENT_TYPE_LABELS[preview.documentType].toLowerCase()} cho môn này.
                </div>
              ) : (
                <div className="space-y-4">
                  {preview.images.map((image) => (
                    <figure key={image.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.public_url} alt={`${DOCUMENT_TYPE_LABELS[image.document_type]} ${image.subject}`} className="max-h-[72dvh] w-full object-contain" />
                      <figcaption className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
                        {image.subject} · {DOCUMENT_TYPE_LABELS[image.document_type]} · {formatUpdatedAt(image.created_at)}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
