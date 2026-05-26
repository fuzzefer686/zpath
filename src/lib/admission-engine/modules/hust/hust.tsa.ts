import type { AdmissionInput, AdmissionScoreResult } from "../../core/types";
import {
  convertLanguageCertificateToBand,
  convertToeicFourSkills,
  isLanguageCertificateType,
  type LanguageCertificateConversionInput,
  type ToeicFourSkillsInput,
  type ToeicSkillName,
} from "./language-certificate";

const TSA_WARNING =
  "Tạm thời dùng quy đổi tuyến tính từ thang 100 sang thang 30; cần thay bằng bảng quy đổi chính thức khi có dữ liệu.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseToeicPayload(value: unknown): ToeicFourSkillsInput | null {
  if (!isRecord(value)) return null;

  const skillNames: ToeicSkillName[] = ["listening", "speaking", "reading", "writing"];
  return skillNames.reduce<ToeicFourSkillsInput>((next, skillName) => {
    next[skillName] = parseOptionalNumber(value[skillName]);
    return next;
  }, {});
}

function convertLanguageCertificateBonusFromPayload(value: unknown) {
  if (!isRecord(value) || !isLanguageCertificateType(value.certificateType)) {
    return null;
  }

  if (value.certificateType === "TOEIC") {
    const toeic = parseToeicPayload(value.toeic);
    return toeic ? convertToeicFourSkills(toeic) : null;
  }

  const input: LanguageCertificateConversionInput = {
    certificateType: value.certificateType,
    score: parseOptionalNumber(value.score),
    textValue: typeof value.textValue === "string" ? value.textValue : undefined,
    bandId: typeof value.bandId === "string" ? value.bandId : undefined,
  };

  return convertLanguageCertificateToBand(input);
}

function parseHustTsaPayload(payload: unknown) {
  if (!isRecord(payload)) {
    throw new Error("Dữ liệu điểm Đánh giá tư duy không hợp lệ.");
  }

  const {
    tsaScore,
    languageCertificateBonus,
    languageCertificate,
    useLanguageCertificateBonus,
    maxScore,
  } = payload;

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

  const certificateConversion =
    useLanguageCertificateBonus === false
      ? null
      : convertLanguageCertificateBonusFromPayload(languageCertificate);
  const configuredMaxScore =
    typeof maxScore === "number" && Number.isFinite(maxScore) && maxScore > 0
      ? maxScore
      : 100;

  return {
    tsaScore,
    languageCertificateBonus:
      certificateConversion?.bonusScoreOutOf10 ??
      (typeof languageCertificateBonus === "number" ? languageCertificateBonus : 0),
    languageCertificate,
    languageCertificateConversion: certificateConversion,
    maxScore: configuredMaxScore,
  };
}

export function calculateHustTsaScore(
  input: AdmissionInput,
): AdmissionScoreResult {
  const payload = parseHustTsaPayload(input.payload);
  const score = Math.min(payload.tsaScore + payload.languageCertificateBonus, payload.maxScore);
  const normalizedScore30 = (score / payload.maxScore) * 30;

  return {
    schoolCode: input.schoolCode,
    method: "TSA",
    year: input.year,
    originalScore: score,
    originalScale: payload.maxScore,
    normalizedScore30,
    targetScale: 30,
    formulaUsed: `${input.schoolCode}_TSA_LINEAR_100_TO_30`,
    details: {
      tsaScore: payload.tsaScore,
      languageCertificateBonus: payload.languageCertificateBonus,
      languageCertificate: payload.languageCertificate,
      languageCertificateConversion: payload.languageCertificateConversion,
      maxScore: payload.maxScore,
      conversion: `score / ${payload.maxScore} * 30`,
      note:
        "Điểm cộng chứng chỉ ngoại ngữ được cấu hình là thành phần cộng trước khi chặn theo thang điểm TSA.",
    },
    warnings: [TSA_WARNING],
  };
}
