"use client";

import type { GenericSubjectCombination } from "@/src/lib/admission-engine/generic";

type GenericSubjectCombinationPickerProps = {
  combinations: GenericSubjectCombination[];
  selectedCode: string;
  onSelect: (code: string) => void;
};

export function GenericSubjectCombinationPicker({
  combinations,
  selectedCode,
  onSelect,
}: GenericSubjectCombinationPickerProps) {
  if (!combinations.length) return null;

  return (
    <div className="space-y-2">
      <span className="text-sm font-semibold">Tổ hợp xét tuyển</span>
      <div className="flex flex-wrap gap-2">
        {combinations.map((combination) => {
          const isSelected = combination.code === selectedCode;
          const hasDoubledWeight = combination.subjects.some(
            (subject) => (subject.weight ?? 1) > 1,
          );

          return (
            <button
              key={combination.code}
              type="button"
              onClick={() => onSelect(combination.code)}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-foreground hover:bg-muted/40"
              }`}
            >
              {hasDoubledWeight ? (
                <strong>{combination.code}</strong>
              ) : (
                combination.code
              )}
              {combination.label !== combination.code ? (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({combination.label})
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Tổ hợp in đậm có môn với hệ số cao hơn.
      </p>
    </div>
  );
}
