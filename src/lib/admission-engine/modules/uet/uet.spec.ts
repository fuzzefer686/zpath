import { UET_PROGRAMS_2026 } from "@/src/lib/admission-data/uet-programs-2026";
import type {
  UetAdmissionMethod,
  UetAwardMapping,
  UetCombination,
  UetProgram,
  UetSpec,
} from "./uet.types";

const programs: UetProgram[] = UET_PROGRAMS_2026.map((program) => ({
  code: program.code as UetProgram["code"],
  name: program.name,
  quota: program.quota,
  allowedCombinations: program.code === "CN10" || program.code === "CN21"
    ? ["A00", "A01", "X06", "A02"]
    : ["A00", "A01", "X06"],
  specialConditions: program.note ? [program.note] : undefined,
}));

const benchmarkThresholds = {
  thpt2025: {
    CN1: 28.19,
    CN2: 27.0,
    CN3: 25.2,
    CN4: 26.15,
    CN5: 22.25,
    CN6: 26.73,
    CN7: 23.96,
    CN8: 27.86,
    CN9: 26.63,
    CN10: 22.0,
    CN11: 27.9,
    CN12: 27.75,
    CN13: 24.87,
    CN14: 26.38,
    CN15: 26.73,
    CN17: 26.0,
    CN18: 24.2,
    CN19: 25.6,
    CN20: 27.38,
    CN21: 22.13,
  },
  hsa2024: {
    CN1: 23.5,
    CN2: 20.0,
    CN3: 17.0,
    CN4: 17.0,
    CN5: 17.0,
    CN6: 20.0,
    CN7: 17.0,
    CN8: 22.0,
    CN9: 20.0,
    CN10: 17.0,
    CN11: 22.0,
    CN12: 22.0,
    CN13: 17.0,
    CN14: 20.0,
    CN15: 20.0,
    CN17: 19.0,
    CN18: 18.0,
  },
  ielts2024: {
    CN1: 27.0,
    CN2: 26.5,
    CN3: 23.0,
    CN4: 23.0,
    CN5: 23.0,
    CN6: 24.0,
    CN7: 23.0,
    CN8: 27.0,
    CN9: 25.0,
    CN10: 23.0,
    CN11: 26.5,
    CN12: 27.0,
    CN13: 23.0,
    CN14: 25.0,
    CN15: 25.0,
    CN17: 24.0,
    CN18: 24.0,
  },
  sat2024: {
    CN1: 28.0,
    CN2: 26.25,
    CN3: 23.4,
    CN4: 23.4,
    CN5: 23.4,
    CN6: 23.4,
    CN7: 23.4,
    CN8: 27.15,
    CN9: 24.0,
    CN10: 23.4,
    CN11: 27.0,
    CN12: 27.75,
    CN13: 23.4,
    CN14: 24.0,
    CN15: 24.0,
    CN17: 23.4,
    CN18: 23.4,
  },
} as const;

const combinations: UetCombination[] = [
  { code: "A00", subjects: ["Toán", "Lý", "Hóa"], allowedPrograms: "ALL" },
  {
    code: "A01",
    subjects: ["Toán", "Lý", "Anh"],
    allowedPrograms: "ALL",
    englishReplacementAllowed: true,
  },
  { code: "X06", subjects: ["Toán", "Lý", "Tin"], allowedPrograms: "ALL" },
  {
    code: "A02",
    subjects: ["Toán", "Lý", "Sinh"],
    allowedPrograms: ["CN10", "CN21"],
    invalidPrograms: "ALL_EXCEPT_CN10_CN21",
  },
];

const admissionMethods: UetAdmissionMethod[] = [
  {
    code: "METHOD_1",
    name: "Xét tuyển thẳng",
    quotaPercentage: "5%",
    eligibility: {
      has_national_or_international_award: true,
      max_years_since_award: 3,
    },
    appliesToPrograms: "mapped_by_subject",
  },
  {
    code: "METHOD_2_1",
    name: "Xét tuyển kết quả thi THPT 2026",
    quotaPercentage: "shared_in_95_percent",
    combinations: ["A00", "A01", "X06", "A02"],
    hardConstraints: ["requires_2026_threshold"],
  },
  {
    code: "METHOD_2_2",
    name: "Xét tuyển ĐGNL (HSA)",
    quotaPercentage: "shared_in_95_percent",
    validityYears: 2,
  },
  {
    code: "METHOD_2_3",
    name: "Xét tuyển chứng chỉ SAT",
    quotaPercentage: "shared_in_95_percent",
    validityYears: 2,
  },
  {
    code: "METHOD_2_5",
    name: "Ưu tiên xét tuyển",
    type: "priority_bonus",
    eligibility: { did_not_use_METHOD_1: true, valid_award_subject: true },
  },
  {
    code: "METHOD_2_6",
    name: "Xét tuyển diện dự bị đại học",
    quotaPercentage: "1%",
    eligibility: { completed_pre_uni_program: true, graduated_year: 2025 },
    hardConstraints: ["uses_threshold_year_2025", "sorting_metric_THPT_2025_score_desc"],
  },
];

const awardSubjectMapping: UetAwardMapping[] = [
  { subject: ["Toán", "Tin học", "Vật lý", "Hóa học"], allowedPrograms: "ALL" },
  { subject: ["Sinh học"], allowedPrograms: ["CN10", "CN21"] },
];

export const uetSpec: UetSpec = {
  summary: {
    university: "Trường Đại học Công nghệ, Đại học Quốc gia Hà Nội",
    code: "QHI",
    admissionYear: 2026,
    totalQuota: 4080,
    scale: 30,
    roundingDecimalPlaces: 2,
  },
  admissionMethods,
  programs,
  scoringRules: {
    baseScale: 30,
    rounding: { mode: "HALF_UP", decimals: 2 },
    bonusPoints: {
      maxTotalBonus: 3,
      maxComponentBonus: 1.5,
      accumulationRule: "MAX_ONLY",
    },
    certificateValidation: {
      allowedTypes: ["IELTS", "TOEFL_iBT"],
      validityYears: 2,
      requiresAllSkills: 4,
      minScorePerSkill: 5,
      allowOnlineExam: false,
    },
    englishConversionLogic: {
      scenario1Replacement: {
        targetCombination: "A01",
        action: "replace_english_subject_score",
      },
      scenario2Bonus: {
        targetCombinations: ["A00", "X06", "A02"],
        action: "add_bonus_points",
        constraints: "pending_config",
      },
    },
    awardSubjectMapping,
    tieBreakRules: [
      { priority1: "aspiration_order_asc" },
      { constraint: "no_other_secondary_criteria" },
    ],
  },
  combinations,
  edgeCases: [],
  implementationNotes: [],
  unknowns: {
    needsVerification:
      "Bảng quy đổi chi tiết IELTS/TOEFL sang thang 10 và mức cộng cho A00, X06, A02 (chờ quy định của ĐHQGHN).",
    pendingConfig: "Ngưỡng đầu vào (điểm sàn) 2026 cho tất cả các ngành (chờ sau thi THPT).",
    unknown:
      "Ngưỡng ĐBCL 2025 của một số ngành (CN1, CN2, CN8...) diện Dự bị đại học bị trống trong PDF.",
  },
};
