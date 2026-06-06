import {
  normalizeFTUScoreTo30,
  roundFTUScore,
  getFTUFormula,
} from "./ftuFormulaRegistry";
import { resolveFTUProgramGroup } from "./ftuProgramGroupMapping";
import { validateFTUEligibility } from "./ftuEligibility";
import {
  resolveFTUAssessmentConvertedScore,
  resolveFTUCertificateConvertedScore,
} from "./ftuCertificateConversion";
import type {
  FTUProgramGroup,
  FTUScoringInput,
  FTUScoringResult,
} from "./ftuTypes";

const MISSING_CONVERSION_FIELD =
  "language_certificate_conversions.converted_subject_score_out_of_10";
const MISSING_CONVERSION_WARNING =
  "Chưa có dữ liệu quy đổi chứng chỉ tương ứng cho FTU 2026.";

function addUnique(target: string[], value: string) {
  if (!target.includes(value)) target.push(value);
}

function getPriorityPoint(input: FTUScoringInput) {
  return input.priorityPoint ?? 0;
}

function getBonusPoint(input: FTUScoringInput) {
  return input.bonusPoint ?? 0;
}

function createBaseResult(
  input: FTUScoringInput,
  overrides: Partial<FTUScoringResult>,
): FTUScoringResult {
  const formula = getFTUFormula(input);
  const eligibility = validateFTUEligibility(input);

  return {
    schoolCode: "FTU",
    admissionYear: 2026,
    method: input.method,
    programGroup: input.programGroup,
    officialRawScore: null,
    officialMaxScore: formula.officialMaxScore,
    normalizedScore30: null,
    priorityPoint: getPriorityPoint(input),
    bonusPoint: getBonusPoint(input),
    formulaCode: formula.code,
    formulaTextVi: formula.formulaTextVi,
    explanationVi: "Chưa đủ dữ liệu để tính điểm xét tuyển FTU 2026.",
    eligibilityStatus: eligibility.eligibilityStatus,
    warnings: eligibility.warnings,
    missingFields: eligibility.missingFields,
    sourceNotes: formula.sourceNotes,
    ...overrides,
  };
}

function resolveProgramGroup(input: FTUScoringInput): FTUProgramGroup | undefined {
  return (
    input.programGroup ??
    resolveFTUProgramGroup({
      name: input.programName,
      code: input.programCode ?? input.majorCode,
    }) ??
    undefined
  );
}

function finalizeScore(
  input: FTUScoringInput,
  rawScore: number,
  officialMaxScore: 30 | 40,
  explanationVi: string,
  extras: Partial<FTUScoringResult> = {},
): FTUScoringResult {
  const officialRawScore = roundFTUScore(rawScore);
  const normalizedScore30 = roundFTUScore(
    normalizeFTUScoreTo30(officialRawScore, officialMaxScore),
  );

  return createBaseResult(input, {
    officialRawScore,
    officialMaxScore,
    normalizedScore30,
    explanationVi,
    ...extras,
  });
}

function calculateThreeComponentScore(
  group: FTUProgramGroup,
  m1: number,
  m2: number,
  m3: number,
  priorityPoint: number,
  bonusPoint: number,
) {
  if (group === "TECH_DATA_AI") {
    return {
      rawScore: m1 * 2 + m2 + m3 + priorityPoint + bonusPoint,
      officialMaxScore: 40 as const,
      explanationVi:
        "Điểm FTU = M1 x 2 + M2 + M3 + điểm ưu tiên + điểm thưởng; thang điểm chính thức 40.",
    };
  }

  if (group === "COMMERCIAL_LANGUAGE") {
    return {
      rawScore: m1 + m2 * 1.5 + m3 * 1.5 + priorityPoint + bonusPoint,
      officialMaxScore: 40 as const,
      explanationVi:
        "Điểm FTU = M1 + M2 x 1.5 + M3 x 1.5 + điểm ưu tiên + điểm thưởng; thang điểm chính thức 40.",
    };
  }

  return {
    rawScore: m1 + m2 + m3 + priorityPoint + bonusPoint,
    officialMaxScore: 30 as const,
    explanationVi:
      "Điểm FTU = M1 + M2 + M3 + điểm ưu tiên + điểm thưởng; thang điểm chính thức 30.",
  };
}

async function resolveCertificateScore(input: FTUScoringInput) {
  if (input.certificate?.convertedScore !== undefined) {
    return input.certificate.convertedScore;
  }

  return resolveFTUCertificateConvertedScore({
    certificateType: input.certificate?.type,
    rawScore: input.certificate?.rawScore,
    skillName: input.certificate?.skillName,
  });
}

async function resolveAssessmentScore(input: FTUScoringInput) {
  if (input.assessment?.convertedAssessmentScore !== undefined) {
    return input.assessment.convertedAssessmentScore;
  }

  return resolveFTUAssessmentConvertedScore({
    certificateType: input.assessment?.examType,
    rawScore: input.assessment?.examScore,
  });
}

function missingConversionResult(input: FTUScoringInput) {
  const result = createBaseResult(input, {
    eligibilityStatus: "unknown",
  });
  addUnique(result.missingFields, MISSING_CONVERSION_FIELD);
  addUnique(result.warnings, MISSING_CONVERSION_WARNING);
  return result;
}

function missingProgramGroupResult(input: FTUScoringInput) {
  const result = createBaseResult(input, {
    eligibilityStatus: "unknown",
  });
  addUnique(result.missingFields, "programGroup");
  result.explanationVi =
    "Chưa xác định được nhóm chương trình FTU nên ZPath không tự động tính điểm.";
  return result;
}

function calculateDomesticAssessment(input: FTUScoringInput) {
  const group = input.programGroup;
  const examType = input.assessment?.examType;
  const examScore = input.assessment?.examScore;
  if (!group || !examType || examScore === undefined) return createBaseResult(input, {});

  let baseScore: number | null = null;
  if (examType === "HSA") baseScore = 27 + ((examScore - 100) * 3) / 50;
  if (examType === "V_ACT") baseScore = 27 + ((examScore - 850) * 3) / 350;
  if (examType === "TSA") baseScore = 27 + ((examScore - 70) * 3) / 30;
  if (baseScore === null) return createBaseResult(input, {});

  if (examType === "TSA" && group !== "TECH_DATA_AI") return createBaseResult(input, {});
  if (examType === "V_ACT" && group === "COMMERCIAL_LANGUAGE") {
    return createBaseResult(input, {});
  }

  const officialMaxScore = group === "STANDARD_INTEGRATED" ? 30 : 40;
  const rawScore =
    officialMaxScore === 30
      ? baseScore + getPriorityPoint(input) + getBonusPoint(input)
      : (baseScore * 4) / 3 + getPriorityPoint(input) + getBonusPoint(input);

  return finalizeScore(
    input,
    rawScore,
    officialMaxScore,
    "Điểm FTU được quy đổi từ kết quả đánh giá năng lực/đánh giá tư duy theo công thức FTU 2026.",
  );
}

async function calculateInternationalAssessment(input: FTUScoringInput) {
  const group = input.programGroup;
  const examType = input.assessment?.examType;
  if (!group || !examType) return createBaseResult(input, {});

  const certificateScore = await resolveCertificateScore(input);
  if (certificateScore === null) return missingConversionResult(input);

  let rawScore: number | null = null;
  let officialMaxScore: 30 | 40 | null = null;
  let assessmentScore: number | null = null;

  if (examType === "SAT" || examType === "ACT") {
    assessmentScore = await resolveAssessmentScore(input);
    if (assessmentScore === null) return missingConversionResult(input);

    if (group === "TECH_DATA_AI") {
      rawScore =
        ((assessmentScore + certificateScore) * 4) / 3 +
        getPriorityPoint(input) +
        getBonusPoint(input);
      officialMaxScore = 40;
    } else if (group === "COMMERCIAL_LANGUAGE") {
      rawScore =
        assessmentScore +
        certificateScore * 2 +
        getPriorityPoint(input) +
        getBonusPoint(input);
      officialMaxScore = 40;
    } else {
      rawScore =
        assessmentScore +
        certificateScore +
        getPriorityPoint(input) +
        getBonusPoint(input);
      officialMaxScore = 30;
    }
  }

  if (examType === "A_LEVEL") {
    const mathScore =
      input.assessment?.aLevelMathConvertedScore ??
      input.assessment?.convertedAssessmentScore ??
      null;
    const otherScore = input.assessment?.aLevelOtherConvertedScore ?? null;
    if (mathScore === null) return missingConversionResult(input);

    if (group === "COMMERCIAL_LANGUAGE") {
      if (otherScore === null) return missingConversionResult(input);
      rawScore =
        mathScore +
        otherScore +
        certificateScore * 2 +
        getPriorityPoint(input) +
        getBonusPoint(input);
      officialMaxScore = 40;
      assessmentScore = mathScore;
    } else {
      if (otherScore === null) return missingConversionResult(input);
      rawScore =
        (group === "TECH_DATA_AI" ? mathScore * 2 : mathScore) +
        otherScore +
        certificateScore +
        getPriorityPoint(input) +
        getBonusPoint(input);
      officialMaxScore = group === "TECH_DATA_AI" ? 40 : 30;
      assessmentScore = mathScore;
    }
  }

  if (rawScore === null || officialMaxScore === null) return createBaseResult(input, {});

  return finalizeScore(
    input,
    rawScore,
    officialMaxScore,
    "Điểm FTU được tính từ điểm quy đổi đánh giá quốc tế và chứng chỉ ngoại ngữ quốc tế theo công thức FTU 2026.",
    {
      certificateConvertedScore: certificateScore,
      assessmentConvertedScore: assessmentScore ?? undefined,
    },
  );
}

export async function calculateFTUAdmissionScore(
  input: FTUScoringInput,
): Promise<FTUScoringResult> {
  const programGroup = resolveProgramGroup(input);
  const normalizedInput: FTUScoringInput = { ...input, programGroup };

  if (normalizedInput.method === "DIRECT_ADMISSION") {
    return createBaseResult(normalizedInput, {
      officialRawScore: null,
      officialMaxScore: null,
      normalizedScore30: null,
      eligibilityStatus: "unknown",
      explanationVi:
        "Phương thức xét tuyển thẳng theo Quy chế của Bộ GD&ĐT và quy định của Trường Đại học Ngoại thương. ZPath không tự động tính điểm cho phương thức này.",
    });
  }

  if (!programGroup) return missingProgramGroupResult(normalizedInput);

  if (
    normalizedInput.method === "THPT_3_SUBJECTS" ||
    normalizedInput.method === "ACADEMIC_TRANSCRIPT_3_SUBJECTS"
  ) {
    const { m1, m2, m3 } = normalizedInput.subjects ?? {};
    if (m1 === undefined || m2 === undefined || m3 === undefined) {
      return createBaseResult(normalizedInput, {});
    }
    const score = calculateThreeComponentScore(
      programGroup,
      m1,
      m2,
      m3,
      getPriorityPoint(normalizedInput),
      getBonusPoint(normalizedInput),
    );
    return finalizeScore(
      normalizedInput,
      score.rawScore,
      score.officialMaxScore,
      score.explanationVi,
    );
  }

  if (
    normalizedInput.method === "THPT_WITH_LANGUAGE_CERT" ||
    normalizedInput.method === "ACADEMIC_TRANSCRIPT_WITH_LANGUAGE_CERT"
  ) {
    const { m1, m2 } = normalizedInput.subjects ?? {};
    if (m1 === undefined || m2 === undefined) return createBaseResult(normalizedInput, {});

    const certificateScore = await resolveCertificateScore(normalizedInput);
    if (certificateScore === null) return missingConversionResult(normalizedInput);

    const score = calculateThreeComponentScore(
      programGroup,
      m1,
      m2,
      certificateScore,
      getPriorityPoint(normalizedInput),
      getBonusPoint(normalizedInput),
    );
    return finalizeScore(
      normalizedInput,
      score.rawScore,
      score.officialMaxScore,
      score.explanationVi,
      { certificateConvertedScore: certificateScore },
    );
  }

  if (normalizedInput.method === "DOMESTIC_ASSESSMENT") {
    return calculateDomesticAssessment(normalizedInput);
  }

  if (normalizedInput.method === "INTERNATIONAL_ASSESSMENT_WITH_LANGUAGE_CERT") {
    return calculateInternationalAssessment(normalizedInput);
  }

  return createBaseResult(normalizedInput, {});
}
