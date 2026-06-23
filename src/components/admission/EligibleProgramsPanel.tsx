"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AofProgramSuggestion } from "@/src/lib/admission-engine/generic/suggestEligiblePrograms";

type EligibleProgramsPanelProps = {
  suggestions: AofProgramSuggestion[];
  benchmarkYear?: number;
};

function getDifferenceClass(diff: number) {
  if (diff > 0) return "text-tier-high";
  if (diff < 0) return "text-tier-low";
  return "text-muted-foreground";
}

function getCampusLabel(campus: AofProgramSuggestion["campus"]) {
  if (campus === "MB_HANOI") return "Miền Bắc (Hà Nội)";
  if (campus === "MB_HOALAC") return "Miền Bắc (Hòa Lạc)";
  if (campus === "MN_HCMC") return "Miền Nam (TP.HCM)";
  return "Chưa xác định";
}

export function EligibleProgramsPanel({
  suggestions,
  benchmarkYear = 2025,
}: EligibleProgramsPanelProps) {
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const sortedSuggestions = useMemo(
    () =>
      [...suggestions].sort((a, b) =>
        sortOrder === "desc" ? b.difference - a.difference : a.difference - b.difference,
      ),
    [suggestions, sortOrder],
  );

  if (!suggestions.length) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
        <p className="font-semibold text-foreground">
          Danh sách ngành có thể đỗ ({benchmarkYear})
        </p>
        <p className="mt-2 text-muted-foreground">
          Hiện chưa có ngành nào đạt hoặc bằng điểm chuẩn tham chiếu.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
      <p className="font-semibold text-foreground">
        Danh sách ngành có thể đỗ ({benchmarkYear})
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Chênh lệch = Điểm của bạn - Điểm chuẩn {benchmarkYear}.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Sắp xếp hiệu số:</span>
        <Button
          type="button"
          size="sm"
          variant={sortOrder === "desc" ? "default" : "outline"}
          onClick={() => setSortOrder("desc")}
        >
          Cao đến thấp
        </Button>
        <Button
          type="button"
          size="sm"
          variant={sortOrder === "asc" ? "default" : "outline"}
          onClick={() => setSortOrder("asc")}
        >
          Thấp đến cao
        </Button>
      </div>

      <div className="mt-3 space-y-2">
        {sortedSuggestions.map((item) => (
          <div
            key={`${item.programCode2025}-${item.programCode2026 ?? "unknown"}`}
            className="rounded-md border border-border bg-background p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-foreground">{item.programName}</p>
                <p className="text-xs text-muted-foreground">
                  Mã 2025: {item.programCode2025}
                  {item.programCode2026 ? ` • Mã 2026: ${item.programCode2026}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.majorName} • {getCampusLabel(item.campus)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase text-muted-foreground">Hiệu số</p>
                <p className={`text-base font-bold ${getDifferenceClass(item.difference)}`}>
                  {item.difference > 0 ? "+" : ""}
                  {item.difference.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="mt-2 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
              <p>
                Điểm của bạn: <span className="font-semibold text-foreground">{item.userScore.toFixed(2)}/30</span>
              </p>
              <p>
                Điểm chuẩn {benchmarkYear}:{" "}
                <span className="font-semibold text-foreground">
                  {item.benchmark2025.toFixed(2)}/30
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
