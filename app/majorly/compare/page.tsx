"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Layers, Loader2, Plus, X, Trophy, Crown, Equal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/app/lib/supabase";
import { formatVND } from "@/lib/utils";
import { COMPARE_CRITERIA, type CriteriaKey, type Major, type Program } from "@/types/majorly";

interface Aggregated {
  major: Major;
  programs: Program[];
  metrics: Record<string, number>;
}

function aggregate(major: Major, programs: Program[]): Aggregated {
  const safe = programs.length || 1;
  const avg = (k: keyof Program) =>
    programs.reduce((s, p) => s + (Number(p[k]) || 0), 0) / safe;
  return {
    major,
    programs,
    metrics: {
      tuition_per_year: avg("tuition_per_year"),
      duration_years: avg("duration_years"),
      employment_rate: avg("employment_rate"),
      avg_starting_salary: avg("avg_starting_salary"),
      admission_score: avg("admission_score"),
      n_programs: programs.length,
      n_highlights: programs.reduce((s, p) => s + (p.curriculum_highlights?.length || 0), 0),
    },
  };
}

function formatValue(key: string, v: number) {
  switch (key) {
    case "tuition_per_year":
    case "avg_starting_salary":
      return formatVND(v);
    case "duration_years":
      return `${v.toFixed(1)} năm`;
    case "employment_rate":
      return `${v.toFixed(0)}%`;
    case "admission_score":
      return v.toFixed(2);
    default:
      return String(Math.round(v));
  }
}

export default function MajorlyComparePage() {
  const [codeA, setCodeA] = useState<string>("");
  const [codeB, setCodeB] = useState<string>("");
  const [enabled, setEnabled] = useState<Record<CriteriaKey, boolean>>({
    tuition_per_year: true,
    duration_years: false,
    employment_rate: true,
    avg_starting_salary: true,
    admission_score: true,
    n_programs: false,
    n_highlights: false,
  });

  const [majors, setMajors] = useState<Major[]>([]);
  const [isLoadingMajors, setIsLoadingMajors] = useState(true);

  const [aggA, setAggA] = useState<Aggregated | null>(null);
  const [loadingA, setLoadingA] = useState(false);

  const [aggB, setAggB] = useState<Aggregated | null>(null);
  const [loadingB, setLoadingB] = useState(false);

  useEffect(() => {
    async function fetchMajors() {
      const { data } = await supabase.from("majors").select("*").order("name");
      setMajors((data ?? []) as Major[]);
      setIsLoadingMajors(false);
    }
    fetchMajors();
  }, []);

  useEffect(() => {
    if (!codeA || !majors.length) {
      setAggA(null);
      return;
    }
    async function fetchA() {
      setLoadingA(true);
      const m = majors.find((x) => x.code === codeA)!;
      if (m) {
        const { data } = await supabase.from("programs").select("*").eq("major_id", m.id);
        setAggA(aggregate(m, (data ?? []) as Program[]));
      }
      setLoadingA(false);
    }
    fetchA();
  }, [codeA, majors]);

  useEffect(() => {
    if (!codeB || !majors.length) {
      setAggB(null);
      return;
    }
    async function fetchB() {
      setLoadingB(true);
      const m = majors.find((x) => x.code === codeB)!;
      if (m) {
        const { data } = await supabase.from("programs").select("*").eq("major_id", m.id);
        setAggB(aggregate(m, (data ?? []) as Program[]));
      }
      setLoadingB(false);
    }
    fetchB();
  }, [codeB, majors]);

  const winnerSide = useMemo<"A" | "B" | "tie" | null>(() => {
    if (!aggA || !aggB) return null;
    let a = 0, b = 0;
    for (const c of COMPARE_CRITERIA) {
      if (!enabled[c.key]) continue;
      const va = aggA.metrics[c.key];
      const vb = aggB.metrics[c.key];
      if (va === vb) continue;
      const aWins = c.lowerIsBetter ? va < vb : va > vb;
      if (aWins) a++; else b++;
    }
    if (a === b) return "tie";
    return a > b ? "A" : "B";
  }, [aggA, aggB, enabled]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="container-page py-12">
        <Link href="/majorly" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Về Majorly
        </Link>
        <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent">
          <Layers className="h-3.5 w-3.5" /> Matrix Compare
        </div>
        <h1 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">
          So sánh <span className="text-gradient-hero">2 ngành học</span>
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Chọn 2 ngành và các tiêu chí cần so sánh — ZPATH sẽ tính trung bình từ tất cả trường đào tạo và chấm điểm.
        </p>

        {/* Pickers */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <PickerCard side="A" code={codeA} setCode={setCodeA} majors={majors} loading={isLoadingMajors} />
          <PickerCard side="B" code={codeB} setCode={setCodeB} majors={majors} loading={isLoadingMajors} />
        </div>

        {/* Criteria selector */}
        <div className="mt-8 rounded-2xl border-2 border-border bg-card p-5">
          <div className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Tiêu chí so sánh ({Object.values(enabled).filter(Boolean).length}/{COMPARE_CRITERIA.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {COMPARE_CRITERIA.map((c) => {
              const on = enabled[c.key];
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setEnabled((s) => ({ ...s, [c.key]: !s[c.key] }))}
                  className={`rounded-full border-2 px-3 py-1.5 text-xs font-bold transition-all ${
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:border-primary"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Matrix */}
        {(loadingA || loadingB) && (
          <div className="mt-10 flex items-center justify-center py-12">
            <Loader2 className="h-7 w-7 animate-spin text-accent" />
          </div>
        )}

        {aggA && aggB && (
          <div className="mt-10 overflow-hidden rounded-3xl border-2 border-border bg-card shadow-md">
            {/* Header */}
            <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-2 border-b-2 border-border bg-muted/30 p-5">
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tiêu chí</div>
              <Header agg={aggA} side="A" winner={winnerSide === "A"} />
              <Header agg={aggB} side="B" winner={winnerSide === "B"} />
            </div>

            <div>
              {COMPARE_CRITERIA.filter((c) => enabled[c.key]).map((c) => {
                const va = aggA.metrics[c.key];
                const vb = aggB.metrics[c.key];
                const aWins = c.lowerIsBetter ? va < vb : va > vb;
                const bWins = c.lowerIsBetter ? vb < va : vb > va;
                const tie = va === vb;
                return (
                  <div key={c.key} className="grid grid-cols-[1.4fr_1fr_1fr] gap-2 border-b border-border p-4 last:border-b-0">
                    <div>
                      <div className="font-semibold">{c.label}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {c.lowerIsBetter ? "Thấp hơn = tốt hơn" : "Cao hơn = tốt hơn"}
                      </div>
                    </div>
                    <Cell value={formatValue(c.key, va)} winner={!tie && aWins} />
                    <Cell value={formatValue(c.key, vb)} winner={!tie && bWins} />
                  </div>
                );
              })}
              {Object.values(enabled).every((v) => !v) && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Hãy chọn ít nhất 1 tiêu chí để bắt đầu so sánh.
                </div>
              )}
            </div>

            {/* Verdict */}
            {winnerSide && (
              <div className="border-t-2 border-border bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/10 p-6 text-center">
                {winnerSide === "tie" ? (
                  <div className="inline-flex items-center gap-2 font-display text-xl font-bold">
                    <Equal className="h-6 w-6" /> Cân tài cân sức!
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 font-display text-xl font-bold">
                    <Crown className="h-6 w-6 text-tier-mid" />
                    <span className="text-gradient-hero mx-1">
                      {winnerSide === "A" ? aggA.major.name : aggB.major.name}
                    </span>
                    chiếm ưu thế theo các tiêu chí bạn chọn
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {(!codeA || !codeB) && !loadingA && !loadingB && (
          <div className="mt-10 rounded-2xl border-2 border-dashed border-border bg-muted/30 p-10 text-center">
            <Trophy className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Chọn cả 2 ngành ở trên để bắt đầu Matrix.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function PickerCard({
  side, code, setCode, majors, loading,
}: { side: "A" | "B"; code: string; setCode: (c: string) => void; majors?: Major[]; loading: boolean }) {
  return (
    <div className="rounded-2xl border-2 border-border bg-card p-5">
      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest text-primary">
        Ngành {side}
      </div>
      {code ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-display text-xl font-bold">
              {majors?.find((m) => m.code === code)?.name || code}
            </div>
            <div className="text-xs text-muted-foreground">{majors?.find((m) => m.code === code)?.category}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setCode("")}>
            <X className="h-4 w-4" /> Đổi
          </Button>
        </div>
      ) : (
        <select
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={loading}
          className="h-11 w-full rounded-xl border-2 border-input bg-background px-3 text-sm outline-none focus:border-primary"
        >
          <option value="">{loading ? "Đang tải..." : "— Chọn ngành —"}</option>
          {majors?.map((m) => (
            <option key={m.code} value={m.code}>{m.name}</option>
          ))}
        </select>
      )}
    </div>
  );
}

function Header({ agg, side, winner }: { agg: Aggregated; side: "A" | "B"; winner: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${winner ? "bg-tier-high/15 ring-2 ring-tier-high/40" : "bg-background"}`}>
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ngành {side}</div>
      <div className="font-display text-base font-bold leading-tight">{agg.major.name}</div>
      <div className="text-[11px] text-muted-foreground">{agg.programs.length} trường đào tạo</div>
    </div>
  );
}

function Cell({ value, winner }: { value: string; winner: boolean }) {
  return (
    <div className={`rounded-xl px-3 py-2 text-center font-display text-base font-bold ${
      winner ? "bg-tier-high/15 text-tier-high ring-2 ring-tier-high/40" : "bg-background"
    }`}>
      {value}
      {winner && <Crown className="ml-1 inline h-3.5 w-3.5" />}
    </div>
  );
}

