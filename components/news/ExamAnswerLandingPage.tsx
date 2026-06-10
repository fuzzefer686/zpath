import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ExamScheduleBoard } from "@/components/news/ExamScheduleBoard";
import type { StaticExamAnswerRoute } from "@/lib/static-news-routes";

type ExamAnswerLandingPageProps = {
  route: StaticExamAnswerRoute;
};

export function ExamAnswerLandingPage({ route }: ExamAnswerLandingPageProps) {
  return (
    <main className="min-h-dvh overflow-x-hidden bg-card text-foreground">
      <section className="relative min-h-dvh overflow-x-hidden">
        <div className="absolute inset-0 bg-mesh opacity-60" />
        <div className="absolute inset-0 grid-dots opacity-25" />

        <div className="container-page relative grid min-h-dvh grid-rows-[auto_1fr] gap-3 py-3 sm:gap-4 sm:py-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:items-stretch">
            <div className="rounded-[1.25rem] border border-border bg-background/92 p-4 shadow-sm backdrop-blur sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {route.dateLabel}
                  </div>
                  <h1 className="mt-3 max-w-4xl font-display text-3xl font-bold leading-[1.04] sm:text-4xl lg:text-5xl">
                    Đề thi và đáp án <span className="text-gradient-hero">{route.dayLabel}</span>
                  </h1>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button asChild variant="hero" size="sm">
                    <Link href="/scoring">
                      Tính điểm <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/advisor">Hỏi AI</Link>
                  </Button>
                </div>
              </div>
            </div>

            <aside className="rounded-[1.25rem] border border-border bg-background/92 p-4 shadow-sm backdrop-blur">
              <p className="text-xs font-bold text-primary">Tra nhanh trên trang</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {route.subjects.map((subject) => (
                  <div key={subject.name} className="grid grid-cols-[88px_1fr] items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5">
                    <div className="rounded-full bg-primary/10 px-2.5 py-1 text-center text-xs font-bold text-primary">
                      {subject.time}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-display text-base font-bold">{subject.name}</div>
                      <div className="truncate text-[11px] font-semibold text-muted-foreground">{subject.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>

          <ExamScheduleBoard routeSlug={route.slug} scheduleRows={route.scheduleRows} />
        </div>
      </section>
    </main>
  );
}
