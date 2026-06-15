"use client";

import { useCallback, useMemo, useState } from "react";

import type { University } from "@/data/universities";
import { cityToRegion, VN_REGIONS } from "@/lib/vn-regions";

export type UnimapSort = "default" | "az" | "za";
export type FilterGroup = "regions" | "types" | "fields";

export interface FacetItem {
  value: string;
  count: number;
}

export interface UnimapFacets {
  regions: FacetItem[];
  types: FacetItem[];
  fields: FacetItem[];
}

export interface ActiveFilterChip {
  group: FilterGroup;
  value: string;
}

export interface UseUnimapFilters {
  query: string;
  setQuery: (value: string) => void;
  regions: string[];
  types: string[];
  fields: string[];
  sort: UnimapSort;
  setSort: (value: UnimapSort) => void;
  toggle: (group: FilterGroup, value: string) => void;
  removeFilter: (group: FilterGroup, value: string) => void;
  reset: () => void;
  filtered: University[];
  facets: UnimapFacets;
  activeChips: ActiveFilterChip[];
  activeCount: number;
  hasActiveFilters: boolean;
}

function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function buildFacet(counts: Map<string, number>, order?: readonly string[]): FacetItem[] {
  const items = [...counts.entries()].map(([value, count]) => ({ value, count }));
  if (order) {
    return order
      .filter((value) => counts.has(value))
      .map((value) => ({ value, count: counts.get(value) ?? 0 }));
  }
  return items.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, "vi"));
}

export function useUnimapFilters(universities: University[]): UseUnimapFilters {
  const [query, setQuery] = useState("");
  const [regions, setRegions] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [sort, setSort] = useState<UnimapSort>("default");

  const toggle = useCallback((group: FilterGroup, value: string) => {
    const setter =
      group === "regions" ? setRegions : group === "types" ? setTypes : setFields;
    setter((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }, []);

  const removeFilter = useCallback(
    (group: FilterGroup, value: string) => toggle(group, value),
    [toggle],
  );

  const reset = useCallback(() => {
    setQuery("");
    setRegions([]);
    setTypes([]);
    setFields([]);
  }, []);

  // Facets are derived from the full list so the counts stay stable regardless
  // of the filters currently applied (mirrors UniPath's "(n)" facet counts).
  const facets = useMemo<UnimapFacets>(() => {
    const regionCounts = new Map<string, number>();
    const typeCounts = new Map<string, number>();
    const fieldCounts = new Map<string, number>();

    for (const university of universities) {
      const region = cityToRegion(university.city);
      if (region) regionCounts.set(region, (regionCounts.get(region) ?? 0) + 1);

      if (university.type) {
        typeCounts.set(university.type, (typeCounts.get(university.type) ?? 0) + 1);
      }

      for (const tag of university.tags ?? []) {
        if (tag) fieldCounts.set(tag, (fieldCounts.get(tag) ?? 0) + 1);
      }
    }

    return {
      regions: buildFacet(regionCounts, VN_REGIONS),
      types: buildFacet(typeCounts),
      fields: buildFacet(fieldCounts),
    };
  }, [universities]);

  const filtered = useMemo(() => {
    const normalizedQuery = normalizeForSearch(query);
    const regionSet = new Set(regions);
    const typeSet = new Set(types);
    const fieldSet = new Set(fields);

    const result = universities.filter((university) => {
      if (normalizedQuery) {
        const haystack = normalizeForSearch(
          [university.code, university.name, university.city ?? "", ...(university.tags ?? [])].join(" "),
        );
        if (!haystack.includes(normalizedQuery)) return false;
      }

      if (regionSet.size) {
        const region = cityToRegion(university.city);
        if (!region || !regionSet.has(region)) return false;
      }

      if (typeSet.size && (!university.type || !typeSet.has(university.type))) return false;

      if (fieldSet.size) {
        const hasField = (university.tags ?? []).some((tag) => fieldSet.has(tag));
        if (!hasField) return false;
      }

      return true;
    });

    if (sort === "az") {
      return [...result].sort((a, b) => a.name.localeCompare(b.name, "vi"));
    }
    if (sort === "za") {
      return [...result].sort((a, b) => b.name.localeCompare(a.name, "vi"));
    }
    return result;
  }, [universities, query, regions, types, fields, sort]);

  const activeChips = useMemo<ActiveFilterChip[]>(
    () => [
      ...regions.map((value) => ({ group: "regions" as const, value })),
      ...types.map((value) => ({ group: "types" as const, value })),
      ...fields.map((value) => ({ group: "fields" as const, value })),
    ],
    [regions, types, fields],
  );

  const activeCount = activeChips.length;
  const hasActiveFilters = activeCount > 0 || query.trim().length > 0;

  return {
    query,
    setQuery,
    regions,
    types,
    fields,
    sort,
    setSort,
    toggle,
    removeFilter,
    reset,
    filtered,
    facets,
    activeChips,
    activeCount,
    hasActiveFilters,
  };
}
