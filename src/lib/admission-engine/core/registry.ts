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

export function listRegisteredSchoolAdmissionModules() {
  return Array.from(admissionModuleRegistry.values());
}

registerSchoolAdmissionModule(hustModule);
registerSchoolAdmissionModule(ftuModule);
registerSchoolAdmissionModule(neuModule);
registerSchoolAdmissionModule(uetModule);
registerSchoolAdmissionModule(vinUniModule);
