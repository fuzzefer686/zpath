"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ClipboardList, Compass, RotateCcw } from "lucide-react";

import { SectionHeading } from "@/components/zpath/SectionHeading";
import { AdvisorForm } from "@/components/zpath/AdvisorForm";
import { AdvisorResults } from "@/components/zpath/AdvisorResults";
import { Button } from "@/components/ui/button";
import { useAdminEdit } from "@/components/zpath/AdminEditContext";
import type { RecommendationResult } from "@/lib/advisor-types";

export default function AdvisorPage() {
  const { isAdmin } = useAdminEdit();
  const [results, setResults] = useState<RecommendationResult[] | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleResult = (data: RecommendationResult[]) => {
    setResults(data);
    // Cuộn xuống kết quả sau khi render
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border bg-muted/30 py-16 sm:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="container-page relative">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary">
              <Compass className="h-3.5 w-3.5" />
              Tư vấn chọn ngành
            </div>
            <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Tìm ngành học{" "}
              <span className="text-gradient-hero">phù hợp nhất</span>{" "}
              với bạn
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Nhập thông tin học lực, sở thích và mục tiêu nghề nghiệp.
              Hệ thống sẽ phân tích và gợi ý top 5 ngành phù hợp nhất.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button asChild variant="outline">
                <Link href="/advisor/contribute">Đóng góp trọng số ngành</Link>
              </Button>
              {isAdmin ? (
                <Button asChild variant="hero">
                  <Link href="/advisor/apply-changes">
                    <ClipboardList className="h-4 w-4" /> Xem đóng góp
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ── Form ──────────────────────────────────────────── */}
      <section className="py-12 sm:py-16">
        <div className="container-page">
          <div className="mx-auto max-w-2xl">
            <AdvisorForm onResult={handleResult} />
          </div>
        </div>
      </section>

      {/* ── Results ───────────────────────────────────────── */}
      {results && (
        <section ref={resultsRef} className="border-t border-border bg-muted/20 py-12 sm:py-16">
          <div className="container-page">
            <div className="mb-8 flex items-center justify-between">
              <SectionHeading
                eyebrow="Kết quả phân tích"
                title={
                  <>
                    Top ngành <span className="text-gradient-hero">phù hợp</span> với bạn
                  </>
                }
                description="Dựa trên điểm học lực, sở thích và mục tiêu nghề nghiệp bạn đã cung cấp."
              />
            </div>
            <AdvisorResults results={results} />
            <div className="mt-8 text-center">
              <Button
                variant="ghost"
                onClick={() => {
                  setResults(null);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Thử lại với thông tin khác
              </Button>
            </div>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              * Kết quả tư vấn chỉ mang tính tham khảo. Hãy kiểm tra thông tin tuyển sinh
              từ website chính thức của các trường trước khi ra quyết định.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
