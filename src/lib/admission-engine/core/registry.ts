import { hustModule } from "../modules/hust";
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
registerSchoolAdmissionModule({
  ...hustModule,
  schoolCode: "FTU",
  schoolName: "Đại học Ngoại Thương",
});
registerSchoolAdmissionModule({
  ...hustModule,
  schoolCode: "VINUNI",
  schoolName: "Đại học VinUni",
});
registerSchoolAdmissionModule({
  ...hustModule,
  schoolCode: "NEU",
  schoolName: "Đại học Kinh tế Quốc dân",
});
