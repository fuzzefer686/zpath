import type {
  AdmissionInput,
  AdmissionScoreResult,
  SchoolAdmissionModule,
} from "../../core/types";
import { calculateHustThptScore } from "./hust.thpt";
import { calculateHustTsaScore } from "./hust.tsa";
import { calculateHustXttnScore } from "./hust.xttn";

function calculate(input: AdmissionInput): AdmissionScoreResult {
  switch (input.method) {
    case "THPT":
      return calculateHustThptScore(input);
    case "TSA":
      return calculateHustTsaScore(input);
    case "XTTN":
      return calculateHustXttnScore(input);
    default: {
      const unsupportedMethod: never = input.method;
      throw new Error(`Unsupported HUST admission method: ${unsupportedMethod}`);
    }
  }
}

export const hustModule: SchoolAdmissionModule = {
  schoolCode: "HUST",
  schoolName: "Đại học Bách khoa Hà Nội",
  supportedMethods: ["THPT", "TSA", "XTTN"],
  calculate,
};
