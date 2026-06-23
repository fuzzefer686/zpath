import { convertCertificate } from "@/src/lib/admission-engine/generic";
import type {
  GenericAdmissionConfig,
  GenericInputField,
  GenericMethodConfig,
} from "@/src/lib/admission-engine/generic";

import type {
  CertificateConverterContext,
  CertificateUserInput,
  ConverterSchoolSummary,
  MethodApplicabilityResult,
  SchoolConverterAdapter,
} from "../types";

const STATIC_DEDICATED_CODES = new Set(["AOF", "HUST", "FTU", "UET"]);

function toScore(
  input: CertificateUserInput,
  field: GenericInputField,
): number | null {
  if (typeof input.score !== "number") return null;

  if (field.min !== undefined && input.score < field.min) return null;
  if (field.max !== undefined && input.score > field.max) return null;
  return input.score;
}

function isCertificateTypeMatched(
  input: CertificateUserInput,
  field: GenericInputField,
) {
  const configuredType = field.certificateConfig?.certificateType;
  if (!configuredType) return true;
  return configuredType.toUpperCase() === input.certificateType.toUpperCase();
}

function evaluateMethod(
  school: ConverterSchoolSummary,
  method: GenericMethodConfig,
  input: CertificateUserInput,
): MethodApplicabilityResult {
  const result: MethodApplicabilityResult = {
    schoolCode: school.schoolCode,
    schoolName: school.schoolName,
    methodCode: method.methodCode,
    methodName: method.methodName,
    status: "not_applicable",
    convertedScore: null,
    scoreUnit: "/10",
    reason: "Phương thức không có dữ liệu quy đổi chứng chỉ tương thích.",
    notes: [],
    sourceLabel: "Published generic admission config",
  };

  const certificateInputs = method.inputs.filter(
    (item) => item.type === "certificate" || item.type === "certificate_rich",
  );
  if (!certificateInputs.length) {
    result.reason = "Phương thức này không sử dụng đầu vào chứng chỉ ngoại ngữ.";
    return result;
  }

  const matchedInputs = certificateInputs.filter((field) =>
    isCertificateTypeMatched(input, field),
  );
  if (!matchedInputs.length) {
    result.reason =
      "Phương thức có dùng chứng chỉ nhưng khác loại chứng chỉ bạn đang nhập.";
    return result;
  }

  let hasNumericRequirement = false;
  let bestConverted: number | null = null;

  for (const field of matchedInputs) {
    const levels = field.certificateLevels ?? field.certificateConfig?.levels ?? [];
    if (!levels.length) continue;

    const achievedScore = toScore(input, field);
    if (achievedScore === null) {
      hasNumericRequirement = true;
      continue;
    }

    const converted = convertCertificate(levels, achievedScore);
    if (converted === null) continue;
    bestConverted = bestConverted === null ? converted : Math.max(bestConverted, converted);
  }

  if (bestConverted !== null) {
    result.status = "applicable";
    result.convertedScore = bestConverted;
    result.reason =
      "Có thể áp dụng trực tiếp theo bảng certificateLevels/certificateConfig của phương thức.";
    result.notes.push(
      "Điểm hiển thị là điểm quy đổi input chứng chỉ, không phải điểm xét tuyển cuối cùng.",
    );
    return result;
  }

  if (hasNumericRequirement) {
    result.status = "conditional";
    result.reason =
      "Phương thức này yêu cầu chứng chỉ ở dạng điểm số (numeric band/score) để quy đổi.";
    return result;
  }

  result.reason = "Không đạt mức quy đổi tối thiểu theo bảng quy đổi của phương thức.";
  return result;
}

export function evaluateGenericConfigForCertificate({
  school,
  config,
  input,
}: {
  school: ConverterSchoolSummary;
  config: GenericAdmissionConfig;
  input: CertificateUserInput;
}): MethodApplicabilityResult[] {
  return config.methods.map((method) => evaluateMethod(school, method, input));
}

export class GenericConfigConverterAdapter implements SchoolConverterAdapter {
  readonly adapterId = "generic-config-adapter";
  readonly schoolCodes = ["*"] as const;

  async getResults({
    input,
    school,
  }: {
    input: CertificateUserInput;
    school: ConverterSchoolSummary;
    context: CertificateConverterContext;
  }): Promise<MethodApplicabilityResult[]> {
    if (STATIC_DEDICATED_CODES.has(school.schoolCode)) return [];
    if (school.source !== "config") return [];

    const { getPublishedAdmissionConfig } = await import(
      "@/src/lib/admission-config/store"
    );
    const config = await getPublishedAdmissionConfig(school.schoolCode);
    if (!config) return [];

    return evaluateGenericConfigForCertificate({
      school,
      config,
      input,
    });
  }
}
