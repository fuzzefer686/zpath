"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { evaluateAdmissionChance } from "@/src/lib/admission-engine";
import {
  interpretAdmission,
  type GenericAdmissionConfig,
  type GenericAdmissionScoreResult,
  type GenericMethodConfig,
  type GenericPayload,
} from "@/src/lib/admission-engine/generic";

const DEFAULT_DISCLAIMER =
  "Kết quả chỉ mang tính tham khảo dựa trên cấu hình tuyển sinh đã được phê duyệt. Vui lòng đối chiếu với đề án tuyển sinh chính thức của trường.";

type GenericConfigCalculatorProps = {
  config: GenericAdmissionConfig;
  /** Shown as a banner when rendering an unpublished draft in the admin preview. */
  previewMode?: boolean;
};

function buildEmptyValues(method: GenericMethodConfig): Record<string, string> {
  return method.inputs.reduce<Record<string, string>>((acc, input) => {
    acc[input.key] = input.type === "select" ? input.options?.[0]?.value ?? "" : "";
    return acc;
  }, {});
}

function formatScore(value: number, suffix = "") {
  return `${value.toFixed(2)}${suffix}`;
}

export function GenericConfigCalculator({
  config,
  previewMode = false,
}: GenericConfigCalculatorProps) {
  const [methodCode, setMethodCode] = useState(
    config.methods[0]?.methodCode ?? "",
  );
  const selectedMethod = useMemo(
    () => config.methods.find((method) => method.methodCode === methodCode) ?? null,
    [config.methods, methodCode],
  );
  const [values, setValues] = useState<Record<string, string>>(() =>
    selectedMethod ? buildEmptyValues(selectedMethod) : {},
  );
  const [result, setResult] = useState<GenericAdmissionScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function changeMethod(nextMethodCode: string) {
    const nextMethod = config.methods.find(
      (method) => method.methodCode === nextMethodCode,
    );
    setMethodCode(nextMethodCode);
    setValues(nextMethod ? buildEmptyValues(nextMethod) : {});
    setResult(null);
    setError(null);
  }

  function updateValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setResult(null);
    setError(null);
  }

  function buildPayload(method: GenericMethodConfig): GenericPayload {
    const payload: GenericPayload = {};
    for (const input of method.inputs) {
      const raw = values[input.key];
      if (raw === undefined || raw === "") continue;

      if (input.type === "select") {
        payload[input.key] = raw;
      } else if (input.type === "certificate") {
        payload[input.key] = { band: Number(raw) };
      } else {
        payload[input.key] = Number(raw);
      }
    }
    return payload;
  }

  function handleCalculate() {
    if (!selectedMethod) {
      setError("Trường này chưa có phương thức xét tuyển nào.");
      return;
    }

    try {
      const score = interpretAdmission({
        config,
        methodCode: selectedMethod.methodCode,
        payload: buildPayload(selectedMethod),
      });
      setResult(score);
      setError(null);
    } catch (calcError) {
      setResult(null);
      setError(
        calcError instanceof Error ? calcError.message : "Không thể tính điểm.",
      );
    }
  }

  const chance =
    result && result.benchmark30 !== null
      ? evaluateAdmissionChance(result.normalizedScore30, result.benchmark30)
      : null;

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

        {selectedMethod?.description ? (
          <p className="rounded-md bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
            {selectedMethod.description}
          </p>
        ) : null}

        {selectedMethod ? (
          <div className="grid gap-4 md:grid-cols-3">
            {selectedMethod.inputs.map((input) => (
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
                      input.type === "certificate"
                        ? "Nhập điểm chứng chỉ"
                        : input.min !== undefined && input.max !== undefined
                          ? `${input.min} - ${input.max}`
                          : ""
                    }
                  />
                )}
                {input.note ? (
                  <span className="block text-xs text-muted-foreground">{input.note}</span>
                ) : null}
              </label>
            ))}
          </div>
        ) : null}

        <Button type="button" onClick={handleCalculate} disabled={!selectedMethod}>
          Tính điểm xét tuyển
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

            {chance ? (
              <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
                <div className={`font-semibold ${getChanceClass(chance.level)}`}>
                  Cơ hội: {chance.label} ({chance.diff > 0 ? "+" : ""}
                  {chance.diff.toFixed(2)})
                </div>
                <p className="mt-2 text-muted-foreground">{chance.message}</p>
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
