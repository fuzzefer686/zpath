"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import type {
  FilterGroup,
  UnimapFacets,
} from "@/hooks/useUnimapFilters";

interface UnimapFilterPanelProps {
  facets: UnimapFacets;
  selected: Record<FilterGroup, string[]>;
  onToggle: (group: FilterGroup, value: string) => void;
}

const GROUP_META: { group: FilterGroup; label: string; collapseAfter?: number }[] = [
  { group: "regions", label: "Khu vực" },
  { group: "types", label: "Loại trường" },
  { group: "fields", label: "Khối ngành", collapseAfter: 8 },
];

export function UnimapFilterPanel({ facets, selected, onToggle }: UnimapFilterPanelProps) {
  return (
    <div className="space-y-7">
      {GROUP_META.map(({ group, label, collapseAfter }) => (
        <FilterGroupBlock
          key={group}
          group={group}
          label={label}
          items={facets[group]}
          selected={selected[group]}
          onToggle={onToggle}
          collapseAfter={collapseAfter}
        />
      ))}
    </div>
  );
}

function FilterGroupBlock({
  group,
  label,
  items,
  selected,
  onToggle,
  collapseAfter,
}: {
  group: FilterGroup;
  label: string;
  items: UnimapFacets[FilterGroup];
  selected: string[];
  onToggle: (group: FilterGroup, value: string) => void;
  collapseAfter?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!items.length) return null;

  const canCollapse = typeof collapseAfter === "number" && items.length > collapseAfter;
  const visibleItems = canCollapse && !expanded ? items.slice(0, collapseAfter) : items;

  return (
    <div>
      <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </h3>
      <ul className="space-y-1">
        {visibleItems.map((item) => {
          const isChecked = selected.includes(item.value);
          return (
            <li key={item.value}>
              <button
                type="button"
                onClick={() => onToggle(group, item.value)}
                aria-pressed={isChecked}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/60"
              >
                <span
                  className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors ${
                    isChecked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background"
                  }`}
                >
                  {isChecked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate ${
                    isChecked ? "font-semibold text-foreground" : "text-foreground/80"
                  }`}
                >
                  {item.value}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {item.count}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {canCollapse ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 px-2 text-xs font-semibold text-primary hover:underline"
        >
          {expanded ? "Thu gọn" : `Xem thêm ${items.length - (collapseAfter ?? 0)}`}
        </button>
      ) : null}
    </div>
  );
}
