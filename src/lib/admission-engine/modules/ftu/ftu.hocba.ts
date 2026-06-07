import type { AdmissionInput, AdmissionScoreResult } from "../../core/types";
import { buildFtuSubjectResult, parseFtuSubjectPayload } from "./ftu.shared";

const HOC_BA_WARNING =
  "Kết quả chỉ mang tính tham khảo, dựa trên điểm trung bình chung cả năm lớp 10, 11, 12 và quy chế tuyển sinh FTU năm 2026.";

export function calculateFtuHocBaScore(
  input: AdmissionInput,
): AdmissionScoreResult {
  const parsed = parseFtuSubjectPayload(input.payload);
  return buildFtuSubjectResult({
    input,
    method: "HOC_BA",
    parsed,
    sourceLabel: "Điểm trung bình chung cả năm lớp 10, 11, 12",
    warning: HOC_BA_WARNING,
  });
}
