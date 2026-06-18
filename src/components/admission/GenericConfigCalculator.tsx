"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calculator, Loader2 } from "lucide-react";

import { useGenericCombinationForm } from "@/hooks/useGenericCombinationForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { evaluateAdmissionChance } from "@/src/lib/admission-engine";
import { findBenchmarkForProgram } from "@/src/lib/admission-data/benchmark-lookup";
import {
  compareScoreWithCutoff,
  interpretAdmission,
  migrateAdmissionConfig,
  type GenericAdmissionConfig,
  type GenericAdmissionScoreResult,
  type GenericInputField,
  type GenericMethodConfig,
  type GenericPayload,
  type GenericProgramRef,
  type ScoreComparisonResult,
} from "@/src/lib/admission-engine/generic";
import type { AdmissionProgram, Benchmark } from "@/src/types/admission-data";
import { GenericSubjectCombinationPicker } from "./GenericSubjectCombinationPicker";
import { ScoreComparisonPanel } from "./ScoreComparisonPanel";

const DEFAULT_DISCLAIMER =
  "Kết quả chỉ mang tính tham khảo dựa trên cấu hình tuyển sinh đã được phê duyệt. Vui lòng đối chiếu với đề án tuyển sinh chính thức của trường.";

type GenericConfigCalculatorProps = {
  config: GenericAdmissionConfig;
  programs?: AdmissionProgram[];
  benchmarks?: Benchmark[];
  benchmarkYear?: number;
  previewMode?: boolean;
};

function buildEmptyValues(method: GenericMethodConfig): Record<string, string> {
  return method.inputs.reduce<Record<string, string>>((acc, input) => {
    if (input.type === "select") {
      acc[input.key] = input.options?.[0]?.value ?? "";
    } else if (input.type === "subject_group") {
      acc[input.key] = "";
    } else {
      acc[input.key] = "";
    }
    return acc;
  }, {});
}

function formatScore(value: number, suffix = "") {
  return `${value.toFixed(2)}${suffix}`;
}

function resolveProgramOptions(
  config: GenericAdmissionConfig,
  dbPrograms: AdmissionProgram[],
): GenericProgramRef[] {
  if (config.programSource === "db" || (!config.programs?.length && dbPrograms.length)) {
    return dbPrograms
      .filter((program) => program.program_code)
      .map((program) => ({
        programCode: program.program_code as string,
        programName: program.program_name,
      }));
  }
  return config.programs ?? [];
}

function isInputVisible(
  input: GenericInputField,
  values: Record<string, string>,
): boolean {
  if (!input.visibility?.length) return true;
  return input.visibility.every((rule) => {
    const current = values[rule.when.inputKey];
    return current === rule.when.equals;
  });
}

function normalizeBenchmarkScore(benchmark: Benchmark | null): number | null {
  if (!benchmark) return null;
  const scale = benchmark.scale ?? 30;
  if (scale === 30) return benchmark.score;
  return Math.round(((benchmark.score * 30) / scale) * 100) / 100;
}

function normalizeSourceHref(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function GenericConfigCalculator({
  config: rawConfig,
  programs: dbPrograms = [],
  benchmarks = [],
  benchmarkYear,
  previewMode = false,
}: GenericConfigCalculatorProps) {
  const config = useMemo(() => migrateAdmissionConfig(rawConfig), [rawConfig]);
  const resolvedBenchmarkYear =
    benchmarkYear ?? config.benchmarkYear ?? config.year - 1;

  const programOptions = useMemo(
    () => resolveProgramOptions(config, dbPrograms),
    [config, dbPrograms],
  );

  const [methodCode, setMethodCode] = useState(
    config.methods[0]?.methodCode ?? "",
  );
  const selectedMethod = useMemo(
    () => config.methods.find((method) => method.methodCode === methodCode) ?? null,
    [config.methods, methodCode],
  );

  const [programCode, setProgramCode] = useState(
    programOptions[0]?.programCode ?? "",
  );
  const [values, setValues] = useState<Record<string, string>>(() =>
    selectedMethod ? buildEmptyValues(selectedMethod) : {},
  );
  const [result, setResult] = useState<GenericAdmissionScoreResult | null>(null);
  const [comparison, setComparison] = useState<ScoreComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const combinationForm = useGenericCombinationForm(selectedMethod);

  useEffect(() => {
    if (programOptions.length && !programOptions.some((p) => p.programCode === programCode)) {
      setProgramCode(programOptions[0]?.programCode ?? "");
    }
  }, [programOptions, programCode]);

  const requiresProgram = Boolean(
    programOptions.length &&
      (config.programSource === "db" ||
        config.programs?.length ||
        selectedMethod?.programInputKey),
  );

  const changeMethod = useCallback(
    (nextMethodCode: string) => {
      const nextMethod = config.methods.find(
        (method) => method.methodCode === nextMethodCode,
      );
      setMethodCode(nextMethodCode);
      setValues(nextMethod ? buildEmptyValues(nextMethod) : {});
      combinationForm.resetCombinationForm();
      setResult(null);
      setComparison(null);
      setError(null);
    },
    [config.methods, combinationForm],
  );

  const updateValue = useCallback((key: string, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setResult(null);
    setComparison(null);
    setError(null);
  }, []);

  const buildPayload = useCallback(
    (method: GenericMethodConfig): GenericPayload => {
      const payload: GenericPayload = {};

      if (requiresProgram && programCode) {
        const programKey = method.programInputKey ?? "programCode";
        payload[programKey] = programCode;
      }

      if (combinationForm.combinationCode) {
        const comboKey = method.combinationInputKey ?? "combinationCode";
        payload[comboKey] = combinationForm.combinationCode;
      }

      for (const input of method.inputs) {
        if (!isInputVisible(input, values)) continue;

        if (input.type === "subject_group") {
          const subjectPayload = combinationForm.buildSubjectGroupPayload();
          if (Object.keys(subjectPayload).length) {
            payload[input.key] = subjectPayload;
          }
          continue;
        }

        const raw = values[input.key];
        if (raw === undefined || raw === "") continue;

        if (input.type === "select") {
          payload[input.key] = raw;
        } else if (input.type === "certificate" || input.type === "certificate_rich") {
          payload[input.key] = { band: Number(raw) };
        } else {
          payload[input.key] = Number(raw);
        }
      }

      for (const rule of method.priorityRules ?? []) {
        const raw = values[rule.key];
        if (raw !== undefined && raw !== "") {
          payload[rule.key] = Number(raw);
        }
      }

      for (const rule of method.bonusRules ?? []) {
        const raw = values[rule.key];
        if (raw !== undefined && raw !== "") {
          payload[rule.key] = Number(raw);
        }
      }

      return payload;
    },
    [
      requiresProgram,
      programCode,
      combinationForm,
      values,
    ],
  );

  const resolveBenchmark30 = useCallback(
    (method: GenericMethodConfig): number | null => {
      if (!programCode || !requiresProgram) {
        return null;
      }

      const benchmark = findBenchmarkForProgram({
        schoolCode: config.schoolCode,
        programs: dbPrograms,
        benchmarks,
        programCode,
        method: method.methodCode,
        combinationCode: combinationForm.combinationCode || undefined,
        benchmarkYear: resolvedBenchmarkYear,
      });

      return normalizeBenchmarkScore(benchmark);
    },
    [
      config.schoolCode,
      benchmarks,
      programCode,
      requiresProgram,
      dbPrograms,
      combinationForm.combinationCode,
      resolvedBenchmarkYear,
    ],
  );

  const runComparison = useCallback(
    (
      method: GenericMethodConfig,
      score: GenericAdmissionScoreResult,
      benchmark30: number | null,
    ) => {
      if (!programCode) {
        setComparison(null);
        return;
      }

      setComparison(
        compareScoreWithCutoff({
          schoolCode: config.schoolCode,
          year: config.year,
          benchmarkYear: resolvedBenchmarkYear,
          programCode,
          method: method.methodCode,
          combinationCode: combinationForm.combinationCode || undefined,
          score: score.normalizedScore30,
          previousYearCutoff: benchmark30,
        }),
      );
    },
    [
      config.schoolCode,
      config.year,
      resolvedBenchmarkYear,
      programCode,
      combinationForm.combinationCode,
    ],
  );

  const handleCalculate = useCallback(async () => {
    if (!selectedMethod) {
      setError("Trường này chưa có phương thức xét tuyển nào.");
      return;
    }

    if (requiresProgram && !programCode) {
      setError("Vui lòng chọn chương trình đào tạo.");
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      const payload = buildPayload(selectedMethod);

      let score: GenericAdmissionScoreResult;

      if (previewMode) {
        score = interpretAdmission({
          config,
          methodCode: selectedMethod.methodCode,
          payload,
        });
      } else {
        const response = await fetch("/api/admission/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schoolCode: config.schoolCode,
            method: selectedMethod.methodCode,
            year: config.year,
            payload,
          }),
        });

        const data = (await response.json()) as {
          ok: boolean;
          error?: string;
          data?: { score: GenericAdmissionScoreResult };
        };

        if (!response.ok || !data.ok || !data.data?.score) {
          throw new Error(data.error ?? "Không thể tính điểm.");
        }

        score = data.data.score;
      }

      const benchmark30 = resolveBenchmark30(selectedMethod);
      score = { ...score, benchmark30 };

      setResult(score);
      runComparison(selectedMethod, score, benchmark30);
    } catch (calcError) {
      setResult(null);
      setComparison(null);
      setError(
        calcError instanceof Error ? calcError.message : "Không thể tính điểm.",
      );
    } finally {
      setIsCalculating(false);
    }
  }, [
    selectedMethod,
    requiresProgram,
    programCode,
    buildPayload,
    previewMode,
    config,
    resolveBenchmark30,
    runComparison,
  ]);

  const chance =
    result && result.benchmark30 !== null
      ? evaluateAdmissionChance(result.normalizedScore30, result.benchmark30)
      : null;

  const uiTemplate = selectedMethod?.uiTemplate ?? "flat";
  const showCombinationUi =
    uiTemplate === "thpt_combination" || combinationForm.combinations.length > 0;

  const visibleInputs = useMemo(
    () =>
      (selectedMethod?.inputs ?? []).filter(
        (input) =>
          input.type !== "subject_group" &&
          input.key !== "synthetic_score" &&
          isInputVisible(input, values),
      ),
    [selectedMethod, values],
  );
  const methodRequirements = selectedMethod?.requirements ?? [];
  const methodSources = selectedMethod?.sources ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Calculator className="h-5 w-5 text-primary" />
          Công cụ tính điểm xét tuyển {config.schoolName} ({config.year})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {previewMode ? (
          <div className="rounded-md border border-amber-400/40 bg-amber-50 p-3 text-sm font-medium text-amber-700">
            Bản xem trước (chưa publish). Đây là cấu hình nháp dùng để kiểm tra.
          </div>
        ) : null}

        {programOptions.length ? (
          <label className="block max-w-xl space-y-2">
            <span className="text-sm font-semibold">
              Chương trình đào tạo
              {requiresProgram ? <span className="text-destructive"> *</span> : null}
            </span>
            <select
              value={programCode}
              onChange={(event) => {
                setProgramCode(event.target.value);
                setResult(null);
                setComparison(null);
              }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {programOptions.map((program) => (
                <option key={program.programCode} value={program.programCode}>
                  {program.programCode} — {program.programName}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="block max-w-md space-y-2">
          <span className="text-sm font-semibold">Phương thức xét tuyển</span>
          <select
            value={methodCode}
            onChange={(event) => changeMethod(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {config.methods.map((method) => (
              <option key={method.methodCode} value={method.methodCode}>
                {method.methodName}
              </option>
            ))}
          </select>
        </label>

        {config.methods.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            {config.methods.map((method) => (
              <button
                key={method.methodCode}
                type="button"
                onClick={() => changeMethod(method.methodCode)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  method.methodCode === methodCode
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {method.methodName}
              </button>
            ))}
          </div>
        ) : null}

        {selectedMethod?.description ? (
          <p className="rounded-md bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
            {selectedMethod.description}
          </p>
        ) : null}

        {selectedMethod?.note ? (
          <div className="rounded-md border border-amber-400/40 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
            {selectedMethod.note}
          </div>
        ) : null}

        {methodRequirements.length ? (
          <div className="rounded-md border border-border bg-background p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Yêu cầu riêng của phương thức
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {methodRequirements.map((requirement, index) => (
                <li key={`${requirement}-${index}`}>• {requirement}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {methodSources.length ? (
          <div className="rounded-md border border-border bg-background p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Nguồn tham khảo cho phương thức
            </p>
            <ul className="mt-2 space-y-2 text-sm">
              {methodSources.map((source, index) => {
                const href = source.url ? normalizeSourceHref(source.url) : null;
                const label = source.label || source.url || `Nguồn ${index + 1}`;
                return (
                  <li key={`${label}-${index}`} className="rounded-md bg-muted/30 p-2">
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-primary underline"
                      >
                        {label}
                      </a>
                    ) : (
                      <p className="font-medium">{label}</p>
                    )}
                    {source.excerpt ? (
                      <p className="mt-1 text-xs text-muted-foreground">{source.excerpt}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {showCombinationUi ? (
          <GenericSubjectCombinationPicker
            combinations={combinationForm.combinations}
            selectedCode={combinationForm.combinationCode}
            onSelect={combinationForm.selectCombination}
          />
        ) : null}

        {showCombinationUi && combinationForm.selectedCombination ? (
          <div className="grid gap-4 md:grid-cols-3">
            {combinationForm.selectedCombination.subjects.map((subject) => (
              <label key={subject.key} className="space-y-2">
                <span className="text-sm font-semibold">
                  {subject.label}
                  {subject.required ? (
                    <span className="text-destructive"> *</span>
                  ) : null}
                  {(subject.weight ?? 1) > 1 ? (
                    <span className="text-muted-foreground">
                      {" "}
                      (×{subject.weight})
                    </span>
                  ) : null}
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={subject.min ?? 0}
                  max={subject.max ?? 10}
                  step="0.01"
                  value={combinationForm.subjectScores[subject.key] ?? ""}
                  onChange={(event) =>
                    combinationForm.updateSubjectScore(subject.key, event.target.value)
                  }
                />
              </label>
            ))}
          </div>
        ) : null}

        {visibleInputs.length ? (
          <div className="grid gap-4 md:grid-cols-3">
            {visibleInputs.map((input) => (
              <label key={input.key} className="space-y-2">
                <span className="text-sm font-semibold">
                  {input.label}
                  {input.required ? <span className="text-destructive"> *</span> : null}
                  {input.unit ? (
                    <span className="text-muted-foreground"> ({input.unit})</span>
                  ) : null}
                </span>
                {input.type === "select" ? (
                  <select
                    value={values[input.key] ?? ""}
                    onChange={(event) => updateValue(input.key, event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {(input.options ?? []).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={input.min}
                    max={input.max}
                    step={input.step ?? "0.01"}
                    value={values[input.key] ?? ""}
                    onChange={(event) => updateValue(input.key, event.target.value)}
                    placeholder={
                      input.type === "certificate" || input.type === "certificate_rich"
                        ? "Nhập band/điểm chứng chỉ"
                        : input.min !== undefined && input.max !== undefined
                          ? `${input.min} - ${input.max}`
                          : ""
                    }
                  />
                )}
                {input.note ? (
                  <span className="block text-xs text-muted-foreground">{input.note}</span>
                ) : input.type === "certificate" || input.type === "certificate_rich" ? (
                  <span className="block text-xs text-muted-foreground">
                    Hệ thống tự quy đổi theo bảng chứng chỉ của phương thức đang chọn.
                  </span>
                ) : null}
              </label>
            ))}
          </div>
        ) : null}

        {(selectedMethod?.priorityRules ?? []).length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {(selectedMethod?.priorityRules ?? []).map((rule) => (
              <label key={rule.key} className="space-y-2">
                <span className="text-sm font-semibold">{rule.label}</span>
                {rule.options?.length ? (
                  <select
                    value={values[rule.key] ?? ""}
                    onChange={(event) => updateValue(rule.key, event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">— Chọn —</option>
                    {rule.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type="number"
                    min={0}
                    max={rule.max}
                    step={rule.step ?? "0.25"}
                    value={values[rule.key] ?? ""}
                    onChange={(event) => updateValue(rule.key, event.target.value)}
                  />
                )}
              </label>
            ))}
          </div>
        ) : null}

        {(selectedMethod?.bonusRules ?? []).length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {(selectedMethod?.bonusRules ?? []).map((rule) => (
              <label key={rule.key} className="space-y-2">
                <span className="text-sm font-semibold">{rule.label}</span>
                <Input
                  type="number"
                  min={0}
                  max={rule.max}
                  step={rule.step ?? "0.5"}
                  value={values[rule.key] ?? ""}
                  onChange={(event) => updateValue(rule.key, event.target.value)}
                />
              </label>
            ))}
          </div>
        ) : null}

        <Button
          type="button"
          onClick={() => void handleCalculate()}
          disabled={!selectedMethod || isCalculating}
        >
          {isCalculating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang tính...
            </>
          ) : (
            "Tính điểm xét tuyển"
          )}
        </Button>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm font-medium text-destructive">
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="space-y-5 rounded-lg border border-border bg-background p-5">
            <div className="grid gap-4 md:grid-cols-3">
              <ResultStat
                label="Điểm quy về thang 30"
                value={formatScore(result.normalizedScore30, "/30")}
              />
              <ResultStat
                label="Điểm gốc"
                value={formatScore(result.originalScore, `/${result.originalScale}`)}
              />
              <ResultStat
                label="Điểm chuẩn tham chiếu"
                value={
                  result.benchmark30 !== null
                    ? formatScore(result.benchmark30, "/30")
                    : "Chưa có"
                }
                className={chance ? getChanceClass(chance.level) : undefined}
              />
            </div>

            {comparison ? <ScoreComparisonPanel comparison={comparison} /> : null}

            {chance ? (
              <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
                <div className={`font-semibold ${getChanceClass(chance.level)}`}>
                  Cơ hội: {chance.label} ({chance.diff > 0 ? "+" : ""}
                  {chance.diff.toFixed(2)})
                </div>
                <p className="mt-2 text-muted-foreground">{chance.message}</p>
              </div>
            ) : null}

            {!result.eligible ? (
              <div className="rounded-lg border border-amber-400/40 bg-amber-50 p-3 text-sm text-amber-800">
                Chưa đủ điều kiện: {result.missingFields.join(", ")}
              </div>
            ) : null}

            <p className="text-xs text-muted-foreground">
              Công thức: {result.formulaUsed}
            </p>

            {result.warnings.length ? (
              <ul className="space-y-1 text-xs text-amber-700">
                {result.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            ) : null}

            <p className="rounded-lg bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
              {config.disclaimer ?? DEFAULT_DISCLAIMER}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function getChanceClass(level: string) {
  if (level === "VERY_HIGH" || level === "HIGH") return "text-tier-high";
  if (level === "MEDIUM") return "text-muted-foreground";
  return "text-tier-low";
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
      <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-bold ${className ?? ""}`}>{value}</div>
    </div>
  );
}
