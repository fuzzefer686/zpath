import { getSchoolAdmissionModule } from "./registry";
import type { AdmissionInput, AdmissionScoreResult } from "./types";

export function calculateAdmissionScore(
  input: AdmissionInput,
): AdmissionScoreResult {
  const schoolModule = getSchoolAdmissionModule(input.schoolCode);

  if (!schoolModule) {
    throw new Error(
      `No admission scoring module registered for school "${input.schoolCode}".`,
    );
  }

  if (!schoolModule.supportedMethods.includes(input.method)) {
    throw new Error(
      `Admission method "${input.method}" is not supported by ${schoolModule.schoolName} (${schoolModule.schoolCode}). Supported methods: ${schoolModule.supportedMethods.join(", ")}.`,
    );
  }

  const result = schoolModule.calculate(input);

  if (result.schoolCode !== input.schoolCode) {
    throw new Error(
      `Admission module for "${input.schoolCode}" returned result for "${result.schoolCode}".`,
    );
  }

  if (result.method !== input.method) {
    throw new Error(
      `Admission module for "${input.schoolCode}" returned method "${result.method}" for input method "${input.method}".`,
    );
  }

  if (result.year !== input.year) {
    throw new Error(
      `Admission module for "${input.schoolCode}" returned year "${result.year}" for input year "${input.year}".`,
    );
  }

  if (result.targetScale !== 30) {
    throw new Error(
      `Admission module for "${input.schoolCode}" must return targetScale 30.`,
    );
  }

  return result;
}
