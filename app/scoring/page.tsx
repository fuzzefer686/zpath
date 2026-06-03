import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Calculator, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AdmissionCalculatorSection } from "@/src/components/admission/AdmissionCalculatorSection";
import {
  getSchoolAdmissionMethods,
  getSchoolBenchmarks,
  getSchoolPrograms,
} from "@/src/lib/admission-data";

export const metadata: Metadata = {
  title: "Tính điểm xét tuyển - ZPATH",
  description:
    "Công cụ tính điểm xét tuyển và so sánh với điểm chuẩn tham chiếu trong ZPATH.",
};

const SCORING_SCHOOL_CODE = "HUST";
const SCORING_BENCHMARK_YEAR = 2025;

async function loadOrFallback<T>(
  load: () => Promise<T>,
  fallback: T,
  label: string,
) {
  try {
    return await load();
  } catch (error) {
    console.error(`Cannot load scoring ${label}:`, error);
    return fallback;
  }
}

export default async function ScoringPage() {
  const [programs, methods, benchmarks] = await Promise.all([
    loadOrFallback(
      () => getSchoolPrograms(SCORING_SCHOOL_CODE, SCORING_BENCHMARK_YEAR),
      [],
      "programs",
    ),
    loadOrFallback(
      () => getSchoolAdmissionMethods(SCORING_SCHOOL_CODE, SCORING_BENCHMARK_YEAR),
      [],
      "admission methods",
    ),
    loadOrFallback(
      () => getSchoolBenchmarks(SCORING_SCHOOL_CODE, SCORING_BENCHMARK_YEAR),
      [],
      "benchmarks",
    ),
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-background to-accent/10 py-12 md:py-16">
        <div className="absolute inset-0 grid-dots opacity-30" />
        <div className="container-page relative">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <Calculator className="h-4 w-4" />
              Scoring
            </div>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              Tính điểm xét tuyển
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
              Nhập điểm theo phương thức xét tuyển đang hỗ trợ, sau đó so sánh
              nhanh với điểm chuẩn tham chiếu {SCORING_BENCHMARK_YEAR} để đánh
              giá mức độ an toàn của nguyện vọng.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/unimap/hust">
                  Xem dữ liệu HUST
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
              <div className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-tier-high" />
                Kết quả chỉ mang tính tham khảo
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-10 md:py-12">
        <AdmissionCalculatorSection
          schoolCode={SCORING_SCHOOL_CODE}
          programs={programs}
          benchmarks={benchmarks}
          methods={methods}
          benchmarkYear={SCORING_BENCHMARK_YEAR}
        />
      </section>
    </div>
  );
}
