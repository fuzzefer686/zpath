"use client";

import { useMemo, useState } from "react";
import { GraduationCap, Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UniversityCard } from "@/components/zpath/UniversityCard";
import { UNIVERSITIES } from "@/data/universities";

const SUGGESTED = ["HUST", "FTU", "NEU", "HNUE", "VNU", "UEH"];

export default function UniMapPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return UNIVERSITIES;

    return UNIVERSITIES.filter(
      (university) =>
        university.code.toLowerCase().includes(normalizedQuery) ||
        university.name.toLowerCase().includes(normalizedQuery) ||
        university.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery)) ||
        university.city.toLowerCase().includes(normalizedQuery) ||
        university.majors.some((major) => major.toLowerCase().includes(normalizedQuery)),
    );
  }, [query]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-14 md:py-20">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-secondary/20 blur-3xl" />

        <div className="container-page relative">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              UniMap · Khám phá trường ĐH
            </div>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight md:text-5xl">
              Khám phá <span className="text-gradient-hero">các trường</span> phù hợp với bạn
            </h1>
            <p className="mt-3 text-base text-muted-foreground md:text-lg">
              Tổng hợp thông tin tuyển sinh, ngành mạnh và highlight của các trường đại học hàng đầu Việt Nam.
            </p>

            <div className="relative mx-auto mt-8 max-w-2xl">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm theo tên trường, mã trường, ngành..."
                className="h-14 rounded-2xl border-2 pl-12 pr-4 text-base shadow-md focus-visible:ring-primary"
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Gợi ý:</span>
              {SUGGESTED.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setQuery(suggestion)}
                  className="rounded-full border-2 border-border bg-background px-3 py-1 text-xs font-bold transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold md:text-3xl">
              {query ? `Kết quả cho "${query}"` : "Tất cả trường"}
            </h2>
            <p className="text-sm text-muted-foreground">{filtered.length} trường được hiển thị</p>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/30 py-16 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 font-display text-xl font-bold">Không tìm thấy trường nào</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Hãy thử tìm với từ khóa khác, hoặc chọn một gợi ý ở trên.
            </p>
            <Button onClick={() => setQuery("")} className="mt-6" variant="hero">
              Xem tất cả trường
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((university) => (
              <UniversityCard key={university.code} uni={university} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
