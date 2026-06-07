"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { findBenchmarkForProgram } from "@/src/lib/admission-data/benchmark-lookup";
import {
  FTU_ADMISSION_PROGRAMS_2026,
  FTU_COMBINATIONS_2026,
  FTU_FORMULA_GROUP_LABELS,
  FTU_LOCATION_LABELS,
  FTU_SUBJECT_LABELS,
  getFtuProgram2026,
  type FtuAdmissionProgram2026,
} from "@/src/lib/admission-data/ftu-programs-2026";
import {
  FTU_AWARD_LABELS,
  FTU_OBJECT_PRIORITY_30,
  FTU_REGION_PRIORITY_30,
} from "@/src/lib/admission-data/ftu-priority-2026";
import type {
  AdmissionChanceEvaluation,
  AdmissionScoreResult,
} from "@/src/lib/admission-engine";
import type {
  FtuAwardType,
  FtuCombinationCode,
  FtuDgnlTestType,
  FtuEnglishCertType,
  FtuSubjectKey,
  FtuXttObject,
} from "@/src/lib/admission-engine/modules/ftu/ftu.types";
import type { AdmissionProgram, Benchmark } from "@/src/types/admission-data";

type FtuMethod = "HOC_BA" | "THPT" | "DGNL" | "XTT";

type FtuAdmissionCalculatorProps = {
  programs: AdmissionProgram[];
  benchmarks: Benchmark[];
  benchmarkYear?: number;
};

type ApiResponse =
  | { ok: true; data: { score: AdmissionScoreResult; chance: AdmissionChanceEvaluation | null } }
  | { ok: false; error: string };

const FTU_CALCULATOR_YEAR = 2026;

const METHOD_LABELS: Record<FtuMethod, string> = {
  HOC_BA: "Học bạ THPT",
  THPT: "Điểm thi tốt nghiệp THPT",
  DGNL: "ĐGNL/ĐGTD & Quốc tế",
  XTT: "Xét tuyển thẳng",
};

const TEST_LABELS: Record<FtuDgnlTestType, string> = {
  HSA: "ĐGNL ĐHQG Hà Nội (HSA)",
  VACT: "ĐGNL ĐHQG TP.HCM (V-ACT)",
  TSA: "ĐGTD ĐH Bách khoa Hà Nội (TSA)",
  SAT: "SAT",
  ACT: "ACT",
  ALEVEL: "A-Level",
};

const ALLOWED_TESTS_BY_GROUP: Record<1 | 2 | 3, FtuDgnlTestType[]> = {
  1: ["HSA", "VACT", "SAT", "ACT", "ALEVEL"],
  2: ["HSA", "VACT", "TSA", "SAT", "ACT"],
  3: ["HSA", "SAT", "ACT", "ALEVEL"],
};

const ENGLISH_CERT_LABELS: Record<FtuEnglishCertType, string> = {
  IELTS: "IELTS (Academic)",
  TOEFL_IBT: "TOEFL iBT",
  CAMBRIDGE: "Cambridge English Scale",
};

const REGION_LABELS: Record<keyof typeof FTU_REGION_PRIORITY_30, string> = {
  KV1: "Khu vực 1 (KV1)",
  "KV2-NT": "Khu vực 2 - Nông thôn (KV2-NT)",
  KV2: "Khu vực 2 (KV2)",
  KV3: "Khu vực 3 (KV3)",
};

const OBJECT_PRIORITY_LABELS: Record<keyof typeof FTU_OBJECT_PRIORITY_30, string> = {
  UT1: "Nhóm ưu tiên 1 (đối tượng 01-04)",
  UT2: "Nhóm ưu tiên 2 (đối tượng 05-07)",
  NONE: "Không thuộc đối tượng ưu tiên",
};

const XTT_OBJECT_LABELS: Record<FtuXttObject, string> = {
  a: "Anh hùng lao động / LLVT / Chiến sĩ thi đua toàn quốc",
  b: "Tham gia/đạt giải Olympic quốc tế",
  c: "Giải Nhất/Nhì/Ba HSG cấp Quốc gia",
  d: "Giải chính thức cuộc thi nghệ thuật quốc tế",
  e: "Người khuyết tật đặc biệt nặng",
  f: "Người nước ngoài / học THPT ở nước ngoài",
  g: "Dân tộc thiểu số rất ít người",
};

const COMPARABLE_METHODS: FtuMethod[] = ["HOC_BA", "THPT", "DGNL"];

function isApiResponse(value: unknown): value is ApiResponse {
  return typeof value === "object" && value !== null && "ok" in value;
}

function parseScore(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`Vui lòng nhập ${label}.`);
  const score = Number(trimmed);
  if (!Number.isFinite(score)) throw new Error(`${label} phải là một số hợp lệ.`);
  return score;
}

function parseOptionalScore(value: string) {
  if (!value.trim()) return undefined;
  const score = Number(value);
  return Number.isFinite(score) ? score : undefined;
}

function normalizeBenchmarkScore30(benchmark: Benchmark) {
  const scale = benchmark.scale ?? 30;
  return scale === 30 ? benchmark.score : (benchmark.score / scale) * 30;
}

function formatScore(value: number | null | undefined, suffix = "") {
  if (value === null || value === undefined) return "Chưa có";
  return `${value.toFixed(2)}${suffix}`;
}

type CertificateState = {
  kind: "english" | "other";
  englishType: FtuEnglishCertType;
  englishValue: string;
  otherType: "JLPT" | "EJU" | "HSK" | "DELF_DALF";
  jlptLevel: "N1" | "N2" | "N3";
  hskLevel: "3" | "4" | "5" | "6";
  hskk: "TRUNG_CAP" | "CAO_CAP";
  hskkScore: string;
  delfLevel: "DELF_B1" | "DELF_B2" | "DALF_C1" | "DALF_C2";
  otherScore: string;
};

const DEFAULT_CERTIFICATE: CertificateState = {
  kind: "english",
  englishType: "IELTS",
  englishValue: "",
  otherType: "JLPT",
  jlptLevel: "N3",
  hskLevel: "4",
  hskk: "TRUNG_CAP",
  hskkScore: "",
  delfLevel: "DELF_B2",
  otherScore: "",
};

function buildCertificatePayload(cert: CertificateState) {
  if (cert.kind === "english") {
    return {
      kind: "english" as const,
      type: cert.englishType,
      value: parseScore(cert.englishValue, "điểm chứng chỉ tiếng Anh"),
    };
  }

  switch (cert.otherType) {
    case "JLPT":
      return {
        kind: "other" as const,
        type: "JLPT" as const,
        level: cert.jlptLevel,
        score: parseOptionalScore(cert.otherScore),
      };
    case "EJU":
      return {
        kind: "other" as const,
        type: "EJU" as const,
        score: parseScore(cert.otherScore, "điểm EJU"),
      };
    case "HSK":
      return {
        kind: "other" as const,
        type: "HSK" as const,
        level: Number(cert.hskLevel) as 3 | 4 | 5 | 6,
        score: parseOptionalScore(cert.otherScore),
        hskk: cert.hskk,
        hskkScore: parseScore(cert.hskkScore, "điểm HSKK"),
      };
    case "DELF_DALF":
      return {
        kind: "other" as const,
        type: "DELF_DALF" as const,
        level: cert.delfLevel,
        score: parseOptionalScore(cert.otherScore),
      };
    default:
      throw new Error("Loại chứng chỉ ngoại ngữ không hợp lệ.");
  }
}

function getSubjectHint(
  program: FtuAdmissionProgram2026,
  subject: FtuSubjectKey,
): string {
  if (program.formulaGroup === 2 && subject === "math") return " (hệ số 2)";
  if (program.formulaGroup === 3 && subject === "literature") return " (hệ số 1.5)";
  if (
    program.formulaGroup === 3 &&
    subject !== "math" &&
    subject !== "literature"
  ) {
    return " (hệ số 1.5)";
  }
  return "";
}

export function FtuAdmissionCalculator({
  programs,
  benchmarks,
  benchmarkYear = 2025,
}: FtuAdmissionCalculatorProps) {
  const [method, setMethod] = useState<FtuMethod>("THPT");
  const [programCode, setProgramCode] = useState(
    FTU_ADMISSION_PROGRAMS_2026[0]?.code ?? "",
  );
  const selectedProgram = useMemo(
    () => getFtuProgram2026(programCode),
    [programCode],
  );
  const [combinationCode, setCombinationCode] = useState<FtuCombinationCode>(
    (selectedProgram?.combinations[0] as FtuCombinationCode) ?? "A00",
  );
  const [subjectScores, setSubjectScores] = useState<Record<string, string>>({});
  const [useCertificate, setUseCertificate] = useState(false);
  const [certificate, setCertificate] = useState<CertificateState>(DEFAULT_CERTIFICATE);

  const [testType, setTestType] = useState<FtuDgnlTestType>("HSA");
  const [testScore, setTestScore] = useState("");
  const [hsaSection, setHsaSection] = useState<"science" | "english">("science");
  const [aLevelMath, setALevelMath] = useState("A");
  const [aLevelOther, setALevelOther] = useState("A");

  const [xttObject, setXttObject] = useState<FtuXttObject>("c");
  const [xttTotal, setXttTotal] = useState("");

  const [region, setRegion] = useState<keyof typeof FTU_REGION_PRIORITY_30>("KV3");
  const [objectPriority, setObjectPriority] =
    useState<keyof typeof FTU_OBJECT_PRIORITY_30>("NONE");
  const [award, setAward] = useState<FtuAwardType | "NONE">("NONE");

  const [scoreResult, setScoreResult] = useState<AdmissionScoreResult | null>(null);
  const [chance, setChance] = useState<AdmissionChanceEvaluation | null>(null);
  const [previousCutoff30, setPreviousCutoff30] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const combination = FTU_COMBINATIONS_2026[combinationCode];
  const allowCertificate = Boolean(combination?.foreignLanguage);
  const availableTests = selectedProgram
    ? ALLOWED_TESTS_BY_GROUP[selectedProgram.formulaGroup]
    : [];
  const isInternationalTest =
    testType === "SAT" || testType === "ACT" || testType === "ALEVEL";

  function resetResult() {
    setScoreResult(null);
    setChance(null);
    setPreviousCutoff30(null);
    setError(null);
  }

  function updateProgram(nextCode: string) {
    const next = getFtuProgram2026(nextCode);
    setProgramCode(nextCode);
    if (next) {
      setCombinationCode(next.combinations[0] as FtuCombinationCode);
      const allowedTests = ALLOWED_TESTS_BY_GROUP[next.formulaGroup];
      if (!allowedTests.includes(testType)) {
        setTestType(allowedTests[0]);
      }
    }
    setSubjectScores({});
    setUseCertificate(false);
    resetResult();
  }

  function buildPriorityPayload() {
    const awards = award === "NONE" ? [] : [award];
    return {
      regionPriority: FTU_REGION_PRIORITY_30[region],
      subjectPriority: FTU_OBJECT_PRIORITY_30[objectPriority],
      awards,
    };
  }

  function buildSubjectPayload() {
    if (!selectedProgram || !combination) {
      throw new Error("Vui lòng chọn chương trình và tổ hợp.");
    }
    const requiredSubjects = useCertificate
      ? combination.subjects.filter((subject) => subject !== combination.foreignLanguage)
      : combination.subjects;

    const scores = requiredSubjects.reduce<Record<string, number>>((next, subject) => {
      next[subject] = parseScore(
        subjectScores[subject] ?? "",
        `điểm ${FTU_SUBJECT_LABELS[subject]}`,
      );
      return next;
    }, {});

    return {
      programCode,
      combinationCode,
      scores,
      useCertificate,
      certificate: useCertificate ? buildCertificatePayload(certificate) : undefined,
      priority: buildPriorityPayload(),
    };
  }

  function buildDgnlPayload() {
    if (!selectedProgram) throw new Error("Vui lòng chọn chương trình.");
    return {
      programCode,
      testType,
      testScore: isInternationalTest && testType === "ALEVEL"
        ? undefined
        : parseScore(testScore, "điểm bài thi"),
      hsaSection: testType === "HSA" ? hsaSection : undefined,
      certificate: isInternationalTest ? buildCertificatePayload(certificate) : undefined,
      aLevelMath: testType === "ALEVEL" ? aLevelMath : undefined,
      aLevelOther: testType === "ALEVEL" ? aLevelOther : undefined,
      priority: buildPriorityPayload(),
    };
  }

  function buildXttPayload() {
    return {
      programCode,
      object: xttObject,
      totalThreeSubjects: xttObject === "d" ? parseScore(xttTotal, "tổng điểm 3 môn") : undefined,
    };
  }

  function buildPayload() {
    if (method === "HOC_BA" || method === "THPT") return buildSubjectPayload();
    if (method === "DGNL") return buildDgnlPayload();
    return buildXttPayload();
  }

  function lookupPreviousCutoff30() {
    if (!COMPARABLE_METHODS.includes(method)) return null;
    const benchmark = findBenchmarkForProgram({
      schoolCode: "FTU",
      programs,
      benchmarks,
      programCode,
      method,
      combinationCode:
        method === "HOC_BA" || method === "THPT" ? combinationCode : undefined,
      benchmarkYear,
    });
    return benchmark ? normalizeBenchmarkScore30(benchmark) : null;
  }

  async function handleCalculate() {
    resetResult();
    setIsCalculating(true);

    try {
      const cutoff30 = lookupPreviousCutoff30();
      const response = await fetch("/api/admission/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolCode: "FTU",
          method,
          year: FTU_CALCULATOR_YEAR,
          payload: buildPayload(),
          benchmark30: cutoff30 ?? undefined,
        }),
      });
      const body: unknown = await response.json();
      if (!isApiResponse(body)) throw new Error("Phản hồi từ API không hợp lệ.");
      if (!body.ok) throw new Error(body.error);

      setScoreResult(body.data.score);
      setChance(body.data.chance);
      setPreviousCutoff30(cutoff30);
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

  const visibleSubjects = combination
    ? useCertificate
      ? combination.subjects.filter((subject) => subject !== combination.foreignLanguage)
      : combination.subjects
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Calculator className="h-5 w-5 text-primary" />
          Công cụ tính điểm xét tuyển FTU
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-semibold">Phương thức xét tuyển</span>
            <select
              value={method}
              onChange={(event) => {
                setMethod(event.target.value as FtuMethod);
                resetResult();
              }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {(Object.keys(METHOD_LABELS) as FtuMethod[]).map((value) => (
                <option key={value} value={value}>
                  {METHOD_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold">Chương trình / Mã xét tuyển</span>
            <select
              value={programCode}
              onChange={(event) => updateProgram(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {FTU_ADMISSION_PROGRAMS_2026.map((program) => (
                <option key={program.code} value={program.code}>
                  {program.code} - {program.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 text-sm md:grid-cols-3">
          <InfoPill label="Năm tuyển sinh" value={`${FTU_CALCULATOR_YEAR}`} />
          <InfoPill
            label="Cơ sở"
            value={selectedProgram ? FTU_LOCATION_LABELS[selectedProgram.location] : "-"}
          />
          <InfoPill
            label="Nhóm công thức"
            value={
              selectedProgram
                ? FTU_FORMULA_GROUP_LABELS[selectedProgram.formulaGroup]
                : "-"
            }
          />
        </div>

        {(method === "HOC_BA" || method === "THPT") && selectedProgram ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-semibold">Tổ hợp xét tuyển</div>
              <div className="flex flex-wrap gap-2">
                {selectedProgram.combinations.map((code) => (
                  <button
                    type="button"
                    key={code}
                    onClick={() => {
                      setCombinationCode(code as FtuCombinationCode);
                      setUseCertificate(false);
                      resetResult();
                    }}
                    className={`min-h-10 rounded-md border px-3 py-2 text-sm transition-colors ${
                      code === combinationCode
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {code}{" "}
                    <span className="text-xs opacity-80">
                      {FTU_COMBINATIONS_2026[code as FtuCombinationCode].subjects
                        .map((subject) => FTU_SUBJECT_LABELS[subject])
                        .join(" + ")}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {allowCertificate ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useCertificate}
                  onChange={(event) => {
                    setUseCertificate(event.target.checked);
                    resetResult();
                  }}
                />
                <span>Kết hợp chứng chỉ ngoại ngữ quốc tế (thay điểm môn ngoại ngữ)</span>
              </label>
            ) : null}

            <div className="grid gap-4 md:grid-cols-3">
              {visibleSubjects.map((subject) => (
                <label key={subject} className="space-y-2">
                  <span className="text-sm font-semibold">
                    {FTU_SUBJECT_LABELS[subject]}
                    {getSubjectHint(selectedProgram, subject)}
                  </span>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    step="0.01"
                    value={subjectScores[subject] ?? ""}
                    onChange={(event) => {
                      setSubjectScores((current) => ({
                        ...current,
                        [subject]: event.target.value,
                      }));
                      resetResult();
                    }}
                    placeholder="0 - 10"
                  />
                </label>
              ))}
            </div>

            {useCertificate ? (
              <CertificateForm
                certificate={certificate}
                onChange={(next) => {
                  setCertificate(next);
                  resetResult();
                }}
              />
            ) : null}

            <PriorityForm
              region={region}
              objectPriority={objectPriority}
              award={award}
              onRegion={(value) => {
                setRegion(value);
                resetResult();
              }}
              onObject={(value) => {
                setObjectPriority(value);
                resetResult();
              }}
              onAward={(value) => {
                setAward(value);
                resetResult();
              }}
            />
          </div>
        ) : null}

        {method === "DGNL" && selectedProgram ? (
          <div className="space-y-4">
            <label className="block max-w-sm space-y-2">
              <span className="text-sm font-semibold">Loại bài thi</span>
              <select
                value={testType}
                onChange={(event) => {
                  setTestType(event.target.value as FtuDgnlTestType);
                  resetResult();
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {availableTests.map((value) => (
                  <option key={value} value={value}>
                    {TEST_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>

            {testType === "HSA" ? (
              <label className="block max-w-sm space-y-2">
                <span className="text-sm font-semibold">HSA - Phần 3</span>
                <select
                  value={hsaSection}
                  onChange={(event) => {
                    setHsaSection(event.target.value as "science" | "english");
                    resetResult();
                  }}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="science">Khoa học (Vật lý + Hóa học)</option>
                  <option value="english">Tiếng Anh</option>
                </select>
              </label>
            ) : null}

            {testType !== "ALEVEL" ? (
              <label className="block max-w-sm space-y-2">
                <span className="text-sm font-semibold">
                  Điểm {TEST_LABELS[testType]}
                </span>
                <Input
                  type="number"
                  step="0.01"
                  value={testScore}
                  onChange={(event) => {
                    setTestScore(event.target.value);
                    resetResult();
                  }}
                  placeholder={
                    testType === "HSA"
                      ? "Thang 150"
                      : testType === "VACT"
                        ? "Thang 1200"
                        : testType === "TSA"
                          ? "Thang 100"
                          : testType === "SAT"
                            ? "400 - 1600"
                            : "1 - 36"
                  }
                />
              </label>
            ) : (
              <div className="grid max-w-md gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold">A-Level môn Toán</span>
                  <select
                    value={aLevelMath}
                    onChange={(event) => {
                      setALevelMath(event.target.value);
                      resetResult();
                    }}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {["A*", "A", "B", "C", "D", "E"].map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold">A-Level môn khác Toán</span>
                  <select
                    value={aLevelOther}
                    onChange={(event) => {
                      setALevelOther(event.target.value);
                      resetResult();
                    }}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {["A*", "A", "B", "C", "D", "E"].map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {isInternationalTest ? (
              <CertificateForm
                certificate={certificate}
                onChange={(next) => {
                  setCertificate(next);
                  resetResult();
                }}
              />
            ) : null}

            <PriorityForm
              region={region}
              objectPriority={objectPriority}
              award={award}
              onRegion={(value) => {
                setRegion(value);
                resetResult();
              }}
              onObject={(value) => {
                setObjectPriority(value);
                resetResult();
              }}
              onAward={(value) => {
                setAward(value);
                resetResult();
              }}
            />
          </div>
        ) : null}

        {method === "XTT" ? (
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold">Đối tượng xét tuyển thẳng</span>
              <select
                value={xttObject}
                onChange={(event) => {
                  setXttObject(event.target.value as FtuXttObject);
                  resetResult();
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {(Object.keys(XTT_OBJECT_LABELS) as FtuXttObject[]).map((value) => (
                  <option key={value} value={value}>
                    {XTT_OBJECT_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>

            {xttObject === "d" ? (
              <label className="block max-w-sm space-y-2">
                <span className="text-sm font-semibold">
                  Tổng điểm 3 môn thi TN THPT (gồm ưu tiên)
                </span>
                <Input
                  type="number"
                  step="0.01"
                  value={xttTotal}
                  onChange={(event) => {
                    setXttTotal(event.target.value);
                    resetResult();
                  }}
                  placeholder=">= 24.0"
                />
              </label>
            ) : null}
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
          <div className="space-y-4 rounded-lg border border-border bg-background p-5">
            {scoreResult.method === "XTT" ? (
              <ResultStat
                label="Kết quả sơ bộ"
                value={
                  scoreResult.details?.eligible
                    ? "Đủ điều kiện sơ bộ xét tuyển thẳng"
                    : "Chưa đủ điều kiện theo tiêu chí"
                }
                className={
                  scoreResult.details?.eligible ? "text-tier-high" : "text-tier-low"
                }
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-4">
                <ResultStat
                  label={`Điểm của bạn (thang ${scoreResult.originalScale})`}
                  value={formatScore(scoreResult.originalScore)}
                />
                <ResultStat
                  label="Quy đổi thang 30"
                  value={formatScore(scoreResult.normalizedScore30, "/30")}
                />
                <ResultStat
                  label={`Điểm chuẩn ${benchmarkYear} (thang 30)`}
                  value={formatScore(previousCutoff30, "/30")}
                />
                <ResultStat
                  label="Mức cơ hội"
                  value={chance ? chance.label : "Chưa có dữ liệu"}
                />
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Công thức: {scoreResult.formulaUsed}
            </p>
            {scoreResult.warnings?.length ? (
              <ul className="space-y-1 rounded-lg bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
                {scoreResult.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CertificateForm({
  certificate,
  onChange,
}: {
  certificate: CertificateState;
  onChange: (next: CertificateState) => void;
}) {
  const update = (patch: Partial<CertificateState>) =>
    onChange({ ...certificate, ...patch });

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <div className="text-sm font-semibold">Chứng chỉ ngoại ngữ quốc tế (CCNNQT)</div>
      <div className="flex flex-wrap gap-3 text-sm">
        <label className="inline-flex items-center gap-2">
          <input
            type="radio"
            name="ftu-cert-kind"
            checked={certificate.kind === "english"}
            onChange={() => update({ kind: "english" })}
          />
          <span>Tiếng Anh</span>
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="radio"
            name="ftu-cert-kind"
            checked={certificate.kind === "other"}
            onChange={() => update({ kind: "other" })}
          />
          <span>Ngoại ngữ khác</span>
        </label>
      </div>

      {certificate.kind === "english" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold">Loại chứng chỉ</span>
            <select
              value={certificate.englishType}
              onChange={(event) =>
                update({ englishType: event.target.value as FtuEnglishCertType })
              }
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {(Object.keys(ENGLISH_CERT_LABELS) as FtuEnglishCertType[]).map((value) => (
                <option key={value} value={value}>
                  {ENGLISH_CERT_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Điểm/Mức</span>
            <Input
              type="number"
              step="0.5"
              value={certificate.englishValue}
              onChange={(event) => update({ englishValue: event.target.value })}
              placeholder={certificate.englishType === "IELTS" ? "VD: 7.0" : "Điểm số"}
            />
          </label>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold">Loại chứng chỉ</span>
            <select
              value={certificate.otherType}
              onChange={(event) =>
                update({ otherType: event.target.value as CertificateState["otherType"] })
              }
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="JLPT">JLPT (Tiếng Nhật)</option>
              <option value="EJU">EJU (Du học Nhật)</option>
              <option value="HSK">HSK + HSKK (Tiếng Trung)</option>
              <option value="DELF_DALF">DELF/DALF (Tiếng Pháp)</option>
            </select>
          </label>

          {certificate.otherType === "JLPT" ? (
            <>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Cấp độ</span>
                <select
                  value={certificate.jlptLevel}
                  onChange={(event) =>
                    update({ jlptLevel: event.target.value as CertificateState["jlptLevel"] })
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="N3">N3</option>
                  <option value="N2">N2</option>
                  <option value="N1">N1</option>
                </select>
              </label>
              {certificate.jlptLevel === "N3" ? (
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Điểm N3 (0-180)</span>
                  <Input
                    type="number"
                    value={certificate.otherScore}
                    onChange={(event) => update({ otherScore: event.target.value })}
                    placeholder=">= 95"
                  />
                </label>
              ) : null}
            </>
          ) : null}

          {certificate.otherType === "EJU" ? (
            <label className="space-y-2">
              <span className="text-sm font-semibold">Điểm môn tiếng Nhật (0-340)</span>
              <Input
                type="number"
                value={certificate.otherScore}
                onChange={(event) => update({ otherScore: event.target.value })}
                placeholder=">= 160"
              />
            </label>
          ) : null}

          {certificate.otherType === "HSK" ? (
            <>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Cấp HSK</span>
                <select
                  value={certificate.hskLevel}
                  onChange={(event) =>
                    update({ hskLevel: event.target.value as CertificateState["hskLevel"] })
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="3">HSK3</option>
                  <option value="4">HSK4</option>
                  <option value="5">HSK5</option>
                  <option value="6">HSK6</option>
                </select>
              </label>
              {certificate.hskLevel === "4" ? (
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Điểm HSK4 (0-300)</span>
                  <Input
                    type="number"
                    value={certificate.otherScore}
                    onChange={(event) => update({ otherScore: event.target.value })}
                    placeholder=">= 180"
                  />
                </label>
              ) : null}
              <label className="space-y-2">
                <span className="text-sm font-semibold">HSKK</span>
                <select
                  value={certificate.hskk}
                  onChange={(event) =>
                    update({ hskk: event.target.value as CertificateState["hskk"] })
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="TRUNG_CAP">HSKK Trung cấp</option>
                  <option value="CAO_CAP">HSKK Cao cấp</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Điểm HSKK (0-100)</span>
                <Input
                  type="number"
                  value={certificate.hskkScore}
                  onChange={(event) => update({ hskkScore: event.target.value })}
                  placeholder=">= 60"
                />
              </label>
            </>
          ) : null}

          {certificate.otherType === "DELF_DALF" ? (
            <>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Văn bằng</span>
                <select
                  value={certificate.delfLevel}
                  onChange={(event) =>
                    update({ delfLevel: event.target.value as CertificateState["delfLevel"] })
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="DELF_B1">DELF B1</option>
                  <option value="DELF_B2">DELF B2</option>
                  <option value="DALF_C1">DALF C1</option>
                  <option value="DALF_C2">DALF C2</option>
                </select>
              </label>
              {certificate.delfLevel === "DELF_B1" ? (
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Điểm DELF B1 (0-100)</span>
                  <Input
                    type="number"
                    value={certificate.otherScore}
                    onChange={(event) => update({ otherScore: event.target.value })}
                    placeholder=">= 50"
                  />
                </label>
              ) : null}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

function PriorityForm({
  region,
  objectPriority,
  award,
  onRegion,
  onObject,
  onAward,
}: {
  region: keyof typeof FTU_REGION_PRIORITY_30;
  objectPriority: keyof typeof FTU_OBJECT_PRIORITY_30;
  award: FtuAwardType | "NONE";
  onRegion: (value: keyof typeof FTU_REGION_PRIORITY_30) => void;
  onObject: (value: keyof typeof FTU_OBJECT_PRIORITY_30) => void;
  onAward: (value: FtuAwardType | "NONE") => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <label className="space-y-2">
        <span className="text-sm font-semibold">Khu vực ưu tiên</span>
        <select
          value={region}
          onChange={(event) =>
            onRegion(event.target.value as keyof typeof FTU_REGION_PRIORITY_30)
          }
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {(Object.keys(REGION_LABELS) as (keyof typeof FTU_REGION_PRIORITY_30)[]).map(
            (value) => (
              <option key={value} value={value}>
                {REGION_LABELS[value]}
              </option>
            ),
          )}
        </select>
      </label>

      <label className="space-y-2">
        <span className="text-sm font-semibold">Đối tượng ưu tiên</span>
        <select
          value={objectPriority}
          onChange={(event) =>
            onObject(event.target.value as keyof typeof FTU_OBJECT_PRIORITY_30)
          }
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {(Object.keys(OBJECT_PRIORITY_LABELS) as (keyof typeof FTU_OBJECT_PRIORITY_30)[]).map(
            (value) => (
              <option key={value} value={value}>
                {OBJECT_PRIORITY_LABELS[value]}
              </option>
            ),
          )}
        </select>
      </label>

      <label className="space-y-2">
        <span className="text-sm font-semibold">Điểm thưởng (giải thưởng)</span>
        <select
          value={award}
          onChange={(event) => onAward(event.target.value as FtuAwardType | "NONE")}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="NONE">Không có</option>
          {(Object.keys(FTU_AWARD_LABELS) as FtuAwardType[]).map((value) => (
            <option key={value} value={value}>
              {FTU_AWARD_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
    </div>
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
      <div className={`mt-1 text-xl font-bold ${className ?? ""}`}>{value}</div>
    </div>
  );
}
