"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Layers, Search, Sparkles, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/app/lib/supabase";
import type { Major } from "@/types/majorly";

const SUGGESTED = ["Công nghệ Thông tin", "Marketing", "Y khoa", "Sư phạm Toán"];
const GRADIENTS = [
  "from-orange-500 to-pink-500",
  "from-emerald-500 to-cyan-500",
  "from-indigo-500 to-fuchsia-500",
  "from-amber-500 to-red-500",
  "from-sky-500 to-blue-600",
  "from-rose-500 to-purple-600",
  "from-lime-500 to-emerald-600",
  "from-teal-500 to-indigo-600",
];

export default function MajorlyPage() {
  const [query, setQuery] = useState("");
  const [majors, setMajors] = useState<Major[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function fetchMajors() {
      try {
        const { data, error } = await supabase.from("majors").select("*").order("name");
        if (error) throw error;
        if (!isCancelled) {
          setMajors((data ?? []) as Major[]);
        }
      } catch (err) {
        console.error("Error fetching majors:", err);
        if (!isCancelled) setError(true);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    void fetchMajors();
    return () => {
      isCancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return majors;

    return majors.filter(
      (major) =>
        major.name.toLowerCase().includes(normalizedQuery) ||
        major.code.toLowerCase().includes(normalizedQuery) ||
        (major.category && major.category.toLowerCase().includes(normalizedQuery)) ||
        (major.tags && major.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))),
    );
  }, [query, majors]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden bg-gradient-to-br from-accent/10 via-background to-primary/10 py-14 md:py-20">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />

        <div className="container-page relative">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-accent">
              <Sparkles className="h-3.5 w-3.5" /> Majorly · Khám phá ngành học
            </div>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight md:text-5xl">
              Chọn đúng <span className="text-gradient-hero">ngành học</span> không sai con đường
            </h1>
            <p className="mt-3 text-base text-muted-foreground md:text-lg">
              Tra cứu chương trình đào tạo, học phí, tỉ lệ có việc và so sánh ngành học bằng Matrix.
            </p>

            <div className="relative mx-auto mt-8 max-w-2xl">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm theo tên ngành, mã ngành, lĩnh vực..."
                className="h-14 rounded-2xl border-2 pl-12 pr-4 text-base shadow-md focus-visible:ring-accent"
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Gợi ý:</span>
              {SUGGESTED.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setQuery(suggestion)}
                  className="rounded-full border-2 border-border bg-background px-3 py-1 text-xs font-bold transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <div className="mt-8">
              <Button asChild variant="hero" size="lg">
                <Link href="/majorly/compare">
                  <Layers className="h-4 w-4" /> So sánh 2 ngành
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold md:text-3xl">
              {query ? `Kết quả cho "${query}"` : "Tất cả ngành học"}
            </h2>
            <p className="text-sm text-muted-foreground">{filtered.length} ngành được hiển thị</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="mt-3 text-sm text-muted-foreground">Đang tải ngành học...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-8 text-center">
            <p className="text-sm font-semibold text-destructive">Không thể tải dữ liệu ngành. Vui lòng thử lại.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/30 py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 font-display text-xl font-bold">Không tìm thấy ngành nào</h3>
            <Button onClick={() => setQuery("")} className="mt-6" variant="hero">
              Xem tất cả ngành
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((major, index) => (
              <Link
                key={major.id}
                href={`/majorly/${major.code.toLowerCase()}`}
                className={`group relative overflow-hidden rounded-3xl border-2 border-border bg-gradient-to-br ${GRADIENTS[index % GRADIENTS.length]} p-5 text-white shadow-md transition-all hover:-translate-y-1 hover:shadow-glow`}
              >
                <div className="absolute inset-0 bg-foreground/10 opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative">
                  <div className="text-xs font-bold uppercase tracking-widest opacity-80">{major.category || "Ngành học"}</div>
                  <h3 className="mt-1 font-display text-2xl font-extrabold leading-tight">{major.name}</h3>
                  <p className="mt-2 line-clamp-2 text-sm opacity-90">{major.description}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {(major.tags ?? []).slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold backdrop-blur">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold">
                    Xem chi tiết <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
