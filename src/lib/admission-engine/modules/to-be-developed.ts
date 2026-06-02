import type {
  AdmissionInput,
  AdmissionMethod,
  AdmissionScoreResult,
  SchoolAdmissionModule,
  SchoolCode,
} from "../core/types";

const ALL_ADMISSION_METHODS: AdmissionMethod[] = ["THPT", "TSA", "XTTN"];

export function createToBeDevelopedModule(
  schoolCode: SchoolCode,
  schoolName: string,
): SchoolAdmissionModule {
  return {
    schoolCode,
    schoolName,
    supportedMethods: ALL_ADMISSION_METHODS,
    calculate(input: AdmissionInput): AdmissionScoreResult {
      throw new Error(
        `${schoolName} (${input.schoolCode}) admission scoring module is to be developed.`,
      );
    },
  };
}
