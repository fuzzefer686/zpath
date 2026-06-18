"use client";

import type { ScoreComparisonResult } from "@/src/lib/admission-engine/generic";

type ScoreComparisonPanelProps = {
  comparison: ScoreComparisonResult | null;
  userScoreLabel?: string;
};

function getStatusClass(status: ScoreComparisonResult["status"]) {
  if (status === "above") return "text-tier-high";
  if (status === "below") return "text-tier-low";
  if (status === "equal") return "text-muted-foreground";
  return "text-muted-foreground";
}

export function ScoreComparisonPanel({
  comparison,
  userScoreLabel = "Điểm của bạn",
}: ScoreComparisonPanelProps) {
  if (!comparison) return null;

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            {userScoreLabel}
          </div>
          <div className="mt-1 text-lg font-bold">
            {comparison.score !== null
              ? `${comparison.score.toFixed(2)}/30`
              : "—"}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Điểm chuẩn {comparison.benchmarkYear}
          </div>
          <div className="mt-1 text-lg font-bold">
            {comparison.previousYearCutoff !== null
              ? `${comparison.previousYearCutoff.toFixed(2)}/30`
              : "Chưa có"}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Chênh lệch
          </div>
          <div className={`mt-1 text-lg font-bold ${getStatusClass(comparison.status)}`}>
            {comparison.difference !== null
              ? `${comparison.difference > 0 ? "+" : ""}${comparison.difference.toFixed(2)}`
              : "—"}
          </div>
        </div>
      </div>
      <p className={`mt-3 font-semibold ${getStatusClass(comparison.status)}`}>
        {comparison.message}
      </p>
    </div>
  );
}
