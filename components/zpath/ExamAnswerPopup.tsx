"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, FileText, Flame, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { STATIC_EXAM_ANSWER_ROUTES } from "@/lib/static-news-routes";

type ExamImageSummary = {
  id: string;
  route_slug: string;
  created_at: string;
};

type RouteUpdateSummary = {
  count: number;
  latestAt?: string;
};

export function ExamAnswerPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [updateSummary, setUpdateSummary] = useState<Record<string, RouteUpdateSummary>>({});

  const hasFreshExamFiles = Object.values(updateSummary).some((summary) => summary.count > 0);
  const totalFreshFiles = Object.values(updateSummary).reduce((total, summary) => total + summary.count, 0);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    let isCancelled = false;

    async function loadExamUpdates() {
      const summaries = await Promise.all(
        STATIC_EXAM_ANSWER_ROUTES.map(async (route) => {
          try {
            const response = await fetch(`/api/exam/images?routeSlug=${encodeURIComponent(route.slug)}`, {
              cache: "no-store",
            });
            const data = (await response.json()) as { images?: ExamImageSummary[] };
            const images = data.images ?? [];
            return [
              route.slug,
              {
                count: images.length,
                latestAt: images[0]?.created_at,
              },
            ] as const;
          } catch (error) {
            console.warn("Không thể kiểm tra trạng thái đề mới trên homepage.", error);
            return [route.slug, { count: 0 }] as const;
          }
        }),
      );

      if (!isCancelled) {
        setUpdateSummary(Object.fromEntries(summaries));
      }
    }

    void loadExamUpdates();
    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <>
      <div
        className={`relative animate-fade-up overflow-hidden rounded-[1.5rem] border p-4 shadow-md backdrop-blur transition-all ${
          hasFreshExamFiles
            ? "border-destructive/60 bg-gradient-to-br from-destructive/15 via-card to-accent/10 shadow-[0_24px_70px_-38px_hsl(var(--destructive))] ring-2 ring-destructive/15"
            : "border-border bg-card/95"
        }`}
        style={{ animationDelay: "390ms" }}
      >
        {hasFreshExamFiles && (
          <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-destructive to-transparent" />
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                hasFreshExamFiles
                  ? "animate-pulse bg-destructive text-destructive-foreground shadow-coral"
                  : "bg-accent/10 text-accent"
              }`}
            >
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-lg font-bold">Xem đề & đáp án</h2>
                {hasFreshExamFiles && (
                  <span className="rounded-full bg-destructive px-2.5 py-1 text-[10px] font-black uppercase text-destructive-foreground">
                    Mới cập nhật
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {hasFreshExamFiles
                  ? `${totalFreshFiles} file đề/đáp án đã lên, mở nhanh ngày 11/6 và 12/6.`
                  : "Mở nhanh lịch cập nhật ngày 11/6 và 12/6."}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant={hasFreshExamFiles ? "hero" : "coral"}
            onClick={() => setIsOpen(true)}
            className="w-full sm:w-auto"
          >
            {hasFreshExamFiles ? "Xem đề mới" : "Xem đề & đáp án"}
          </Button>
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/45 p-3 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exam-answer-popup-title"
          onMouseDown={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-border bg-background shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="relative overflow-hidden border-b border-border bg-card p-5 sm:p-6">
              <div className="absolute inset-0 bg-mesh opacity-70" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/80 px-3 py-1.5 text-xs font-bold text-primary">
                    <FileText className="h-3.5 w-3.5" />
                    Cập nhật mùa thi
                  </div>
                  <h2 id="exam-answer-popup-title" className="mt-4 font-display text-3xl font-bold leading-tight">
                    Chọn ngày để xem đề & đáp án
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Mỗi trang có lịch cập nhật theo môn, trạng thái đáp án và lối tắt sang Scoring.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Đóng popup đề đáp án"
                  onClick={() => setIsOpen(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
              {STATIC_EXAM_ANSWER_ROUTES.map((route, index) => (
                (() => {
                  const summary = updateSummary[route.slug];
                  const isFresh = Boolean(summary?.count);

                  return (
                    <Link
                      key={route.href}
                      href={route.href}
                      className={`group rounded-[1.5rem] border p-5 transition-all hover:-translate-y-1 hover:shadow-md ${
                        isFresh
                          ? "border-destructive/60 bg-gradient-to-br from-destructive/15 via-card to-card ring-2 ring-destructive/10 hover:border-destructive"
                          : "border-border bg-card hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
                              isFresh
                                ? "bg-destructive text-destructive-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <CalendarDays className="h-3.5 w-3.5" />
                            {route.dayLabel}
                          </div>
                          <h3 className="mt-4 font-display text-2xl font-bold leading-tight">
                            {index === 0 ? "Đợt cập nhật đầu" : "Đợt cập nhật tiếp theo"}
                          </h3>
                          {isFresh && (
                            <p className="mt-2 inline-flex rounded-full bg-destructive/10 px-3 py-1 text-xs font-black text-destructive">
                              {summary?.count} file mới
                            </p>
                          )}
                        </div>
                        <ArrowRight className="mt-1 h-5 w-5 text-primary transition-transform group-hover:translate-x-1" />
                      </div>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{route.description}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {route.subjects.map((subject) => (
                          <span
                            key={subject.name}
                            className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold"
                          >
                            {subject.name}
                          </span>
                        ))}
                      </div>
                    </Link>
                  );
                })()
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
