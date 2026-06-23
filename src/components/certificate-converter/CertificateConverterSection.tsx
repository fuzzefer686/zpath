"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CertificateConversionInput,
  createDefaultCertificateConversionInputValue,
  type CertificateConversionInputValue,
  type CertificateConversionStructuredValue,
} from "@/src/components/admission/CertificateConversionInput";
import type {
  ConverterSchoolSummary,
  MethodApplicabilityResult,
} from "@/src/lib/certificate-converter";
import { MethodApplicabilityCard } from "./MethodApplicabilityCard";

type SchoolsResponse = {
  ok: boolean;
  data?: {
    schools?: ConverterSchoolSummary[];
  };
  error?: string;
};

type ConvertResponse = {
  ok: boolean;
  data?: {
    results?: MethodApplicabilityResult[];
  };
  error?: string;
};

export function CertificateConverterSection() {
  const [schools, setSchools] = useState<ConverterSchoolSummary[]>([]);
  const [selectedSchoolCodes, setSelectedSchoolCodes] = useState<string[]>([]);
  const [results, setResults] = useState<MethodApplicabilityResult[]>([]);
  const [inputValue, setInputValue] = useState<CertificateConversionInputValue>(
    createDefaultCertificateConversionInputValue,
  );
  const [structuredValue, setStructuredValue] =
    useState<CertificateConversionStructuredValue>(null);
  const [isLoadingSchools, setIsLoadingSchools] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "applicable" | "conditional" | "not_applicable"
  >("all");

  useEffect(() => {
    async function loadSchools() {
      setIsLoadingSchools(true);
      try {
        const response = await fetch("/api/certificate-converter", {
          method: "GET",
        });
        const json = (await response.json()) as SchoolsResponse;
        if (!response.ok || !json.ok) {
          throw new Error(json.error ?? "Không thể tải danh sách trường.");
        }
        const nextSchools = json.data?.schools ?? [];
        setSchools(nextSchools);
        setSelectedSchoolCodes(nextSchools.map((school) => school.schoolCode));
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Không thể tải danh sách trường.",
        );
      } finally {
        setIsLoadingSchools(false);
      }
    }

    void loadSchools();
  }, []);

  function toggleSchool(schoolCode: string) {
    setSelectedSchoolCodes((current) =>
      current.includes(schoolCode)
        ? current.filter((item) => item !== schoolCode)
        : [...current, schoolCode],
    );
  }

  const canSubmit = useMemo(() => {
    const hasRawNumericInput = inputValue.score.trim().length > 0;
    return Boolean((structuredValue || hasRawNumericInput) && selectedSchoolCodes.length > 0);
  }, [structuredValue, inputValue.score, selectedSchoolCodes.length]);

  const filteredResults = useMemo(() => {
    if (statusFilter === "all") return results;
    return results.filter((item) => item.status === statusFilter);
  }, [results, statusFilter]);

  async function handleConvert() {
    const fallbackRawScore = Number(inputValue.score);
    const fallbackInput =
      !structuredValue && Number.isFinite(fallbackRawScore)
        ? {
            certificateType: inputValue.certificateType,
            score: fallbackRawScore,
          }
        : null;

    if (!structuredValue && !fallbackInput) {
      setError("Vui lòng nhập chứng chỉ hợp lệ trước khi phân tích.");
      return;
    }
    if (!selectedSchoolCodes.length) {
      setError("Vui lòng chọn ít nhất một trường.");
      return;
    }

    setError(null);
    setIsConverting(true);
    setResults([]);
    try {
      const response = await fetch("/api/certificate-converter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: structuredValue?.input ?? fallbackInput,
          schoolCodes: selectedSchoolCodes,
        }),
      });
      const json = (await response.json()) as ConvertResponse;
      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? "Không thể phân tích quy đổi.");
      }
      setResults(json.data?.results ?? []);
    } catch (convertError) {
      setError(
        convertError instanceof Error
          ? convertError.message
          : "Không thể phân tích quy đổi.",
      );
    } finally {
      setIsConverting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-bold">1. Nhập chứng chỉ</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Hệ thống sẽ quy đổi và cho biết chứng chỉ của bạn áp dụng vào phương thức nào.
        </p>
        <div className="mt-4">
          <CertificateConversionInput
            value={inputValue}
            allowRawSubmit
            onChange={(nextValue, nextStructuredValue) => {
              setInputValue(nextValue);
              setStructuredValue(nextStructuredValue);
              setResults([]);
              setError(null);
            }}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-bold">2. Chọn trường cần kiểm tra</h2>
        {isLoadingSchools ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải danh sách trường...
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {schools.map((school) => {
              const isSelected = selectedSchoolCodes.includes(school.schoolCode);
              return (
                <button
                  key={school.schoolCode}
                  type="button"
                  onClick={() => toggleSchool(school.schoolCode)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {school.schoolCode}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4">
          <Button type="button" onClick={() => void handleConvert()} disabled={!canSubmit || isConverting}>
            {isConverting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang phân tích...
              </>
            ) : (
              "Phân tích khả năng áp dụng"
            )}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm font-medium text-destructive">
          {error}
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">3. Kết quả theo phương thức</h2>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "all", label: "Tất cả" },
              { value: "applicable", label: "Áp dụng trực tiếp" },
              { value: "conditional", label: "Áp dụng có điều kiện" },
              { value: "not_applicable", label: "Không áp dụng" },
            ].map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() =>
                  setStatusFilter(
                    filter.value as
                      | "all"
                      | "applicable"
                      | "conditional"
                      | "not_applicable",
                  )
                }
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  statusFilter === filter.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
        {filteredResults.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
            Chưa có kết quả. Hãy nhập chứng chỉ và bấm Phân tích khả năng áp dụng.
          </p>
        ) : (
          <div className="grid gap-3">
            {filteredResults.map((item) => (
              <MethodApplicabilityCard
                key={`${item.schoolCode}-${item.methodCode}-${item.status}`}
                item={item}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
