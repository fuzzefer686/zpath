"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CareerRankingItem } from "@/src/types/zpath";

type EvaluationResult = {
  id: string;
  ranking: CareerRankingItem[];
  student_summary: unknown;
  next_steps_30_days: string[];
  warning: string;
};

type EvaluationResponse =
  | { success: true; evaluation: EvaluationResult }
  | { success: false; error?: { code?: string } };

type LoadState = "loading" | "ready" | "not_found" | "error";

export default function ResultPage() {
  const params = useParams<{ id: string }>();
  const evaluationId = params.id;
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadEvaluation() {
      try {
        const response = await fetch(`/api/evaluation/${evaluationId}`, {
          cache: "no-store",
        });

        if (response.status === 404) {
          if (!cancelled) setLoadState("not_found");
          return;
        }

        if (!response.ok) {
          throw new Error("Evaluation request failed");
        }

        const data = (await response.json()) as EvaluationResponse;

        if (cancelled) return;

        if (!data.success) {
          setLoadState(data.error?.code === "EVALUATION_NOT_FOUND" ? "not_found" : "error");
          return;
        }

        setEvaluation(data.evaluation);
        setLoadState("ready");
      } catch {
        if (!cancelled) setLoadState("error");
      }
    }

    loadEvaluation();

    return () => {
      cancelled = true;
    };
  }, [evaluationId]);

  if (loadState === "loading") return <ResultSkeleton />;

  if (loadState === "not_found") {
    return (
      <ResultShell>
        <Card className="mx-auto max-w-xl">
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
            <CardTitle>Không tìm thấy kết quả</CardTitle>
            <CardDescription>
              Kết quả này có thể chưa được tạo xong hoặc đường dẫn không chính xác.
            </CardDescription>
          </CardHeader>
        </Card>
      </ResultShell>
    );
  }

  if (loadState === "error" || !evaluation) {
    return (
      <ResultShell>
        <Card className="mx-auto max-w-xl">
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
            <CardTitle>Chưa thể tải kết quả</CardTitle>
            <CardDescription>
              Vui lòng thử lại sau hoặc mở lại đường dẫn kết quả từ ZPath.
            </CardDescription>
          </CardHeader>
        </Card>
      </ResultShell>
    );
  }

  const topCareers = evaluation.ranking.slice(0, 3);

  return (
    <ResultShell>
      <section className="border-b border-border bg-muted/30 py-12 sm:py-16">
        <div className="container-page">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold uppercase text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Kết quả phân tích
            </div>
            <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Top nhóm nghề phù hợp với bạn
            </h1>
            <p className="mt-4 text-muted-foreground">
              Dựa trên hồ sơ khảo sát và tiêu chí chấm điểm của ZPath MVP.
            </p>
          </div>
        </div>
      </section>

      <section className="py-10 sm:py-14">
        <div className="container-page space-y-8">
          <div className="grid gap-5 lg:grid-cols-3">
            {topCareers.map((career, index) => (
              <CareerResultCard
                key={career.career_group}
                career={career}
                rank={index + 1}
              />
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Các bước nên làm trong 30 ngày tới</CardTitle>
              <CardDescription>
                Những hành động nhỏ giúp bạn kiểm chứng mức độ phù hợp.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="grid gap-3 sm:grid-cols-2">
                {evaluation.next_steps_30_days.map((step, index) => (
                  <li
                    key={`${step}-${index}`}
                    className="rounded-lg border bg-background p-4 text-sm leading-relaxed"
                  >
                    <span className="mr-2 font-bold text-primary">
                      {index + 1}.
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <p className="rounded-lg border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
            {evaluation.warning}
          </p>
        </div>
      </section>
    </ResultShell>
  );
}

function CareerResultCard({
  career,
  rank,
}: {
  career: CareerRankingItem;
  rank: number;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            #{rank}
          </span>
          <span className="font-display text-3xl font-bold">
            {career.fit_percentage}%
          </span>
        </div>
        <CardTitle className="leading-tight">{career.career_group}</CardTitle>
        <CardDescription>{career.fit_level}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ScoreBar value={career.fit_percentage} />

        <ResultList title="Lý do nổi bật" items={career.top_reasons} />
        <ResultList title="Điểm cần lưu ý" items={career.risks} />

        <div>
          <h3 className="text-sm font-bold">Khuyến nghị</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {career.recommendation}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreBar({ value }: { value: number }) {
  const clampedValue = Math.max(0, Math.min(value, 100));

  return (
    <div className="space-y-2">
      <div className="h-3 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-primary transition-all duration-700"
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

function ResultList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-bold">{title}</h3>
      <ul className="mt-2 space-y-2">
        {items.map((item, index) => (
          <li
            key={`${item}-${index}`}
            className="text-sm leading-relaxed text-muted-foreground"
          >
            - {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResultSkeleton() {
  return (
    <ResultShell>
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 font-medium">Đang tải kết quả...</p>
        </div>
      </main>
    </ResultShell>
  );
}

function ResultShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background text-foreground">{children}</div>;
}
