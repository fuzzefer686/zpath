import { ExamScheduleBoard } from "@/components/news/ExamScheduleBoard";
import type { StaticExamAnswerRoute } from "@/lib/static-news-routes";

type ExamAnswerLandingPageProps = {
  route: StaticExamAnswerRoute;
};

export function ExamAnswerLandingPage({ route }: ExamAnswerLandingPageProps) {
  return (
    <main className="overflow-x-hidden bg-card text-foreground">
      <section className="relative overflow-x-hidden">
        <div className="absolute inset-0 bg-mesh opacity-60" />
        <div className="absolute inset-0 grid-dots opacity-25" />

        <div className="container-page relative py-3 sm:py-4">
          <ExamScheduleBoard
            routeSlug={route.slug}
            scheduleRows={route.scheduleRows}
            heading={`Bảng cập nhật ${route.dayLabel.toLowerCase()}`}
            dateLabel={route.dateLabel}
          />
        </div>
      </section>
    </main>
  );
}
