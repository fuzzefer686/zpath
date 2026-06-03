"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  HUST_ADMISSION_PROGRAMS_2026,
  HUST_PROGRAM_GROUP_LABELS,
  type HustAdmissionProgram2026,
  type HustSubjectKey,
  type HustThptCombinationCode,
} from "@/src/lib/admission-data/hust-programs-2026";
import {
  findBenchmarkForProgram,
  type BenchmarkMethodCode,
} from "@/src/lib/admission-data/benchmark-lookup";
import type {
  AdmissionMethod,
  AdmissionScoreResult,
  SchoolCode,
} from "@/src/lib/admission-engine";
import {
  compareHustScoreWithPreviousCutoff,
  type HustScoreComparisonResult,
} from "@/src/lib/admission-engine/modules/hust/compare";
import type {
  AdmissionMethodRecord,
  AdmissionProgram,
  Benchmark,
} from "@/src/types/admission-data";
import {
  CertificateConversionInput,
  createDefaultCertificateConversionInputValue,
  type CertificateConversionInputValue,
  type CertificateConversionStructuredValue,
} from "./CertificateConversionInput";
import { FtuAdmissionCalculator } from "./FtuAdmissionCalculator";
import {
  HUST_THPT_BOLD_NOTE,
  HustThptCombinationCode as HustThptCombinationCodeLabel,
} from "./HustThptCombinationCode";

type AdmissionCalculatorSectionProps = {
  schoolCode: string;
  programs: AdmissionProgram[];
  benchmarks: Benchmark[];
  methods: AdmissionMethodRecord[];
  benchmarkYear?: number;
};

type ApiSuccessResponse = {
  ok: true;
  data: {
    score: AdmissionScoreResult;
  };
};

type ApiErrorResponse = {
  ok: false;
  error: string;
};

type ApiResponse = ApiSuccessResponse | ApiErrorResponse;
type XttnSubtype = "portfolio_interview";

const DISCLAIMER =
  "Kết quả chỉ mang tính tham khảo dựa trên điểm chuẩn năm trước. Điểm chuẩn năm nay có thể thay đổi theo chỉ tiêu, phổ điểm, số lượng thí sinh và quy chế tuyển sinh.";

const HUST_METHODS: AdmissionMethod[] = ["XTTN", "TSA", "THPT"];
const HUST_CALCULATOR_YEAR = 2026;
const HUST_CUTOFF_YEAR = 2025;
const HUST_ENGLISH_CERTIFICATE_COMBINATIONS = new Set(["A01", "D01", "D07"]);

const METHOD_LABELS: Partial<Record<AdmissionMethod, string>> = {
  XTTN: "Xét tuyển tài năng",
  TSA: "Đánh giá tư duy",
  THPT: "Điểm thi THPT",
};

const XTTN_SUBTYPE_LABELS: Record<XttnSubtype, string> = {
  portfolio_interview: "Hồ sơ năng lực + phỏng vấn (XTTN13)",
};

const SCHOOL_LABELS: Record<SchoolCode, string> = {
  HUST: "Đại học Bách khoa Hà Nội",
  FTU: "Đại học Ngoại Thương",
  NEU: "Đại học Kinh tế Quốc dân",
  UET: "Trường Đại học Công nghệ - ĐHQGHN",
  VINUNI: "Đại học VinUni",
};

const SUBJECT_LABELS: Record<HustSubjectKey, string> = {
  math: "Toán",
  physics: "Vật lý",
  chemistry: "Hóa học",
  english: "Tiếng Anh",
  biology: "Sinh học",
  literature: "Ngữ văn",
  chinese: "Tiếng Trung",
  korean: "Tiếng Hàn",
  informatics: "Tin học",
};

const EMPTY_SUBJECT_SCORES: Record<HustSubjectKey, string> = {
  math: "",
  physics: "",
  chemistry: "",
  english: "",
  biology: "",
  literature: "",
  chinese: "",
  korean: "",
  informatics: "",
};

function isSchoolCode(value: string): value is SchoolCode {
  return value === "HUST" || value === "FTU" || value === "NEU" || value === "UET" || value === "VINUNI";
}

function isApiResponse(value: unknown): value is ApiResponse {
  if (typeof value !== "object" || value === null) return false;
  return typeof (value as { ok?: unknown }).ok === "boolean";
}

function parseScore(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`Vui lòng nhập ${label}.`);
  }

  const score = Number(trimmed);
  if (!Number.isFinite(score)) {
    throw new Error(`${label} phải là một số hợp lệ.`);
  }

  return score;
}

function parseOptionalScore(value: string, label: string) {
  if (!value.trim()) return 0;
  return parseScore(value, label);
}

function normalizeBenchmarkScore30(benchmark: Benchmark) {
  const scale = benchmark.scale ?? 30;
  return scale === 30 ? benchmark.score : (benchmark.score / scale) * 30;
}

function normalizeBenchmarkScore100(benchmark: Benchmark) {
  const scale = benchmark.scale ?? 100;
  return scale === 100 ? benchmark.score : (benchmark.score / scale) * 100;
}

function formatScore(value: number | null, suffix = "") {
  if (value === null) return "Chưa có";
  return `${value.toFixed(2)}${suffix}`;
}

function formatDifference(value: number | null) {
  if (value === null) return "Chưa có";
  return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
}

function getSubjectListLabel(subjects: HustSubjectKey[]) {
  return subjects.map((subject) => SUBJECT_LABELS[subject]).join(" + ");
}

function getVisibleSubjects(program: HustAdmissionProgram2026 | null, combinationCode: string) {
  const combination = program?.thptCombinations.find(
    (item) => item.combinationCode === combinationCode,
  );

  if (!combination) return [];
  return combination.subjects;
}

function canUseEnglishCertificate(combination: HustAdmissionProgram2026["thptCombinations"][number] | undefined) {
  return Boolean(
    combination?.subjects.includes("english") &&
      HUST_ENGLISH_CERTIFICATE_COMBINATIONS.has(combination.combinationCode),
  );
}

function getComparisonClass(status: HustScoreComparisonResult["status"]) {
  if (status === "above" || status === "equal") return "text-tier-high";
  if (status === "missing_cutoff" || status === "insufficient_data") {
    return "text-muted-foreground";
  }
  return "text-tier-low";
}

function getScoreForComparison(score: AdmissionScoreResult) {
  if (score.method === "XTTN" && score.details?.resultType === "eligibility") {
    return null;
  }

  return score.method === "THPT" ? score.normalizedScore30 : score.originalScore;
}

function getComparisonScaleLabel(method: AdmissionMethod) {
  return method === "THPT" ? "/30" : "/100";
}

function getBenchmarkMethodCode(method: AdmissionMethod): BenchmarkMethodCode {
  if (method !== "XTTN") return method;
  return "XTTN13";
}

export function AdmissionCalculatorSection({
  schoolCode,
  programs,
  benchmarks,
  methods,
  benchmarkYear = HUST_CUTOFF_YEAR,
}: AdmissionCalculatorSectionProps) {
  const isHust = schoolCode === "HUST";
  const isFtu = schoolCode === "FTU";
  const schoolLabel = isSchoolCode(schoolCode) ? SCHOOL_LABELS[schoolCode] : schoolCode;
  const [method, setMethod] = useState<AdmissionMethod>("THPT");
  const [programCode, setProgramCode] = useState(
    HUST_ADMISSION_PROGRAMS_2026[0]?.code ?? "",
  );
  const [combinationCode, setCombinationCode] =
    useState<HustThptCombinationCode>("K01");
  const [subjectScores, setSubjectScores] =
    useState<Record<HustSubjectKey, string>>(EMPTY_SUBJECT_SCORES);
  const [priorityScore, setPriorityScore] = useState("0");
  const [tsaScore, setTsaScore] = useState("");
  const xttnSubtype: XttnSubtype = "portfolio_interview";
  const [achievementScore, setAchievementScore] = useState("");
  const [bonusScore, setBonusScore] = useState("0");
  const [otherBonus, setOtherBonus] = useState("0");
  const [interviewStatus, setInterviewStatus] = useState("");
  const [useEnglishCertificate, setUseEnglishCertificate] = useState(false);
  const [languageCertificateInput, setLanguageCertificateInput] =
    useState<CertificateConversionInputValue>(createDefaultCertificateConversionInputValue);
  const [languageCertificateStructured, setLanguageCertificateStructured] =
    useState<CertificateConversionStructuredValue>(null);
  const [scoreResult, setScoreResult] = useState<AdmissionScoreResult | null>(null);
  const [comparison, setComparison] =
    useState<HustScoreComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const selectedProgram = useMemo(
    () =>
      HUST_ADMISSION_PROGRAMS_2026.find((program) => program.code === programCode) ??
      null,
    [programCode],
  );
  const selectedCombination = selectedProgram?.thptCombinations.find(
    (combination) => combination.combinationCode === combinationCode,
  );
  const visibleSubjects = getVisibleSubjects(selectedProgram, combinationCode);
  const allowEnglishCertificate = canUseEnglishCertificate(selectedCombination);
  const methodYearText = isHust ? `${HUST_CALCULATOR_YEAR}` : "Chưa hỗ trợ";
  const availableMethods = useMemo(() => {
    const methodCodes = new Set(methods.map((item) => item.method_code));
    const supportedMethods = HUST_METHODS.filter(
      (item) => methodCodes.size === 0 || methodCodes.has(item),
    );
    return supportedMethods.length ? supportedMethods : HUST_METHODS;
  }, [methods]);

  if (isFtu) {
    return (
      <FtuAdmissionCalculator
        programs={programs}
        benchmarks={benchmarks}
        benchmarkYear={benchmarkYear}
      />
    );
  }

  if (!isHust) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Calculator className="h-5 w-5 text-primary" />
            Công cụ tính điểm xét tuyển {schoolCode}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-5">
            <p className="text-sm font-semibold text-foreground">{schoolLabel}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Module tính điểm xét tuyển cho trường này: to be developed.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  function resetResult() {
    setScoreResult(null);
    setComparison(null);
    setError(null);
  }

  function updateProgram(nextProgramCode: string) {
    const nextProgram = HUST_ADMISSION_PROGRAMS_2026.find(
      (program) => program.code === nextProgramCode,
    );
    const firstCombination = nextProgram?.thptCombinations[0]?.combinationCode;

    setProgramCode(nextProgramCode);
    if (firstCombination) {
      setCombinationCode(firstCombination);
    }
    resetResult();
  }

  function buildThptPayload() {
    if (!selectedProgram) {
      throw new Error("Vui lòng chọn chương trình xét tuyển.");
    }

    if (!selectedCombination) {
      throw new Error("Chương trình này không hỗ trợ tổ hợp đã chọn.");
    }

    const scores = visibleSubjects.reduce<Partial<Record<HustSubjectKey, number>>>(
      (next, subject) => {
        if (subject === "english" && allowEnglishCertificate && useEnglishCertificate) {
          return next;
        }

        if (
          selectedCombination.formulaType === "K01" &&
          !["math", "literature"].includes(subject) &&
          !subjectScores[subject].trim()
        ) {
          return next;
        }

        next[subject] = parseScore(subjectScores[subject], `điểm ${SUBJECT_LABELS[subject]}`);
        return next;
      },
      {},
    );

    if (allowEnglishCertificate && useEnglishCertificate && !languageCertificateStructured) {
      throw new Error("Không tìm thấy mức quy đổi phù hợp.");
    }

    return {
      programCode,
      combinationCode,
      scores,
      priorityScore: parseOptionalScore(priorityScore, "điểm ưu tiên"),
      englishScoreSource:
        allowEnglishCertificate && useEnglishCertificate ? "certificate" : "exam",
      languageCertificate:
        allowEnglishCertificate && useEnglishCertificate
          ? languageCertificateStructured?.input
          : undefined,
    };
  }

  function buildPayload() {
    if (method === "THPT") return buildThptPayload();

    if (method === "TSA") {
      return {
        tsaScore: parseScore(tsaScore, "điểm Đánh giá tư duy"),
        languageCertificate: languageCertificateStructured?.input,
        useLanguageCertificateBonus: Boolean(languageCertificateStructured),
        maxScore: 100,
      };
    }

    return {
      subtype: xttnSubtype,
      tsaScore: parseScore(tsaScore, "điểm Đánh giá tư duy"),
      achievementScore: parseScore(achievementScore, "điểm thành tích"),
      bonusScoreManual: parseOptionalScore(bonusScore, "điểm thưởng thủ công"),
      languageCertificate: languageCertificateStructured?.input,
      useLanguageCertificateBonus: Boolean(languageCertificateStructured),
      otherBonus: parseOptionalScore(otherBonus, "điểm thưởng khác"),
      interviewStatus: interviewStatus.trim() || undefined,
    };
  }

  function updateLanguageCertificate(
    nextValue: CertificateConversionInputValue,
    nextStructuredValue: CertificateConversionStructuredValue,
  ) {
    setLanguageCertificateInput(nextValue);
    setLanguageCertificateStructured(nextStructuredValue);
    resetResult();
  }

  function buildComparison(score: AdmissionScoreResult) {
    const benchmarkMethodCode = getBenchmarkMethodCode(method);
    const previousBenchmark = findBenchmarkForProgram({
      schoolCode: "HUST",
      programs,
      benchmarks,
      programCode,
      method: benchmarkMethodCode,
      combinationCode: method === "THPT" ? combinationCode : undefined,
      benchmarkYear,
    });
    const previousYearCutoff = previousBenchmark
      ? method === "THPT"
        ? normalizeBenchmarkScore30(previousBenchmark)
        : normalizeBenchmarkScore100(previousBenchmark)
      : null;

    return compareHustScoreWithPreviousCutoff({
      year: score.year,
      benchmarkYear,
      programCode,
      method,
      combinationCode: method === "THPT" ? combinationCode : undefined,
      score: getScoreForComparison(score),
      previousYearCutoff,
    });
  }

  async function handleCalculate() {
    setError(null);
    setScoreResult(null);
    setComparison(null);

    if (!isHust) {
      setError("Bộ tính điểm hiện mới hỗ trợ Đại học Bách khoa Hà Nội.");
      return;
    }

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
          year: HUST_CALCULATOR_YEAR,
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
      setComparison(buildComparison(body.data.score));
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Calculator className="h-5 w-5 text-primary" />
          Công cụ tính điểm xét tuyển HUST
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-semibold">Phương thức xét tuyển</span>
            <select
              value={method}
              onChange={(event) => {
                setMethod(event.target.value as AdmissionMethod);
                resetResult();
              }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {availableMethods.map((availableMethod) => (
                <option key={availableMethod} value={availableMethod}>
                  {METHOD_LABELS[availableMethod]}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold">Chương trình tuyển sinh</span>
            <select
              value={programCode}
              onChange={(event) => updateProgram(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {HUST_ADMISSION_PROGRAMS_2026.map((program) => (
                <option key={program.code} value={program.code}>
                  {program.code} - {program.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 text-sm md:grid-cols-3">
          <InfoPill label="Năm tuyển sinh" value={methodYearText} />
          <InfoPill label="Điểm chuẩn so sánh" value={`${benchmarkYear}`} />
          <InfoPill
            label="Nhóm chương trình"
            value={
              selectedProgram
                ? HUST_PROGRAM_GROUP_LABELS[selectedProgram.group]
                : "Chưa chọn"
            }
          />
        </div>

        {method === "THPT" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-semibold">Tổ hợp xét tuyển</div>
              <div className="flex flex-wrap gap-2">
                {selectedProgram?.thptCombinations.map((combination) => (
                  <button
                    type="button"
                    key={combination.combinationCode}
                    onClick={() => {
                      setCombinationCode(combination.combinationCode);
                      resetResult();
                    }}
                    className={`min-h-10 rounded-md border px-3 py-2 text-sm transition-colors ${
                      combination.combinationCode === combinationCode
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <HustThptCombinationCodeLabel combination={combination} />{" "}
                    <span className="text-xs opacity-80">
                      {getSubjectListLabel(combination.subjects)}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-xs italic leading-5 text-muted-foreground">
                {HUST_THPT_BOLD_NOTE}
              </p>
            </div>

            {selectedCombination?.formulaType === "K01" ? (
              <p className="rounded-md bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
                K01 dùng Toán, Ngữ văn và môn cao nhất trong Lý/Hóa/Sinh/Tin học.
              </p>
            ) : null}

            {allowEnglishCertificate ? (
              <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                <div className="text-sm font-semibold">
                  Dùng chứng chỉ để quy đổi điểm tiếng Anh
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="english-score-source"
                      checked={!useEnglishCertificate}
                      onChange={() => {
                        setUseEnglishCertificate(false);
                        resetResult();
                      }}
                    />
                    <span>Dùng điểm thi THPT tiếng Anh</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="english-score-source"
                      checked={useEnglishCertificate}
                      onChange={() => {
                        setUseEnglishCertificate(true);
                        resetResult();
                      }}
                    />
                    <span>Dùng chứng chỉ để quy đổi điểm tiếng Anh</span>
                  </label>
                </div>
                {useEnglishCertificate ? (
                  <>
                    <CertificateConversionInput
                      value={languageCertificateInput}
                      onChange={updateLanguageCertificate}
                    />
                    <p className="text-xs leading-5 text-muted-foreground">
                      Điểm tiếng Anh được quy đổi từ chứng chỉ ngoại ngữ theo bảng
                      tham chiếu của HUST từ năm 2026.
                    </p>
                  </>
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-3">
              {visibleSubjects
                .filter(
                  (subject) =>
                    !(subject === "english" && allowEnglishCertificate && useEnglishCertificate),
                )
                .map((subject) => (
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
                      resetResult();
                    }}
                    placeholder={
                      selectedCombination?.formulaType === "K01" &&
                      !["math", "literature"].includes(subject)
                        ? "Có thể bỏ trống"
                        : "0 - 10"
                    }
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
                  resetResult();
                }}
              />
            </label>
          </div>
        ) : null}

        {method === "TSA" ? (
          <div className="space-y-4">
            <label className="block max-w-xs space-y-2">
              <span className="text-sm font-semibold">Điểm Đánh giá tư duy</span>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={tsaScore}
                onChange={(event) => {
                  setTsaScore(event.target.value);
                  resetResult();
                }}
                placeholder="0 - 100"
              />
            </label>

            <CertificateConversionInput
              value={languageCertificateInput}
              onChange={updateLanguageCertificate}
            />
          </div>
        ) : null}

        {method === "XTTN" ? (
          <div className="space-y-4">
            <InfoPill label="Loại xét tuyển tài năng" value={XTTN_SUBTYPE_LABELS[xttnSubtype]} />

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Điểm Đánh giá tư duy</span>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={tsaScore}
                    onChange={(event) => {
                      setTsaScore(event.target.value);
                      resetResult();
                    }}
                    placeholder="0 - 100"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Điểm thành tích</span>
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    step="0.01"
                    value={achievementScore}
                    onChange={(event) => {
                      setAchievementScore(event.target.value);
                      resetResult();
                    }}
                    placeholder="0 - 50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Điểm thưởng thủ công</span>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    step="0.01"
                    value={bonusScore}
                    onChange={(event) => {
                      setBonusScore(event.target.value);
                      resetResult();
                    }}
                    placeholder="0 - 10"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Điểm thưởng khác</span>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    step="0.01"
                    value={otherBonus}
                    onChange={(event) => {
                      setOtherBonus(event.target.value);
                      resetResult();
                    }}
                    placeholder="0 - 10"
                  />
                </label>
              </div>

              <CertificateConversionInput
                value={languageCertificateInput}
                onChange={updateLanguageCertificate}
              />

              <label className="block max-w-xs space-y-2">
                <span className="text-sm font-semibold">Kết quả phỏng vấn</span>
                <Input
                  value={interviewStatus}
                  onChange={(event) => {
                    setInterviewStatus(event.target.value);
                    resetResult();
                  }}
                  placeholder="Nếu có"
                />
              </label>
            </div>
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

        {scoreResult && comparison ? (
          <div className="space-y-5 rounded-lg border border-border bg-background p-5">
            <div className="grid gap-4 md:grid-cols-4">
              <ResultStat
                label="Điểm của bạn"
                value={
                  scoreResult.method === "XTTN" &&
                  scoreResult.details?.resultType === "eligibility"
                    ? "Đủ điều kiện hồ sơ"
                    : formatScore(
                        getScoreForComparison(scoreResult),
                        getComparisonScaleLabel(scoreResult.method),
                      )
                }
              />
              <ResultStat
                label={`Điểm chuẩn ${comparison.benchmarkYear}`}
                value={formatScore(
                  comparison.previousYearCutoff,
                  getComparisonScaleLabel(scoreResult.method),
                )}
              />
              <ResultStat
                label="Chênh lệch"
                value={formatDifference(comparison.difference)}
              />
              <ResultStat
                label="Kết quả so sánh"
                value={
                  comparison.status === "missing_cutoff"
                    ? "Chưa có dữ liệu điểm chuẩn năm trước"
                    : comparison.message
                }
                className={getComparisonClass(comparison.status)}
              />
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
              <div className="font-semibold">
                {selectedProgram?.code} - {selectedProgram?.name}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>Phương thức: {METHOD_LABELS[method]}</span>
                {method === "THPT" && selectedCombination ? (
                  <span>
                    Tổ hợp: <HustThptCombinationCodeLabel combination={selectedCombination} />
                  </span>
                ) : null}
                <span>Năm tuyển sinh: {scoreResult.year}</span>
              </div>
              <p className="mt-3 text-muted-foreground">{comparison.message}</p>
            </div>

            <p className="text-xs text-muted-foreground">
              Công thức: {scoreResult.formulaUsed}
            </p>

            <p className="rounded-lg bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
              {DISCLAIMER}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
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
