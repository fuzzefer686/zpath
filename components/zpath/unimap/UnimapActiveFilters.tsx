"use client";

import { X } from "lucide-react";

import type { ActiveFilterChip, FilterGroup } from "@/hooks/useUnimapFilters";

interface UnimapActiveFiltersProps {
  chips: ActiveFilterChip[];
  onRemove: (group: FilterGroup, value: string) => void;
  onClear: () => void;
}

export function UnimapActiveFilters({ chips, onRemove, onClear }: UnimapActiveFiltersProps) {
  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={`${chip.group}-${chip.value}`}
          type="button"
          onClick={() => onRemove(chip.group, chip.value)}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 py-1 pl-3 pr-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
        >
          {chip.value}
          <X className="h-3.5 w-3.5" />
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        Xóa tất cả
      </button>
    </div>
  );
}
