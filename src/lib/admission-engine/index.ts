export { calculateAdmissionScore } from "./core/engine";
export {
  evaluateAdmissionChance,
  type AdmissionChanceEvaluation,
  type AdmissionChanceLevel,
} from "./core/evaluate";
export {
  getSchoolAdmissionModule,
  hasStaticAdmissionModule,
  listRegisteredSchoolAdmissionModules,
  registerSchoolAdmissionModule,
} from "./core/registry";
export type {
  AdmissionInput,
  AdmissionMethod,
  AdmissionScoreResult,
  SchoolAdmissionModule,
  SchoolCode,
} from "./core/types";
