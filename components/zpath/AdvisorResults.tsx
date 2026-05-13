"use client";

import { Briefcase, Lightbulb, TrendingUp } from "lucide-react";
import type { RecommendationResult } from "@/lib/advisor-types";

// ── Score Bar ───────────────────────────────────────────────────────────────

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="font-bold">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ── Result Card ─────────────────────────────────────────────────────────────

function ResultCard({
  result,
  rank,
}: {
  result: RecommendationResult;
  rank: number;
}) {
  const { major, finalScore, academicFit, interestFit, careerGoalFit, personalityFit } = result;

  const scoreColor =
    finalScore >= 70
      ? "text-tier-high"
      : finalScore >= 50
        ? "text-tier-mid"
        : "text-tier-low";

  return (
    <div
      className="group rounded-2xl border-2 border-border bg-card p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md sm:p-6"
      style={{ animationDelay: `${rank * 80}ms` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
              #{rank}
            </span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              {major.category}
            </span>
          </div>
          <h3 className="font-display text-xl font-bold">{major.name}</h3>
        </div>
        <div className="text-right">
          <div className={`font-display text-3xl font-bold ${scoreColor}`}>
            {finalScore}
          </div>
          <div className="text-xs font-medium text-muted-foreground">/ 100</div>
        </div>
      </div>

      {/* Description */}
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        {major.description}
      </p>

      {/* Score Breakdown */}
      <div className="mt-5 space-y-2.5">
        <ScoreBar label="Học lực" value={academicFit} color="bg-blue-500" />
        <ScoreBar label="Sở thích" value={interestFit} color="bg-emerald-500" />
        <ScoreBar label="Mục tiêu nghề nghiệp" value={careerGoalFit} color="bg-amber-500" />
        <ScoreBar label="Tính cách" value={personalityFit} color="bg-purple-500" />
      </div>

      {/* Career Paths */}
      <div className="mt-5">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-foreground/80">
          <Briefcase className="h-3.5 w-3.5" /> Nghề nghiệp đầu ra
        </div>
        <div className="flex flex-wrap gap-1.5">
          {major.careerPaths.map((path) => (
            <span
              key={path}
              className="rounded-lg bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary"
            >
              {path}
            </span>
          ))}
        </div>
      </div>

      {/* Skills to Improve */}
      <div className="mt-4">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-foreground/80">
          <TrendingUp className="h-3.5 w-3.5" /> Kỹ năng nên rèn luyện
        </div>
        <div className="flex flex-wrap gap-1.5">
          {major.skillsToImprove.map((skill) => (
            <span
              key={skill}
              className="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Results Grid ────────────────────────────────────────────────────────────

export function AdvisorResults({ results }: { results: RecommendationResult[] }) {
  if (!results.length) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center">
        <Lightbulb className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm text-muted-foreground">
          Không tìm được ngành phù hợp. Hãy thử điều chỉnh sở thích hoặc mục tiêu.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {/* Top 1 — full width */}
      <div className="md:col-span-2">
        <ResultCard result={results[0]} rank={1} />
      </div>
      {/* Remaining */}
      {results.slice(1).map((result, i) => (
        <ResultCard key={result.major.id} result={result} rank={i + 2} />
      ))}
    </div>
  );
}
