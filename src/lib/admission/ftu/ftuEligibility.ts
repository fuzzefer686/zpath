import type {
  EligibilityResult,
  FTUScoringInput,
  ValidationResult,
} from "./ftuTypes";

const INCOMPLETE_QUALITY_WARNING =
  "Chưa đủ dữ liệu để kiểm tra toàn bộ điều kiện nộp hồ sơ của FTU.";

function addUnique(target: string[], value: string) {
  if (!target.includes(value)) target.push(value);
}

function validateSubjectScore(
  value: number | undefined,
  fieldName: string,
  missingFields: string[],
  warnings: string[],
) {
  if (value === undefined) {
    addUnique(missingFields, fieldName);
    return;
  }
  if (!Number.isFinite(value) || value < 0 || value > 10) {
    addUnique(warnings, `${fieldName} phải nằm trong khoảng 0-10.`);
  }
}

function validateNonNegative(
  value: number | undefined,
  fieldName: string,
  warnings: string[],
) {
  if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
    addUnique(warnings, `${fieldName} phải là số không âm.`);
  }
}

function requireProgramGroup(input: FTUScoringInput, missingFields: string[]) {
  if (input.method !== "DIRECT_ADMISSION" && !input.programGroup) {
    addUnique(missingFields, "programGroup");
  }
}

function validateCommon(input: FTUScoringInput) {
  const missingFields: string[] = [];
  const warnings: string[] = [];

  if (input.schoolCode !== "FTU") addUnique(warnings, "schoolCode phải là FTU.");
  if (input.admissionYear !== 2025 && input.admissionYear !== 2026) {
    addUnique(warnings, "admissionYear phải là 2025 hoặc 2026.");
  }
  validateNonNegative(input.priorityPoint, "priorityPoint", warnings);
  validateNonNegative(input.bonusPoint, "bonusPoint", warnings);
  requireProgramGroup(input, missingFields);

  return { missingFields, warnings };
}

export function validateFTUInput(input: FTUScoringInput): ValidationResult {
  const { missingFields, warnings } = validateCommon(input);
  const subjects = input.subjects ?? {};

  if (
    input.method === "ACADEMIC_TRANSCRIPT_3_SUBJECTS" ||
    input.method === "THPT_3_SUBJECTS"
  ) {
    validateSubjectScore(subjects.m1, "subjects.m1", missingFields, warnings);
    validateSubjectScore(subjects.m2, "subjects.m2", missingFields, warnings);
    validateSubjectScore(subjects.m3, "subjects.m3", missingFields, warnings);
  }

  if (
    input.method === "ACADEMIC_TRANSCRIPT_WITH_LANGUAGE_CERT" ||
    input.method === "THPT_WITH_LANGUAGE_CERT"
  ) {
    validateSubjectScore(subjects.m1, "subjects.m1", missingFields, warnings);
    validateSubjectScore(subjects.m2, "subjects.m2", missingFields, warnings);
    if (
      input.certificate?.convertedScore === undefined &&
      input.certificate?.rawScore === undefined
    ) {
      addUnique(missingFields, "certificate.rawScore");
    }
  }

  if (input.method === "DOMESTIC_ASSESSMENT") {
    if (!input.assessment?.examType) addUnique(missingFields, "assessment.examType");
    if (input.assessment?.examScore === undefined) {
      addUnique(missingFields, "assessment.examScore");
    }
  }

  if (input.method === "INTERNATIONAL_ASSESSMENT_WITH_LANGUAGE_CERT") {
    if (!input.assessment?.examType) addUnique(missingFields, "assessment.examType");
    if (input.assessment?.examType === "A_LEVEL") {
      if (
        input.assessment.aLevelMathConvertedScore === undefined &&
        input.assessment.convertedAssessmentScore === undefined &&
        input.assessment.examScore === undefined
      ) {
        addUnique(missingFields, "assessment.aLevelMathConvertedScore");
      }
      if (input.assessment.aLevelOtherConvertedScore === undefined) {
        addUnique(missingFields, "assessment.aLevelOtherConvertedScore");
      }
    } else if (
      input.assessment?.convertedAssessmentScore === undefined &&
      input.assessment?.examScore === undefined
    ) {
      addUnique(missingFields, "assessment.examScore");
    }
    if (
      input.certificate?.convertedScore === undefined &&
      input.certificate?.rawScore === undefined
    ) {
      addUnique(missingFields, "certificate.rawScore");
    }
  }

  return {
    status: warnings.length ? "invalid" : missingFields.length ? "unknown" : "valid",
    missingFields,
    warnings,
  };
}

export function validateFTUEligibility(input: FTUScoringInput): EligibilityResult {
  const validation = validateFTUInput(input);
  const missingFields = [...validation.missingFields];
  const warnings = [...validation.warnings];
  let eligibilityStatus: EligibilityResult["eligibilityStatus"] =
    validation.status === "invalid"
      ? "ineligible"
      : validation.status === "unknown"
        ? "unknown"
        : "eligible";

  if (
    input.method === "ACADEMIC_TRANSCRIPT_3_SUBJECTS" ||
    input.method === "ACADEMIC_TRANSCRIPT_WITH_LANGUAGE_CERT"
  ) {
    if (input.transcriptEligibilityAverage === undefined) {
      addUnique(warnings, INCOMPLETE_QUALITY_WARNING);
      if (eligibilityStatus === "eligible") eligibilityStatus = "unknown";
    }
  }

  if (
    input.method === "THPT_3_SUBJECTS" ||
    input.method === "THPT_WITH_LANGUAGE_CERT"
  ) {
    if (input.thptCombinationTotal === undefined) {
      addUnique(warnings, INCOMPLETE_QUALITY_WARNING);
      if (eligibilityStatus === "eligible") eligibilityStatus = "unknown";
    }
  }

  if (input.method === "DOMESTIC_ASSESSMENT") {
    const examType = input.assessment?.examType;
    const examScore = input.assessment?.examScore;

    if (examType === "HSA") {
      if (examScore !== undefined && examScore < 100) {
        eligibilityStatus = "ineligible";
        addUnique(warnings, "Điểm HSA chưa đạt ngưỡng tối thiểu 100/150 của FTU.");
      }
      if (input.programGroup === "COMMERCIAL_LANGUAGE") {
        addUnique(
          warnings,
          "Chưa đủ dữ liệu để kiểm tra điều kiện thành phần Tiếng Anh trong bài HSA cho nhóm Ngôn ngữ thương mại.",
        );
      }
    }

    if (examType === "V_ACT") {
      if (examScore !== undefined && examScore < 850) {
        eligibilityStatus = "ineligible";
        addUnique(
          warnings,
          "Điểm ĐGNL ĐHQG TP.HCM chưa đạt ngưỡng tối thiểu 850/1200 của FTU.",
        );
      }
      if (input.programGroup === "COMMERCIAL_LANGUAGE") {
        eligibilityStatus = "unknown";
        addUnique(
          warnings,
          "FTU 2026 chưa xác nhận công thức V-ACT cho nhóm Ngôn ngữ thương mại.",
        );
      }
    }

    if (examType === "TSA") {
      if (examScore !== undefined && examScore < 70) {
        eligibilityStatus = "ineligible";
        addUnique(warnings, "Điểm TSA chưa đạt ngưỡng tối thiểu 70/100 của FTU.");
      }
      if (
        input.programGroup === "STANDARD_INTEGRATED" ||
        input.programGroup === "COMMERCIAL_LANGUAGE"
      ) {
        eligibilityStatus = "unknown";
        addUnique(
          warnings,
          "FTU 2026 chỉ hỗ trợ TSA cho nhóm Khoa học máy tính/AI/Khoa học dữ liệu trong dữ liệu công thức hiện có.",
        );
      }
    }
  }

  if (missingFields.length && eligibilityStatus === "eligible") {
    eligibilityStatus = "unknown";
  }

  return {
    eligibilityStatus,
    missingFields,
    warnings,
  };
}
