"use client";

import { useEffect, useState } from "react";
import { GraduationCap, Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UniversityCard } from "@/components/zpath/UniversityCard";
import { UnimapActiveFilters } from "@/components/zpath/unimap/UnimapActiveFilters";
import { UnimapFilterDrawer } from "@/components/zpath/unimap/UnimapFilterDrawer";
import { UnimapFilterPanel } from "@/components/zpath/unimap/UnimapFilterPanel";
import { useUnimapFilters, type UnimapSort } from "@/hooks/useUnimapFilters";
import { supabase } from "@/app/lib/supabase";
import type { University } from "@/data/universities";
import { getAllUnimapUniversities } from "@/lib/unimap-visible-schools";

const SORT_OPTIONS: { value: UnimapSort; label: string }[] = [
  { value: "default", label: "Mặc định" },
  { value: "az", label: "Tên A → Z" },
  { value: "za", label: "Tên Z → A" },
];

export default function UniMapPage() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const {
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
  } = useUnimapFilters(universities);

  const selected = { regions, types, fields };

  useEffect(() => {
    let isCancelled = false;

    async function fetchUniversities() {
      try {
        const { data, error } = await supabase.from("schools").select("*").order("name");
        if (error) throw error;
        if (!isCancelled) setUniversities(getAllUnimapUniversities(data ?? []));
      } catch (err) {
        console.error("Error fetching schools:", err);
        if (!isCancelled) setUniversities(getAllUnimapUniversities());
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    void fetchUniversities();
    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-12 md:py-16">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-secondary/20 blur-3xl" />

        <div className="container-page relative">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              <GraduationCap className="h-3.5 w-3.5" />
              UniMap · Khám phá trường ĐH
            </div>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight md:text-5xl">
              Tìm <span className="text-gradient-hero">trường đại học</span> phù hợp với bạn
            </h1>
            <p className="mt-3 text-base text-muted-foreground md:text-lg">
              Lọc theo khu vực, loại trường và khối ngành để thu hẹp lựa chọn nhanh hơn.
            </p>

            <div className="relative mx-auto mt-7 max-w-2xl">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm theo tên trường, mã trường, ngành..."
                className="h-14 rounded-2xl border-2 pl-12 pr-4 text-base shadow-md focus-visible:ring-primary"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-10 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start lg:gap-8">
        {/* Desktop filter sidebar */}
        <aside className="sticky top-20 hidden lg:block">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Bộ lọc</h2>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={reset}
                className="text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Đặt lại
              </button>
            ) : null}
          </div>
          <UnimapFilterPanel facets={facets} selected={selected} onToggle={toggle} />
        </aside>

        <div className="min-w-0">
          <div className="mb-5 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold md:text-3xl">
                  {query ? `Kết quả cho "${query}"` : "Tất cả trường"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isLoading ? "Đang tải..." : `${filtered.length} trường được hiển thị`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-border bg-background px-3.5 py-2.5 text-sm font-bold transition-colors hover:border-primary lg:hidden"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Bộ lọc
                  {activeCount > 0 ? (
                    <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                      {activeCount}
                    </span>
                  ) : null}
                </button>

                <label className="sr-only" htmlFor="unimap-sort">
                  Sắp xếp
                </label>
                <select
                  id="unimap-sort"
                  value={sort}
                  onChange={(event) => setSort(event.target.value as UnimapSort)}
                  className="h-[42px] rounded-xl border-2 border-border bg-background px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {activeChips.length ? (
              <UnimapActiveFilters chips={activeChips} onRemove={removeFilter} onClear={reset} />
            ) : null}
          </div>

          {isLoading ? (
            <ResultsSkeleton />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/30 py-16 text-center">
              <GraduationCap className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 font-display text-xl font-bold">Không tìm thấy trường nào</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Hãy thử từ khóa khác hoặc bỏ bớt bộ lọc đang áp dụng.
              </p>
              <Button onClick={reset} className="mt-6" variant="hero">
                Xóa bộ lọc
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((university) => (
                <UniversityCard key={university.code} uni={university} />
              ))}
            </div>
          )}
        </div>
      </section>

      <UnimapFilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        facets={facets}
        selected={selected}
        onToggle={toggle}
        onReset={reset}
        resultCount={filtered.length}
        activeCount={activeCount}
      />
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-2xl border-2 border-border bg-card shadow-md"
        >
          <div className="h-40 animate-pulse bg-muted" />
          <div className="space-y-3 px-4 py-3.5">
            <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            <div className="flex gap-1.5 pt-1">
              <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
              <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
