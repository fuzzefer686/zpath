"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  FTUAdmissionMethod,
  FTUAssessmentExamType,
  FTUCertificateType,
  FTUProgramGroup,
  FTUScoringInput,
  FTUScoringResult,
} from "@/src/lib/admission";
import type { AdmissionProgram, Benchmark } from "@/src/types/admission-data";

type FtuAdmissionCalculatorSectionProps = {
  programs: AdmissionProgram[];
  benchmarks: Benchmark[];
  benchmarkYear?: number;
};

type ApiSuccessResponse = {
  ok: true;
  data: {
    score: FTUScoringResult;
  };
};

type ApiErrorResponse = {
  ok: false;
  error: string;
};

type ApiResponse = ApiSuccessResponse | ApiErrorResponse;

const FTU_YEAR = 2026;

const METHOD_LABELS: Record<FTUAdmissionMethod, string> = {
  DIRECT_ADMISSION: "Xét tuyển thẳng",
  ACADEMIC_TRANSCRIPT_3_SUBJECTS: "Học bạ 3 môn",
  ACADEMIC_TRANSCRIPT_WITH_LANGUAGE_CERT: "Học bạ + chứng chỉ ngoại ngữ",
  THPT_3_SUBJECTS: "THPT 3 môn",
  THPT_WITH_LANGUAGE_CERT: "THPT + chứng chỉ ngoại ngữ",
  DOMESTIC_ASSESSMENT: "ĐGNL/ĐGTD trong nước",
  INTERNATIONAL_ASSESSMENT_WITH_LANGUAGE_CERT: "SAT/ACT/A-Level + chứng chỉ",
};

const PROGRAM_GROUP_LABELS: Record<FTUProgramGroup, string> = {
  STANDARD_INTEGRATED: "Tiêu chuẩn / CLC / tích hợp",
  TECH_DATA_AI: "Khoa học máy tính / AI / Khoa học dữ liệu",
  COMMERCIAL_LANGUAGE: "Ngôn ngữ thương mại",
};

const DOMESTIC_ASSESSMENT_LABELS: Record<"HSA" | "V_ACT" | "TSA", string> = {
  HSA: "HSA - ĐGNL ĐHQGHN",
  V_ACT: "V-ACT - ĐGNL ĐHQG TP.HCM",
  TSA: "TSA - Đánh giá tư duy",
};

const CERTIFICATE_TYPES: FTUCertificateType[] = [
  "IELTS",
  "TOEFL_IBT",
  "TOEIC",
  "HSK",
  "JLPT",
  "DELF",
  "TCF",
  "OTHER",
];

function isApiResponse(value: unknown): value is ApiResponse {
  if (typeof value !== "object" || value === null) return false;
  return typeof (value as { ok?: unknown }).ok === "boolean";
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error("Vui lòng nhập số hợp lệ.");
  }
  return parsed;
}

function parseBoundedOptionalNumber(
  value: string,
  label: string,
  min: number,
  max: number,
) {
  const parsed = parseOptionalNumber(value);
  if (parsed === undefined) return undefined;
  if (parsed < min || parsed > max) {
    throw new Error(`${label} phải nằm trong khoảng ${min}-${max}.`);
  }
  return parsed;
}

function parseRawScoreValue(value: string) {
  const parsed = parseOptionalNumber(value);
  return parsed ?? (value.trim() || undefined);
}

function formatNullableScore(value: number | null, suffix = "") {
  return value === null ? "Chưa có" : `${value.toFixed(2)}${suffix}`;
}

function normalizeBenchmarkScore30(benchmark: Benchmark) {
  const scale = benchmark.scale ?? 30;
  return scale === 30 ? benchmark.score : (benchmark.score / scale) * 30;
}

function formatBenchmarkScore(benchmark: Benchmark | null) {
  if (!benchmark) return "Chưa có";
  return `${benchmark.score.toFixed(2)}/${benchmark.scale ?? 30}`;
}

function formatDifference(value: number | null) {
  if (value === null) return "Chưa có";
  return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
}

function getComparisonStatus(
  score30: number | null,
  benchmark30: number | null,
) {
  if (score30 === null || benchmark30 === null) return "missing";
  const difference = score30 - benchmark30;
  if (Math.abs(difference) < 0.005) return "equal";
  return difference > 0 ? "above" : "below";
}

function getComparisonLabel(status: ReturnType<typeof getComparisonStatus>) {
  if (status === "above") return "Cao hơn năm ngoái";
  if (status === "below") return "Thấp hơn năm ngoái";
  if (status === "equal") return "Bằng năm ngoái";
  return "Chưa có dữ liệu";
}

function getComparisonClass(status: ReturnType<typeof getComparisonStatus>) {
  if (status === "above" || status === "equal") return "text-tier-high";
  if (status === "below") return "text-tier-low";
  return "text-muted-foreground";
}

function getFTUBenchmarkMethodAliases(method: FTUAdmissionMethod) {
  if (method === "THPT_3_SUBJECTS" || method === "THPT_WITH_LANGUAGE_CERT") {
    return ["THPT_EXAM", "THPT", method];
  }

  if (
    method === "ACADEMIC_TRANSCRIPT_3_SUBJECTS" ||
    method === "ACADEMIC_TRANSCRIPT_WITH_LANGUAGE_CERT"
  ) {
    return ["ACADEMIC_TRANSCRIPT", "HOC_BA", "TRANSCRIPT", method];
  }

  if (method === "DOMESTIC_ASSESSMENT") {
    return ["DGNL", "DOMESTIC_ASSESSMENT", "ASSESSMENT_OR_INTERNATIONAL", method];
  }

  if (method === "INTERNATIONAL_ASSESSMENT_WITH_LANGUAGE_CERT") {
    return [
      "DGNL",
      "INTERNATIONAL_ASSESSMENT",
      "ASSESSMENT_OR_INTERNATIONAL",
      method,
    ];
  }

  return [method];
}

function normalizeProgramText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hasSameFTUProgram(
  benchmark: Benchmark,
  selectedProgram: AdmissionProgram,
) {
  const benchmarkProgram = benchmark.admission_programs;
  const selectedProgramCode = selectedProgram.program_code ?? null;
  const selectedMajorCode = selectedProgram.major_code ?? null;

  if (benchmark.program_id !== null && benchmark.program_id === selectedProgram.id) {
    return true;
  }

  if (
    benchmarkProgram?.program_code &&
    selectedProgramCode &&
    benchmarkProgram.program_code === selectedProgramCode
  ) {
    return true;
  }

  if (
    benchmarkProgram?.major_code &&
    selectedMajorCode &&
    benchmarkProgram.major_code === selectedMajorCode
  ) {
    return true;
  }

  const benchmarkNames = [
    benchmarkProgram?.program_name,
    benchmarkProgram?.major_name,
  ]
    .map(normalizeProgramText)
    .filter(Boolean);
  const selectedNames = [
    selectedProgram.program_name,
    selectedProgram.major_name,
  ]
    .map(normalizeProgramText)
    .filter(Boolean);

  return benchmarkNames.some((benchmarkName) =>
    selectedNames.some(
      (selectedName) =>
        benchmarkName === selectedName ||
        benchmarkName.includes(selectedName) ||
        selectedName.includes(benchmarkName),
    ),
  );
}

function findFTUBenchmarkForProgram({
  benchmarks,
  selectedProgram,
  method,
  benchmarkYear,
}: {
  benchmarks: Benchmark[];
  selectedProgram: AdmissionProgram | null;
  method: FTUAdmissionMethod;
  benchmarkYear: number;
}) {
  if (!selectedProgram) return null;

  const methodAliases = new Set(getFTUBenchmarkMethodAliases(method));
  const sameProgramAndMethod = benchmarks.filter((benchmark) => {
    if (benchmark.school_code !== "FTU") return false;
    if (benchmark.year !== benchmarkYear) return false;
    if (!methodAliases.has(benchmark.method_code)) return false;
    return hasSameFTUProgram(benchmark, selectedProgram);
  });

  return (
    sameProgramAndMethod.find((benchmark) => benchmark.combination_code === null) ??
    sameProgramAndMethod[0] ??
    null
  );
}

function usesThreeSubjects(method: FTUAdmissionMethod) {
  return (
    method === "ACADEMIC_TRANSCRIPT_3_SUBJECTS" ||
    method === "THPT_3_SUBJECTS"
  );
}

function usesLanguageCertificate(method: FTUAdmissionMethod) {
  return (
    method === "ACADEMIC_TRANSCRIPT_WITH_LANGUAGE_CERT" ||
    method === "THPT_WITH_LANGUAGE_CERT" ||
    method === "INTERNATIONAL_ASSESSMENT_WITH_LANGUAGE_CERT"
  );
}

function usesDomesticAssessment(method: FTUAdmissionMethod) {
  return method === "DOMESTIC_ASSESSMENT";
}

function usesInternationalAssessment(method: FTUAdmissionMethod) {
  return method === "INTERNATIONAL_ASSESSMENT_WITH_LANGUAGE_CERT";
}

function getDomesticExamMax(examType: "HSA" | "V_ACT" | "TSA") {
  if (examType === "HSA") return 150;
  if (examType === "V_ACT") return 1200;
  return 100;
}

function getInternationalExamRawBounds(examType: "SAT" | "ACT" | "A_LEVEL") {
  if (examType === "SAT") return { min: 400, max: 1600 };
  if (examType === "ACT") return { min: 1, max: 36 };
  return { min: 0, max: 10 };
}

function getInternationalConvertedBounds(examType: "SAT" | "ACT" | "A_LEVEL") {
  if (examType === "SAT" || examType === "ACT") return { min: 0, max: 20 };
  return { min: 0, max: 10 };
}

export function FtuAdmissionCalculatorSection({
  programs,
  benchmarks,
  benchmarkYear = 2025,
}: FtuAdmissionCalculatorSectionProps) {
  const [method, setMethod] = useState<FTUAdmissionMethod>("THPT_3_SUBJECTS");
  const [programId, setProgramId] = useState(programs[0]?.id ?? "");
  const [programGroup, setProgramGroup] =
    useState<FTUProgramGroup>("STANDARD_INTEGRATED");
  const [m1, setM1] = useState("");
  const [m2, setM2] = useState("");
  const [m3, setM3] = useState("");
  const [priorityPoint, setPriorityPoint] = useState("0");
  const [bonusPoint, setBonusPoint] = useState("0");
  const [certificateType, setCertificateType] =
    useState<FTUCertificateType>("IELTS");
  const [certificateRawScore, setCertificateRawScore] = useState("");
  const [certificateConvertedScore, setCertificateConvertedScore] = useState("");
  const [domesticExamType, setDomesticExamType] =
    useState<"HSA" | "V_ACT" | "TSA">("HSA");
  const [domesticExamScore, setDomesticExamScore] = useState("");
  const [internationalExamType, setInternationalExamType] =
    useState<"SAT" | "ACT" | "A_LEVEL">("SAT");
  const [internationalExamScore, setInternationalExamScore] = useState("");
  const [internationalConvertedScore, setInternationalConvertedScore] =
    useState("");
  const [aLevelOtherConvertedScore, setALevelOtherConvertedScore] = useState("");
  const [scoreResult, setScoreResult] = useState<FTUScoringResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const selectedProgram = useMemo(
    () => programs.find((program) => program.id === programId) ?? null,
    [programId, programs],
  );
  const selectedBenchmark = useMemo(
    () =>
      findFTUBenchmarkForProgram({
        benchmarks,
        selectedProgram,
        method,
        benchmarkYear,
      }),
    [benchmarks, benchmarkYear, method, selectedProgram],
  );
  const selectedBenchmark30 = selectedBenchmark
    ? normalizeBenchmarkScore30(selectedBenchmark)
    : null;
  const comparisonStatus = getComparisonStatus(
    scoreResult?.normalizedScore30 ?? null,
    selectedBenchmark30,
  );

  function resetResult() {
    setScoreResult(null);
    setError(null);
  }

  function buildPayload(): FTUScoringInput {
    const parsedM1 = parseBoundedOptionalNumber(m1, "M1", 0, 10);
    const parsedM2 = parseBoundedOptionalNumber(m2, "M2", 0, 10);
    const parsedM3 = parseBoundedOptionalNumber(m3, "M3", 0, 10);
    const parsedCertificateConverted = parseBoundedOptionalNumber(
      certificateConvertedScore,
      "Điểm quy đổi chứng chỉ",
      0,
      10,
    );
    const parsedCertificateRaw = parseOptionalNumber(certificateRawScore);
    const internationalRawBounds =
      getInternationalExamRawBounds(internationalExamType);
    const internationalConvertedBounds =
      getInternationalConvertedBounds(internationalExamType);
    const parsedInternationalConverted = parseBoundedOptionalNumber(
      internationalConvertedScore,
      internationalExamType === "A_LEVEL"
        ? "Điểm quy đổi A-Level Toán"
        : "Điểm quy đổi SAT/ACT",
      internationalConvertedBounds.min,
      internationalConvertedBounds.max,
    );
    const parsedInternationalRaw = parseBoundedOptionalNumber(
      internationalExamScore,
      "Điểm gốc",
      internationalRawBounds.min,
      internationalRawBounds.max,
    );
    const parsedPriorityPoint =
      parseBoundedOptionalNumber(priorityPoint, "Điểm ưu tiên", 0, 2.75) ?? 0;
    const parsedBonusPoint =
      parseBoundedOptionalNumber(bonusPoint, "Điểm thưởng", 0, 10) ?? 0;

    return {
      schoolCode: "FTU",
      admissionYear: FTU_YEAR,
      method,
      programId: selectedProgram?.id,
      programCode: selectedProgram?.program_code ?? undefined,
      majorCode: selectedProgram?.major_code ?? undefined,
      programName:
        selectedProgram?.program_name ?? selectedProgram?.major_name ?? undefined,
      programGroup,
      subjects: {
        m1: parsedM1,
        m2: parsedM2,
        m3: usesThreeSubjects(method) ? parsedM3 : undefined,
      },
      assessment: usesDomesticAssessment(method)
        ? {
            examType: domesticExamType,
            examScore: parseBoundedOptionalNumber(
              domesticExamScore,
              "Điểm bài thi",
              0,
              getDomesticExamMax(domesticExamType),
            ),
          }
        : usesInternationalAssessment(method)
          ? {
              examType: internationalExamType,
              examScore: parsedInternationalRaw,
              convertedAssessmentScore: parsedInternationalConverted,
              aLevelMathConvertedScore:
                internationalExamType === "A_LEVEL"
                  ? parsedInternationalConverted
                  : undefined,
              aLevelOtherConvertedScore:
                internationalExamType === "A_LEVEL"
                  ? parseOptionalNumber(aLevelOtherConvertedScore)
                  : undefined,
            }
          : undefined,
      certificate: usesLanguageCertificate(method)
        ? {
            type: certificateType,
            rawScore: parseRawScoreValue(certificateRawScore),
            convertedScore: parsedCertificateConverted,
          }
        : undefined,
      priorityPoint: parsedPriorityPoint,
      bonusPoint: parsedBonusPoint,
    };
  }

  async function handleCalculate() {
    setError(null);
    setScoreResult(null);
    setIsCalculating(true);

    try {
      const response = await fetch("/api/admission/ftu/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
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

      if (
        body.data.score.officialRawScore !== null &&
        body.data.score.officialMaxScore !== null &&
        body.data.score.officialRawScore > body.data.score.officialMaxScore
      ) {
        throw new Error(
          `Tổng điểm không được vượt thang điểm chính thức ${body.data.score.officialMaxScore}. Vui lòng kiểm tra điểm ưu tiên/điểm thưởng.`,
        );
      }

      setScoreResult(body.data.score);
    } catch (calculationError) {
      setError(
        calculationError instanceof Error
          ? calculationError.message
          : "Không thể tính điểm xét tuyển FTU.",
      );
    } finally {
      setIsCalculating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Calculator className="h-5 w-5 text-red-700" />
          Công cụ tính điểm xét tuyển FTU 2026
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-semibold">Phương thức xét tuyển</span>
            <select
              value={method}
              onChange={(event) => {
                setMethod(event.target.value as FTUAdmissionMethod);
                resetResult();
              }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {Object.entries(METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold">Nhóm chương trình</span>
            <select
              value={programGroup}
              onChange={(event) => {
                setProgramGroup(event.target.value as FTUProgramGroup);
                resetResult();
              }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {Object.entries(PROGRAM_GROUP_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold">Chương trình</span>
            <select
              value={programId}
              onChange={(event) => {
                setProgramId(event.target.value);
                resetResult();
              }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Không chọn chương trình</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.program_code ?? program.major_code ?? "FTU"} -{" "}
                  {program.program_name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 text-sm md:grid-cols-3">
          <InfoPill label="Năm tuyển sinh" value={`${FTU_YEAR}`} />
          <InfoPill label="Điểm chuẩn so sánh" value={`${benchmarkYear}`} />
          <InfoPill
            label="Thang điểm chính thức"
            value={
              programGroup === "STANDARD_INTEGRATED"
                ? "30"
                : "40, có normalized /30"
            }
          />
        </div>

        {method !== "DIRECT_ADMISSION" && !usesDomesticAssessment(method) ? (
          <div className="grid gap-4 md:grid-cols-3">
            <ScoreField label="M1" value={m1} onChange={setM1} min={0} max={10} />
            <ScoreField label="M2" value={m2} onChange={setM2} min={0} max={10} />
            {usesThreeSubjects(method) ? (
              <ScoreField label="M3" value={m3} onChange={setM3} min={0} max={10} />
            ) : null}
          </div>
        ) : null}

        {usesDomesticAssessment(method) ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold">Bài thi</span>
              <select
                value={domesticExamType}
                onChange={(event) => {
                  setDomesticExamType(event.target.value as "HSA" | "V_ACT" | "TSA");
                  resetResult();
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {Object.entries(DOMESTIC_ASSESSMENT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <ScoreField
              label="Điểm bài thi"
              value={domesticExamScore}
              onChange={setDomesticExamScore}
              placeholder="HSA 100-150, V-ACT 850-1200, TSA 70-100"
              min={0}
              max={getDomesticExamMax(domesticExamType)}
            />
          </div>
        ) : null}

        {usesInternationalAssessment(method) ? (
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm font-semibold">Bài thi quốc tế</span>
              <select
                value={internationalExamType}
                onChange={(event) => {
                  setInternationalExamType(
                    event.target.value as "SAT" | "ACT" | "A_LEVEL",
                  );
                  resetResult();
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="SAT">SAT</option>
                <option value="ACT">ACT</option>
                <option value="A_LEVEL">A-Level</option>
              </select>
            </label>
            <ScoreField
              label="Điểm gốc"
              value={internationalExamScore}
              onChange={setInternationalExamScore}
              placeholder="Nếu muốn tra bảng quy đổi"
              min={getInternationalExamRawBounds(internationalExamType).min}
              max={getInternationalExamRawBounds(internationalExamType).max}
            />
            <ScoreField
              label={
                internationalExamType === "A_LEVEL"
                  ? "Điểm quy đổi A-Level Toán"
                  : "Điểm quy đổi SAT/ACT"
              }
              value={internationalConvertedScore}
              onChange={setInternationalConvertedScore}
              placeholder="Có thể nhập trực tiếp"
              min={getInternationalConvertedBounds(internationalExamType).min}
              max={getInternationalConvertedBounds(internationalExamType).max}
            />
            {internationalExamType === "A_LEVEL" ? (
              <ScoreField
                label="Điểm quy đổi A-Level môn còn lại"
                value={aLevelOtherConvertedScore}
                onChange={setALevelOtherConvertedScore}
                placeholder="0 - 10"
                min={0}
                max={10}
              />
            ) : null}
          </div>
        ) : null}

        {usesLanguageCertificate(method) ? (
          <div className="grid gap-4 rounded-lg border border-border bg-muted/20 p-4 md:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm font-semibold">Loại chứng chỉ</span>
              <select
                value={certificateType}
                onChange={(event) => {
                  setCertificateType(event.target.value as FTUCertificateType);
                  resetResult();
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {CERTIFICATE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <ScoreField
              label="Điểm/bậc chứng chỉ gốc"
              value={certificateRawScore}
              onChange={setCertificateRawScore}
              placeholder="VD: 6.5, N1, HSK5"
            />
            <ScoreField
              label="Điểm quy đổi chứng chỉ"
              value={certificateConvertedScore}
              onChange={setCertificateConvertedScore}
              placeholder="Có thể nhập trực tiếp"
              min={0}
              max={10}
            />
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <ScoreField
            label="Điểm ưu tiên"
            value={priorityPoint}
            onChange={setPriorityPoint}
            placeholder="0 - 2.75"
            min={0}
            max={2.75}
          />
          <ScoreField
            label="Điểm thưởng"
            value={bonusPoint}
            onChange={setBonusPoint}
            placeholder="0 - 10"
            min={0}
            max={10}
          />
        </div>

        <Button type="button" onClick={handleCalculate} disabled={isCalculating}>
          {isCalculating ? "Đang tính..." : "Tính điểm FTU"}
        </Button>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm font-medium text-destructive">
            {error}
          </div>
        ) : null}

        {scoreResult ? (
          <div className="space-y-5 rounded-lg border border-border bg-background p-5">
            <div className="grid gap-4 md:grid-cols-4">
              <ResultStat
                label="Điểm chính thức"
                value={formatNullableScore(
                  scoreResult.officialRawScore,
                  scoreResult.officialMaxScore
                    ? `/${scoreResult.officialMaxScore}`
                    : "",
                )}
              />
              <ResultStat
                label="Normalized /30"
                value={formatNullableScore(scoreResult.normalizedScore30, "/30")}
              />
              <ResultStat
                label="Trạng thái"
                value={
                  scoreResult.eligibilityStatus === "eligible"
                    ? "Đủ điều kiện dữ liệu"
                    : scoreResult.eligibilityStatus === "ineligible"
                      ? "Không đủ điều kiện"
                      : "Chưa xác định"
                }
                className={
                  scoreResult.eligibilityStatus === "eligible"
                    ? "text-tier-high"
                    : scoreResult.eligibilityStatus === "ineligible"
                      ? "text-tier-low"
                      : "text-muted-foreground"
                }
              />
              <ResultStat
                label="Nhóm"
                value={
                  scoreResult.programGroup
                    ? PROGRAM_GROUP_LABELS[scoreResult.programGroup]
                    : "Chưa có"
                }
              />
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <ResultStat
                label={`Điểm chuẩn ${benchmarkYear}`}
                value={formatBenchmarkScore(selectedBenchmark)}
              />
              <ResultStat
                label="Điểm chuẩn quy đổi /30"
                value={
                  selectedBenchmark
                    ? formatNullableScore(
                        selectedBenchmark30,
                        "/30",
                      )
                    : "Chưa có"
                }
              />
              <ResultStat
                label="Chênh lệch /30"
                value={
                  selectedBenchmark && scoreResult.normalizedScore30 !== null
                    ? formatDifference(
                        scoreResult.normalizedScore30 -
                          (selectedBenchmark30 ?? 0),
                      )
                    : "Chưa có"
                }
                className={
                  getComparisonClass(comparisonStatus)
                }
              />
              <ResultStat
                label="Trạng thái so sánh"
                value={getComparisonLabel(comparisonStatus)}
                className={getComparisonClass(comparisonStatus)}
              />
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
              <p className="font-semibold">
                {selectedProgram
                  ? `${selectedProgram.program_code ?? "FTU"} - ${
                      selectedProgram.program_name
                    }`
                  : "Chưa chọn chương trình cụ thể"}
              </p>
              <p className="mt-2 text-muted-foreground">
                {scoreResult.explanationVi}
              </p>
              {selectedBenchmark ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Đang so sánh với benchmark cùng trường FTU, cùng năm{" "}
                  {benchmarkYear}, cùng ngành/chương trình (
                  {selectedProgram?.program_code ??
                    selectedProgram?.major_code ??
                    selectedProgram?.program_name ??
                    "-"}
                  ) và cùng phương thức {selectedBenchmark.method_code}.
                </p>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  ZPath chưa tìm thấy benchmark {benchmarkYear} cùng
                  ngành/chương trình và cùng phương thức trong bảng benchmarks,
                  nên không dùng điểm chuẩn ngành/phương thức khác để so sánh.
                </p>
              )}
            </div>

            {scoreResult.warnings.length ? (
              <div className="rounded-lg border border-tier-mid/30 bg-tier-mid-soft p-4 text-sm text-tier-mid-foreground">
                <div className="font-semibold">Lưu ý</div>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {scoreResult.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {scoreResult.missingFields.length ? (
              <p className="text-xs text-muted-foreground">
                Thiếu dữ liệu: {scoreResult.missingFields.join(", ")}
              </p>
            ) : null}

            <p className="text-xs text-muted-foreground">
              Công thức: {scoreResult.formulaCode}. normalizedScore30 chỉ dùng
              để so sánh chéo trong ZPath.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ScoreField({
  label,
  value,
  onChange,
  placeholder = "0 - 10",
  min,
  max,
  step = "0.01",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold">{label}</span>
      <Input
        type={min !== undefined || max !== undefined ? "number" : "text"}
        inputMode={min !== undefined || max !== undefined ? "decimal" : undefined}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium text-foreground">{value}</div>
    </div>
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
      <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-bold ${className ?? ""}`}>{value}</div>
    </div>
  );
}
