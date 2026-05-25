"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  evaluateAdmissionChance,
  type AdmissionChanceEvaluation,
  type AdmissionMethod,
  type AdmissionScoreResult,
  type SchoolCode,
} from "@/src/lib/admission-engine";
import type {
  AdmissionMethodRecord,
  AdmissionProgram,
  Benchmark,
} from "@/src/types/admission-data";

type AdmissionCalculatorSectionProps = {
  schoolCode: string;
  programs: AdmissionProgram[];
  benchmarks: Benchmark[];
  methods: AdmissionMethodRecord[];
};

type ThptCombinationCode = "A00" | "A01" | "B00" | "D01" | "D07";
type SubjectKey =
  | "math"
  | "physics"
  | "chemistry"
  | "english"
  | "biology"
  | "literature";

type ApiSuccessResponse = {
  ok: true;
  data: {
    score: AdmissionScoreResult;
    chance: AdmissionChanceEvaluation | null;
  };
};

type ApiErrorResponse = {
  ok: false;
  error: string;
};

type ApiResponse = ApiSuccessResponse | ApiErrorResponse;

const DISCLAIMER =
  "Kết quả chỉ mang tính tham khảo dựa trên điểm chuẩn năm trước. Điểm chuẩn năm nay có thể thay đổi theo chỉ tiêu, phổ điểm, số lượng thí sinh và quy chế tuyển sinh.";

const SUPPORTED_METHODS: AdmissionMethod[] = ["THPT", "TSA", "XTTN"];
const THPT_COMBINATIONS: ThptCombinationCode[] = ["A00", "A01", "B00", "D01", "D07"];

const SUBJECT_LABELS: Record<SubjectKey, string> = {
  math: "Toán",
  physics: "Vật lý",
  chemistry: "Hóa học",
  english: "Tiếng Anh",
  biology: "Sinh học",
  literature: "Ngữ văn",
};

const COMBINATION_SUBJECTS: Record<ThptCombinationCode, SubjectKey[]> = {
  A00: ["math", "physics", "chemistry"],
  A01: ["math", "physics", "english"],
  B00: ["math", "chemistry", "biology"],
  D01: ["math", "literature", "english"],
  D07: ["math", "chemistry", "english"],
};

const EMPTY_SUBJECT_SCORES: Record<SubjectKey, string> = {
  math: "",
  physics: "",
  chemistry: "",
  english: "",
  biology: "",
  literature: "",
};

function isAdmissionMethod(value: string): value is AdmissionMethod {
  return SUPPORTED_METHODS.includes(value as AdmissionMethod);
}

function isSchoolCode(value: string): value is SchoolCode {
  return value === "HUST" || value === "FTU" || value === "VINUNI" || value === "NEU";
}

function parseScore(value: string, label: string) {
  const score = Number(value);

  if (!Number.isFinite(score)) {
    throw new Error(`${label} phải là một số hợp lệ.`);
  }

  return score;
}

function getLatestYear(values: Array<{ year: number }>) {
  return values.reduce<number | null>((latest, item) => {
    if (latest === null) return item.year;
    return Math.max(latest, item.year);
  }, null);
}

function normalizeBenchmarkScore30(benchmark: Benchmark) {
  const scale = benchmark.scale ?? 30;
  return scale === 30 ? benchmark.score : (benchmark.score / scale) * 30;
}

function formatSignedDiff(diff: number) {
  return diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2);
}

function getChanceClass(level: AdmissionChanceEvaluation["level"]) {
  if (level === "VERY_HIGH" || level === "HIGH") return "text-tier-high";
  if (level === "MEDIUM") return "text-tier-mid";
  return "text-tier-low";
}

function isApiResponse(value: unknown): value is ApiResponse {
  if (typeof value !== "object" || value === null) return false;
  const response = value as { ok?: unknown };
  return typeof response.ok === "boolean";
}

function findMatchingBenchmark({
  benchmarks,
  programId,
  method,
  combinationCode,
  selectedAdmissionYear,
}: {
  benchmarks: Benchmark[];
  programId: string;
  method: AdmissionMethod;
  combinationCode: ThptCombinationCode;
  selectedAdmissionYear: number;
}) {
  const methodBenchmarks = benchmarks
    .filter((benchmark) => benchmark.program_id === programId)
    .filter((benchmark) => benchmark.method_code === method)
    .filter((benchmark) => benchmark.year <= selectedAdmissionYear);

  if (method === "THPT") {
    const sameCombinationBenchmarks = methodBenchmarks.filter(
      (benchmark) => benchmark.combination_code === combinationCode,
    );
    const fallbackBenchmarks = methodBenchmarks.filter(
      (benchmark) => benchmark.combination_code === null,
    );
    const candidates = sameCombinationBenchmarks.length
      ? sameCombinationBenchmarks
      : fallbackBenchmarks;

    return candidates.sort((left, right) => right.year - left.year)[0] ?? null;
  }

  return methodBenchmarks.sort((left, right) => right.year - left.year)[0] ?? null;
}

export function AdmissionCalculatorSection({
  schoolCode,
  programs,
  benchmarks,
  methods,
}: AdmissionCalculatorSectionProps) {
  const availableMethods = useMemo(() => {
    const methodCodes = new Set(
      methods
        .map((method) => method.method_code)
        .filter((methodCode): methodCode is AdmissionMethod => isAdmissionMethod(methodCode)),
    );

    return SUPPORTED_METHODS.filter((method) => methodCodes.size === 0 || methodCodes.has(method));
  }, [methods]);

  const [method, setMethod] = useState<AdmissionMethod>(
    availableMethods.includes("THPT") ? "THPT" : availableMethods[0] ?? "THPT",
  );
  const [combinationCode, setCombinationCode] = useState<ThptCombinationCode>("A00");
  const [subjectScores, setSubjectScores] =
    useState<Record<SubjectKey, string>>(EMPTY_SUBJECT_SCORES);
  const [priorityScore, setPriorityScore] = useState("0");
  const [tsaScore, setTsaScore] = useState("");
  const [xttnScore, setXttnScore] = useState("");
  const [xttnScale, setXttnScale] = useState<30 | 100>(30);
  const [scoreResult, setScoreResult] = useState<AdmissionScoreResult | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [selectedBenchmark, setSelectedBenchmark] = useState<Benchmark | null>(null);
  const [chance, setChance] = useState<AdmissionChanceEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const selectedMethodYear = useMemo(() => {
    const methodYears = methods.filter((item) => item.method_code === method);
    return getLatestYear(methodYears) ?? getLatestYear(methods) ?? new Date().getFullYear();
  }, [method, methods]);

  const requiredSubjects = COMBINATION_SUBJECTS[combinationCode];
  const selectedProgram = useMemo(
    () => programs.find((program) => program.id === selectedProgramId) ?? null,
    [programs, selectedProgramId],
  );
  const schoolBenchmarks = useMemo(
    () => benchmarks.filter((benchmark) => benchmark.school_code === schoolCode),
    [benchmarks, schoolCode],
  );
  const comparablePrograms = useMemo(() => {
    if (!scoreResult) return [];

    return programs.filter((program) =>
      Boolean(
        findMatchingBenchmark({
          benchmarks: schoolBenchmarks,
          programId: program.id,
          method,
          combinationCode,
          selectedAdmissionYear: scoreResult.year,
        }),
      ),
    );
  }, [combinationCode, method, programs, schoolBenchmarks, scoreResult]);

  function resetComparison() {
    setSelectedProgramId("");
    setSelectedBenchmark(null);
    setChance(null);
  }

  function buildPayload() {
    if (method === "THPT") {
      const scores = requiredSubjects.reduce(
        (next, subject) => {
          next[subject] = parseScore(subjectScores[subject], SUBJECT_LABELS[subject]);
          return next;
        },
        {} as Partial<Record<SubjectKey, number>>,
      );

      return {
        combinationCode,
        scores,
        priorityScore: priorityScore.trim() ? parseScore(priorityScore, "Điểm ưu tiên") : 0,
      };
    }

    if (method === "TSA") {
      return {
        tsaScore: parseScore(tsaScore, "Điểm TSA"),
      };
    }

    return {
      xttnScore: parseScore(xttnScore, "Điểm XTTN"),
      scale: xttnScale,
    };
  }

  async function handleCalculate() {
    setError(null);
    setScoreResult(null);
    resetComparison();

    if (!isSchoolCode(schoolCode)) {
      setError(`Bộ tính điểm MVP hiện chưa hỗ trợ trường ${schoolCode}.`);
      return;
    }

    setIsCalculating(true);

    try {
      const response = await fetch("/api/admission/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schoolCode,
          method,
          year: selectedMethodYear,
          payload: buildPayload(),
        }),
      });
      const body: unknown = await response.json();

      if (!isApiResponse(body)) {
        throw new Error("Phản hồi từ API không hợp lệ.");
      }

      if (!body.ok) {
        throw new Error(body.error);
      }

      setScoreResult(body.data.score);
    } catch (calculationError) {
      setError(
        calculationError instanceof Error
          ? calculationError.message
          : "Không thể tính điểm xét tuyển.",
      );
    } finally {
      setIsCalculating(false);
    }
  }

  function handleProgramChange(programId: string) {
    setSelectedProgramId(programId);
    setError(null);

    if (!scoreResult || !programId) {
      setSelectedBenchmark(null);
      setChance(null);
      return;
    }

    const benchmark = findMatchingBenchmark({
      benchmarks: schoolBenchmarks,
      programId,
      method,
      combinationCode,
      selectedAdmissionYear: scoreResult.year,
    });

    if (!benchmark) {
      setSelectedBenchmark(null);
      setChance(null);
      setError("Chưa có dữ liệu điểm chuẩn phù hợp cho ngành/phương thức này.");
      return;
    }

    const benchmark30 = normalizeBenchmarkScore30(benchmark);
    setSelectedBenchmark(benchmark);
    setChance(evaluateAdmissionChance(scoreResult.normalizedScore30, benchmark30));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Calculator className="h-5 w-5 text-primary" />
          Công cụ tính điểm
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold">Phương thức xét tuyển</span>
            <select
              value={method}
              onChange={(event) => {
                const nextMethod = event.target.value;
                if (!isAdmissionMethod(nextMethod)) return;
                setMethod(nextMethod);
                setScoreResult(null);
                setError(null);
                resetComparison();
              }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {availableMethods.map((availableMethod) => (
                <option key={availableMethod} value={availableMethod}>
                  {availableMethod}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            Năm dữ liệu: <span className="font-semibold text-foreground">{selectedMethodYear}</span>
          </div>
        </div>

        {method === "THPT" ? (
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold">Tổ hợp xét tuyển</span>
              <select
                value={combinationCode}
                onChange={(event) => {
                  setCombinationCode(event.target.value as ThptCombinationCode);
                  setScoreResult(null);
                  resetComparison();
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {THPT_COMBINATIONS.map((combination) => (
                  <option key={combination} value={combination}>
                    {combination} - {COMBINATION_SUBJECTS[combination].map((subject) => SUBJECT_LABELS[subject]).join(" + ")}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              {requiredSubjects.map((subject) => (
                <label key={subject} className="space-y-2">
                  <span className="text-sm font-semibold">{SUBJECT_LABELS[subject]}</span>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    step="0.01"
                    value={subjectScores[subject]}
                    onChange={(event) => {
                      setSubjectScores((current) => ({
                        ...current,
                        [subject]: event.target.value,
                      }));
                      setScoreResult(null);
                      resetComparison();
                    }}
                    placeholder="0 - 10"
                  />
                </label>
              ))}
            </div>

            <label className="block max-w-xs space-y-2">
              <span className="text-sm font-semibold">Điểm ưu tiên</span>
              <Input
                type="number"
                step="0.01"
                value={priorityScore}
                onChange={(event) => {
                  setPriorityScore(event.target.value);
                  setScoreResult(null);
                  resetComparison();
                }}
              />
            </label>
          </div>
        ) : null}

        {method === "TSA" ? (
          <label className="block max-w-xs space-y-2">
            <span className="text-sm font-semibold">Điểm TSA</span>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={tsaScore}
              onChange={(event) => {
                setTsaScore(event.target.value);
                setScoreResult(null);
                resetComparison();
              }}
              placeholder="0 - 100"
            />
          </label>
        ) : null}

        {method === "XTTN" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold">Điểm XTTN</span>
              <Input
                type="number"
                min="0"
                max={xttnScale}
                step="0.01"
                value={xttnScore}
                onChange={(event) => {
                  setXttnScore(event.target.value);
                  setScoreResult(null);
                  resetComparison();
                }}
                placeholder={`0 - ${xttnScale}`}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold">Thang điểm</span>
              <select
                value={xttnScale}
                onChange={(event) => {
                  setXttnScale(Number(event.target.value) === 100 ? 100 : 30);
                  setScoreResult(null);
                  resetComparison();
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value={30}>30</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>
        ) : null}

        <Button type="button" onClick={handleCalculate} disabled={isCalculating}>
          {isCalculating ? "Đang tính..." : "Tính điểm xét tuyển"}
        </Button>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm font-medium text-destructive">
            {error}
          </div>
        ) : null}

        {scoreResult ? (
          <div className="space-y-5 rounded-lg border border-border bg-background p-5">
            <div>
              <div className="text-sm text-muted-foreground">Điểm quy đổi của bạn</div>
              <div className="mt-1 font-display text-3xl font-bold text-primary">
                {scoreResult.normalizedScore30.toFixed(2)}/30
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Công thức: {scoreResult.formulaUsed}
              </p>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-semibold">So sánh với ngành/chương trình</span>
              <select
                value={selectedProgramId}
                onChange={(event) => handleProgramChange(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Chọn chương trình</option>
                {comparablePrograms.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.program_code ? `${program.program_code} - ` : ""}
                    {program.program_name}
                  </option>
                ))}
              </select>
            </label>

            {comparablePrograms.length === 0 ? (
              <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                Chưa có dữ liệu điểm chuẩn phù hợp cho ngành/phương thức này.
              </p>
            ) : null}

            {selectedBenchmark && chance ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Chương trình so sánh
                  </div>
                  <div className="mt-1 font-display text-lg font-bold">
                    {selectedProgram?.program_code ? `${selectedProgram.program_code} - ` : ""}
                    {selectedProgram?.program_name ?? "Chương trình đã chọn"}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>Phương thức: {method}</span>
                    {method === "THPT" ? (
                      <span>
                        Tổ hợp: {selectedBenchmark.combination_code ?? "Không phân tổ hợp"}
                      </span>
                    ) : null}
                    <span>Năm điểm chuẩn: {selectedBenchmark.year}</span>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  <ResultStat
                    label="Điểm của bạn"
                    value={`${scoreResult.normalizedScore30.toFixed(2)}/30`}
                  />
                  <ResultStat
                    label="Điểm chuẩn"
                    value={`${normalizeBenchmarkScore30(selectedBenchmark).toFixed(2)}/30`}
                  />
                  <ResultStat label="Chênh lệch" value={formatSignedDiff(chance.diff)} />
                  <ResultStat
                    label="Khả năng trúng tuyển"
                    value={chance.label}
                    className={getChanceClass(chance.level)}
                  />
                </div>
              </div>
            ) : null}

            {chance ? (
              <p className="text-sm font-medium">{chance.message}</p>
            ) : null}

            <p className="rounded-lg bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
              {DISCLAIMER}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ResultStat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 font-display text-xl font-bold ${className ?? ""}`}>
        {value}
      </div>
    </div>
  );
}
