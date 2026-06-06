import type {
  AdmissionInput,
  AdmissionScoreResult,
  SchoolAdmissionModule,
} from "../../core/types";
import { calculateFtuDgnlScore } from "./ftu.dgnl";
import { calculateFtuHocBaScore } from "./ftu.hocba";
import { calculateFtuThptScore } from "./ftu.thpt";
import { calculateFtuXttEligibility } from "./ftu.xtt";

function calculate(input: AdmissionInput): AdmissionScoreResult {
  switch (input.method) {
    case "HOC_BA":
      return calculateFtuHocBaScore(input);
    case "THPT":
      return calculateFtuThptScore(input);
    case "DGNL":
      return calculateFtuDgnlScore(input);
    case "XTT":
      return calculateFtuXttEligibility(input);
    default:
      throw new Error(`Unsupported FTU admission method: ${input.method}`);
  }
}

export const ftuModule: SchoolAdmissionModule = {
  schoolCode: "FTU",
  schoolName: "Đại học Ngoại thương",
  supportedMethods: ["HOC_BA", "THPT", "DGNL", "XTT"],
  calculate,
};
