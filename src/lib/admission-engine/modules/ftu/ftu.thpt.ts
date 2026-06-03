import type { AdmissionInput, AdmissionScoreResult } from "../../core/types";
import { buildFtuSubjectResult, parseFtuSubjectPayload } from "./ftu.shared";

const THPT_WARNING =
  "Kết quả chỉ mang tính tham khảo, dựa trên điểm thi tốt nghiệp THPT năm 2026 và quy chế tuyển sinh FTU.";

export function calculateFtuThptScore(
  input: AdmissionInput,
): AdmissionScoreResult {
  const parsed = parseFtuSubjectPayload(input.payload);
  return buildFtuSubjectResult({
    input,
    method: "THPT",
    parsed,
    sourceLabel: "Điểm thi tốt nghiệp THPT năm 2026",
    warning: THPT_WARNING,
  });
}
