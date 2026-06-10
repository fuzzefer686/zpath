import { ftuModule } from "../modules/ftu";
import { hustModule } from "../modules/hust";
import { neuModule } from "../modules/neu";
import { uetModule } from "../modules/uet";
import { vinUniModule } from "../modules/vinuni";
import type { SchoolAdmissionModule, SchoolCode } from "./types";

const admissionModuleRegistry = new Map<SchoolCode, SchoolAdmissionModule>();

export function registerSchoolAdmissionModule(module: SchoolAdmissionModule) {
  admissionModuleRegistry.set(module.schoolCode, module);
}

export function getSchoolAdmissionModule(schoolCode: SchoolCode) {
  return admissionModuleRegistry.get(schoolCode);
}

/**
 * Whether a school is handled by a hardcoded TypeScript module. When false, the
 * school is expected to be config-driven (a published admission_configs row
 * interpreted by the generic engine). This lets the API route decide whether to
 * use a static module or fall back to the config-driven path without widening
 * the SchoolCode union across the whole codebase.
 */
export function hasStaticAdmissionModule(schoolCode: string): boolean {
  return admissionModuleRegistry.has(schoolCode as SchoolCode);
}

export function listRegisteredSchoolAdmissionModules() {
  return Array.from(admissionModuleRegistry.values());
}

registerSchoolAdmissionModule(hustModule);
registerSchoolAdmissionModule(ftuModule);
registerSchoolAdmissionModule(neuModule);
registerSchoolAdmissionModule(uetModule);
registerSchoolAdmissionModule(vinUniModule);
