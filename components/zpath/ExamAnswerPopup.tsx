"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, FileText, Flame, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { STATIC_EXAM_ANSWER_ROUTES } from "@/lib/static-news-routes";

export function ExamAnswerPopup() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <div
        className="animate-fade-up rounded-[1.5rem] border border-border bg-card/95 p-4 shadow-md backdrop-blur"
        style={{ animationDelay: "390ms" }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold">Đề thi - đáp án gợi ý</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Mở nhanh lịch cập nhật ngày 11/6 và 12/6.
              </p>
            </div>
          </div>
          <Button type="button" variant="coral" onClick={() => setIsOpen(true)} className="w-full sm:w-auto">
            Xem đề đáp án
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
                    Chọn ngày để xem đề thi và đáp án gợi ý
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
                <Link
                  key={route.href}
                  href={route.href}
                  className="group rounded-[1.5rem] border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {route.dayLabel}
                      </div>
                      <h3 className="mt-4 font-display text-2xl font-bold leading-tight">
                        {index === 0 ? "Đợt cập nhật đầu" : "Đợt cập nhật tiếp theo"}
                      </h3>
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
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
