import type { AdmissionInput, AdmissionScoreResult } from "../../core/types";

const TSA_WARNING =
  "Tạm thời dùng quy đổi tuyến tính từ thang 100 sang thang 30; cần thay bằng bảng quy đổi chính thức khi có dữ liệu.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseHustTsaPayload(payload: unknown) {
  if (!isRecord(payload)) {
    throw new Error("Dữ liệu điểm Đánh giá tư duy không hợp lệ.");
  }

  const { tsaScore, languageCertificateBonus } = payload;

  if (typeof tsaScore !== "number" || !Number.isFinite(tsaScore)) {
    throw new Error("Điểm Đánh giá tư duy phải là một số hợp lệ.");
  }

  if (tsaScore < 0 || tsaScore > 100) {
    throw new Error("Điểm Đánh giá tư duy phải nằm trong khoảng 0 đến 100.");
  }

  if (
    languageCertificateBonus !== undefined &&
    (typeof languageCertificateBonus !== "number" ||
      !Number.isFinite(languageCertificateBonus) ||
      languageCertificateBonus < 0)
  ) {
    throw new Error("Điểm cộng chứng chỉ ngoại ngữ phải là một số không âm.");
  }

  return {
    tsaScore,
    languageCertificateBonus:
      typeof languageCertificateBonus === "number" ? languageCertificateBonus : 0,
  };
}

export function calculateHustTsaScore(
  input: AdmissionInput,
): AdmissionScoreResult {
  const payload = parseHustTsaPayload(input.payload);
  const score = Math.min(payload.tsaScore + payload.languageCertificateBonus, 100);
  const normalizedScore30 = (score / 100) * 30;

  return {
    schoolCode: input.schoolCode,
    method: "TSA",
    year: input.year,
    originalScore: score,
    originalScale: 100,
    normalizedScore30,
    targetScale: 30,
    formulaUsed: `${input.schoolCode}_TSA_LINEAR_100_TO_30`,
    details: {
      tsaScore: payload.tsaScore,
      languageCertificateBonus: payload.languageCertificateBonus,
      conversion: "tsaScore / 100 * 30",
      note:
        "Điểm cộng chứng chỉ ngoại ngữ chỉ được áp dụng khi có dữ liệu chính thức trong ZPath.",
    },
    warnings: [TSA_WARNING],
  };
}
