"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileImage,
  FileText,
  Flame,
  ImagePlus,
  Loader2,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

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
  heading?: string;
  dateLabel?: string;
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

export function ExamScheduleBoard({ routeSlug, scheduleRows, heading = "Bảng cập nhật", dateLabel }: ExamScheduleBoardProps) {
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
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [activePreviewImageId, setActivePreviewImageId] = useState<string | null>(null);
  const [zoomedImageId, setZoomedImageId] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";
  const hasManySubjects = scheduleRows.length > 4;
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
        new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
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

  useEffect(() => {
    if (!preview) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreview(null);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [preview]);

  const handleUpload = async (documentType: ExamDocumentType, event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;

    setIsUploading(true);
    setMessage(null);
    setError(null);

    try {
      const uploadedImages: UploadedExamImage[] = [];

      for (const file of files) {
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
          throw new Error(data.error || "Không thể tải file đề.");
        }

        uploadedImages.push(data.image as UploadedExamImage);
      }

      setImages((current) => [...current, ...uploadedImages]);
      setMessage(
        `Đã tải ${uploadedImages.length} file ${DOCUMENT_TYPE_LABELS[documentType].toLowerCase()} ${selectedSubject}.`,
      );
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Không thể tải file đề.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async (image: UploadedExamImage) => {
    const confirmed = window.confirm(`Xóa ${DOCUMENT_TYPE_LABELS[image.document_type].toLowerCase()} ${image.subject}?`);
    if (!confirmed) return;

    setDeletingImageId(image.id);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/exam/images", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: image.id }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(data?.error || "Không thể xóa file đề.");
      }

      setImages((current) => current.filter((item) => item.id !== image.id));
      const nextPreviewImages = preview?.images.filter((item) => item.id !== image.id) ?? [];
      if (activePreviewImageId === image.id) {
        setActivePreviewImageId(nextPreviewImages[0]?.id ?? null);
      }
      if (zoomedImageId === image.id) {
        setZoomedImageId(null);
      }
      setPreview((current) => current ? { ...current, images: nextPreviewImages } : current);
      setMessage("Đã xóa file đề.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Không thể xóa file đề.");
    } finally {
      setDeletingImageId(null);
    }
  };

  const openPreview = (subject: string, documentType: ExamDocumentType) => {
    const group = imageGroups.get(createImageKey(subject, documentType)) ?? [];
    setActivePreviewImageId(group[0]?.id ?? null);
    setZoomedImageId(null);
    setZoomScale(1);
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
          ? "border-destructive/60 bg-gradient-to-br from-destructive/15 via-background to-background shadow-[0_14px_34px_-24px_hsl(var(--destructive))] ring-2 ring-destructive/15"
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
            ? "animate-pulse border-destructive bg-destructive text-destructive-foreground shadow-sm"
            : "border-primary/20 bg-primary/10 text-primary"
        }`}
      >
        {latestImage ? <Flame className="h-3 w-3 shrink-0" /> : <Clock3 className="h-3 w-3 shrink-0" />}
        <span className="break-words">
          {latestImage ? `HOT · ${latestImage.mime_type === "application/pdf" ? "PDF" : "Ảnh"}` : "Đang cập nhật"}
        </span>
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

  const activePreviewImage =
    preview?.images.find((image) => image.id === activePreviewImageId) ?? preview?.images[0];
  const activePreviewIndex = preview && activePreviewImage
    ? preview.images.findIndex((image) => image.id === activePreviewImage.id)
    : -1;
  const previewHasOnlyImages = Boolean(
    preview?.images.length && preview.images.every((image) => image.mime_type !== "application/pdf"),
  );
  const zoomedImage = preview?.images.find((image) => image.id === zoomedImageId) ?? null;

  const movePreviewImage = (direction: -1 | 1) => {
    if (!preview?.images.length || !activePreviewImage) return;

    const nextIndex =
      (activePreviewIndex + direction + preview.images.length) % preview.images.length;
    setActivePreviewImageId(preview.images[nextIndex]?.id ?? null);
  };

  const openZoom = (imageId: string) => {
    setActivePreviewImageId(imageId);
    setZoomedImageId(imageId);
    setZoomScale(1);
  };

  const updateZoomScale = (nextScale: number) => {
    setZoomScale(Math.min(3, Math.max(1, nextScale)));
  };

  return (
    <div className="min-h-0 rounded-[1.25rem] border border-border bg-background/94 p-3 shadow-sm backdrop-blur sm:p-4">
      <div className="flex flex-col gap-3 border-b border-border pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div>
            <div className="flex flex-wrap gap-2">
              <p className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
                Đề thi và đáp án
              </p>
              {dateLabel && (
                <p className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-bold text-muted-foreground">
                  {dateLabel}
                </p>
              )}
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="mt-2 font-display text-3xl font-bold leading-tight sm:text-4xl">
                {heading}
              </h1>
              {hasManySubjects && (
                <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-black text-muted-foreground">
                  {scheduleRows.length} mục
                </span>
              )}
            </div>
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
                    multiple
                    accept="image/png,image/jpeg,image/webp,application/pdf,.pdf"
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
                    multiple
                    accept="image/png,image/jpeg,image/webp,application/pdf,.pdf"
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

      <div className={`mt-3 grid min-h-0 gap-3 md:grid-cols-2 ${hasManySubjects ? "xl:grid-cols-3" : ""}`}>
        {scheduleRows.map((row) => {
          const examImages = imageGroups.get(createImageKey(row.subject, "de")) ?? [];
          const answerImages = imageGroups.get(createImageKey(row.subject, "dap_an")) ?? [];
          const latestExamImage = examImages.at(-1);
          const latestAnswerImage = answerImages.at(-1);
          const isHot = Boolean(latestExamImage || latestAnswerImage);

          return (
            <article
              key={`${row.date}-${row.session}-${row.subject}`}
              className={`min-w-0 rounded-[1.25rem] border p-3 transition-colors ${
                isHot
                  ? "border-destructive/60 bg-gradient-to-br from-destructive/15 via-background to-tier-high-soft/40 shadow-[0_18px_45px_-30px_hsl(var(--destructive))] ring-2 ring-destructive/15"
                  : "border-border bg-card"
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
                      <span className="inline-flex h-7 animate-pulse items-center gap-1 rounded-full bg-destructive px-2.5 text-[10px] font-black text-destructive-foreground shadow-sm">
                        <Flame className="h-3 w-3" />
                        MỚI CẬP NHẬT
                      </span>
                    )}
                  </div>
                  <h3 className={`mt-1 break-words font-display font-bold leading-tight ${hasManySubjects ? "text-xl" : "text-2xl"}`}>
                    {row.subject}
                  </h3>
                </div>
              </div>

              <div className={`mt-2 grid gap-2 text-center ${hasManySubjects ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-3"}`}>
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

      {preview && typeof document !== "undefined" ? createPortal(
        <div
          className="fixed inset-0 z-[9999] grid h-dvh w-screen place-items-center overflow-hidden bg-foreground/60 p-3 backdrop-blur-md sm:p-5"
          role="dialog"
          aria-modal="true"
          onMouseDown={() => setPreview(null)}
        >
          <div
            className="grid h-[min(92dvh,920px)] w-full max-w-7xl grid-rows-[auto_1fr] overflow-hidden rounded-[1.5rem] border border-border bg-background shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex min-w-0 flex-col gap-3 border-b border-border bg-background/95 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                    {DOCUMENT_TYPE_LABELS[preview.documentType]}
                  </span>
                  <span className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-bold text-muted-foreground">
                    {preview.images.length} file
                  </span>
                </div>
                <h2 className="mt-2 truncate font-display text-2xl font-bold leading-tight sm:text-3xl">
                  {preview.subject}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activePreviewImage
                    ? `Cập nhật lúc: ${formatUpdatedAt(activePreviewImage.created_at)}`
                    : "Chưa có file được tải lên"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  aria-label="Đóng trình xem đề"
                  onClick={() => setPreview(null)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid min-h-0 bg-muted/25">
              {preview.images.length === 0 ? (
                <div className="m-4 grid place-items-center rounded-2xl border border-dashed border-border bg-background px-4 py-12 text-center text-sm text-muted-foreground">
                  Chưa có file {DOCUMENT_TYPE_LABELS[preview.documentType].toLowerCase()} cho môn này.
                </div>
              ) : activePreviewImage ? (
                <>
                  <div className="relative min-h-0 overflow-hidden bg-[#f7f7fb] p-3 sm:p-5">
                    {preview.images.length > 1 && !previewHasOnlyImages && (
                      <>
                        <button
                          type="button"
                          aria-label="Xem file trước"
                          onClick={() => movePreviewImage(-1)}
                          className="absolute left-3 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-sm backdrop-blur transition hover:bg-background"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Xem file tiếp theo"
                          onClick={() => movePreviewImage(1)}
                          className="absolute right-3 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-sm backdrop-blur transition hover:bg-background"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </>
                    )}

                    {previewHasOnlyImages && zoomedImage ? (
                      <figure className="relative h-full min-h-[58dvh] overflow-auto rounded-2xl border border-border bg-zinc-950 p-4">
                        <div className="sticky left-3 top-3 z-10 mb-3 flex w-fit flex-wrap items-center gap-2 rounded-full bg-background/95 p-1.5 shadow-sm backdrop-blur">
                          <button
                            type="button"
                            onClick={() => setZoomedImageId(null)}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-full px-3 text-xs font-black text-foreground transition hover:bg-muted"
                          >
                            <Minimize2 className="h-4 w-4" />
                            Thu nhỏ
                          </button>
                          <button
                            type="button"
                            onClick={() => updateZoomScale(zoomScale - 0.25)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground transition hover:bg-muted"
                            aria-label="Thu nhỏ ảnh"
                          >
                            <ZoomOut className="h-4 w-4" />
                          </button>
                          <span className="min-w-12 text-center text-xs font-black text-muted-foreground">
                            {Math.round(zoomScale * 100)}%
                          </span>
                          <button
                            type="button"
                            onClick={() => updateZoomScale(zoomScale + 0.25)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground transition hover:bg-muted"
                            aria-label="Phóng to ảnh"
                          >
                            <ZoomIn className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateZoomScale(1)}
                            className="inline-flex h-9 items-center justify-center rounded-full px-3 text-xs font-black text-foreground transition hover:bg-muted"
                          >
                            Vừa màn hình
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => void handleDeleteImage(zoomedImage)}
                              disabled={deletingImageId === zoomedImage.id}
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-black text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
                            >
                              {deletingImageId === zoomedImage.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              Xóa trang này
                            </button>
                          )}
                        </div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={zoomedImage.public_url}
                          alt={`${DOCUMENT_TYPE_LABELS[zoomedImage.document_type]} ${zoomedImage.subject}`}
                          className="mx-auto max-w-none rounded-xl bg-white shadow-2xl"
                          style={{ width: `${zoomScale * 100}%` }}
                          onClick={() => setZoomedImageId(null)}
                        />
                      </figure>
                    ) : previewHasOnlyImages ? (
                      <div className="flex h-full min-h-[58dvh] items-center gap-4 overflow-x-auto rounded-2xl border border-border bg-background/70 p-4">
                        {preview.images.map((image, index) => (
                          <figure
                            key={image.id}
                            className="group relative flex h-full min-w-[78%] max-w-[78%] shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm sm:min-w-[48%] sm:max-w-[48%] xl:min-w-[34%] xl:max-w-[34%]"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={image.public_url}
                              alt={`${DOCUMENT_TYPE_LABELS[image.document_type]} ${image.subject} trang ${index + 1}`}
                              className="max-h-full max-w-full cursor-zoom-in rounded-xl object-contain"
                              onClick={() => openZoom(image.id)}
                            />
                            <div className="absolute left-3 top-3 rounded-full bg-foreground/80 px-3 py-1 text-xs font-black text-background">
                              Trang {index + 1}
                            </div>
                            <button
                              type="button"
                              onClick={() => openZoom(image.id)}
                              className="absolute bottom-3 left-3 inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-background/95 px-3 text-xs font-black text-foreground opacity-100 shadow-sm backdrop-blur transition hover:bg-background sm:opacity-0 sm:group-hover:opacity-100"
                            >
                              <Maximize2 className="h-3.5 w-3.5" />
                              Phóng to
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => void handleDeleteImage(image)}
                                disabled={deletingImageId === image.id}
                                className="absolute right-3 top-3 inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-background/95 px-3 text-xs font-black text-destructive shadow-sm backdrop-blur transition hover:bg-destructive/10 disabled:opacity-50"
                              >
                                {deletingImageId === image.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                                Xóa trang {index + 1}
                              </button>
                            )}
                          </figure>
                        ))}
                      </div>
                    ) : (
                      <figure className="grid h-full w-full place-items-center">
                        {activePreviewImage.mime_type === "application/pdf" ? (
                          <object
                            data={activePreviewImage.public_url}
                            type="application/pdf"
                            className="h-full min-h-[58dvh] w-full rounded-2xl border border-border bg-background shadow-sm"
                          >
                            <div className="flex min-h-60 items-center justify-center gap-2 rounded-2xl border border-border bg-background text-sm font-bold text-muted-foreground">
                              <FileText className="h-4 w-4" />
                              Không thể xem PDF trong trình duyệt này.
                            </div>
                          </object>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={activePreviewImage.public_url}
                            alt={`${DOCUMENT_TYPE_LABELS[activePreviewImage.document_type]} ${activePreviewImage.subject}`}
                            className="max-h-full max-w-full rounded-xl bg-background object-contain shadow-sm"
                          />
                        )}
                      </figure>
                    )}
                  </div>
                  {isAdmin && !previewHasOnlyImages && (
                    <div className="border-t border-border bg-background p-3">
                      <button
                        type="button"
                        onClick={() => void handleDeleteImage(activePreviewImage)}
                        disabled={deletingImageId === activePreviewImage.id}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-destructive/30 px-4 text-xs font-black text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
                      >
                        {deletingImageId === activePreviewImage.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Xóa file đang chọn
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="m-4 grid place-items-center rounded-2xl border border-dashed border-border bg-background px-4 py-12 text-center text-sm text-muted-foreground">
                  Không tìm thấy file đang chọn.
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
