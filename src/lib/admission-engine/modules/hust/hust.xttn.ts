import type { AdmissionInput, AdmissionScoreResult } from "../../core/types";
import {
  convertLanguageCertificateToBand,
  convertToeicFourSkills,
  isLanguageCertificateType,
  type LanguageCertificateConversionInput,
  type ToeicFourSkillsInput,
  type ToeicSkillName,
} from "./language-certificate";

type HustXttnSubtype =
  | "direct_admission"
  | "international_certificate"
  | "portfolio_interview";

type HustXttnPayload = {
  subtype: HustXttnSubtype;
  tsaScore?: number;
  achievementScore?: number;
  bonusScore?: number;
  bonusScoreManual?: number;
  languageCertificateBonus?: number;
  otherBonus?: number;
  languageCertificateConversion?: ReturnType<typeof convertLanguageCertificateBonusFromPayload>;
  interviewStatus?: string;
  eligible?: boolean;
};

const XTTN_WARNING =
  "XTTN diện hồ sơ năng lực đang tính theo thang 100 và quy đổi tuyến tính sang thang 30 để so sánh khi có điểm chuẩn.";

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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function parseFiniteNumber(value: unknown, label: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} phải là một số hợp lệ.`);
  }

  return value;
}

function parseHustXttnPayload(payload: unknown): HustXttnPayload {
  if (!isRecord(payload)) {
    throw new Error("Dữ liệu xét tuyển tài năng không hợp lệ.");
  }

  const subtype =
    typeof payload.subtype === "string" ? payload.subtype : "portfolio_interview";
  if (
    subtype !== "direct_admission" &&
    subtype !== "international_certificate" &&
    subtype !== "portfolio_interview"
  ) {
    throw new Error("Loại xét tuyển tài năng không hợp lệ.");
  }

  if (subtype !== "portfolio_interview") {
    return {
      subtype,
      eligible: typeof payload.eligible === "boolean" ? payload.eligible : true,
    };
  }

  const tsaScore = parseFiniteNumber(payload.tsaScore, "Điểm TSA");
  if (tsaScore < 0 || tsaScore > 100) {
    throw new Error("Điểm TSA phải nằm trong khoảng 0 đến 100.");
  }

  const achievementScore = parseFiniteNumber(
    payload.achievementScore,
    "Điểm thành tích",
  );
  if (achievementScore < 0) {
    throw new Error("Điểm thành tích không được âm.");
  }

  const hasLegacyBonusScore = payload.bonusScore !== undefined;
  const bonusScoreManual = parseFiniteNumber(
    payload.bonusScoreManual ?? payload.bonusScore ?? 0,
    "Điểm thưởng thủ công",
  );
  if (bonusScoreManual < 0) {
    throw new Error("Điểm thưởng thủ công không được âm.");
  }

  const otherBonus = parseFiniteNumber(payload.otherBonus ?? 0, "Điểm thưởng khác");
  if (otherBonus < 0) {
    throw new Error("Điểm thưởng khác không được âm.");
  }

  const languageCertificateConversion =
    hasLegacyBonusScore || payload.useLanguageCertificateBonus === false
      ? null
      : convertLanguageCertificateBonusFromPayload(payload.languageCertificate);
  const languageCertificateBonus =
    languageCertificateConversion?.bonusScoreOutOf10 ??
    parseFiniteNumber(payload.languageCertificateBonus ?? 0, "Điểm thưởng chứng chỉ ngoại ngữ");
  if (languageCertificateBonus < 0) {
    throw new Error("Điểm thưởng chứng chỉ ngoại ngữ không được âm.");
  }

  return {
    subtype,
    tsaScore,
    achievementScore,
    bonusScoreManual,
    languageCertificateBonus,
    otherBonus,
    languageCertificateConversion,
    interviewStatus:
      typeof payload.interviewStatus === "string" ? payload.interviewStatus : undefined,
  };
}

export function calculateHustXttnScore(
  input: AdmissionInput,
): AdmissionScoreResult {
  const payload = parseHustXttnPayload(input.payload);

  if (payload.subtype !== "portfolio_interview") {
    return {
      schoolCode: input.schoolCode,
      method: "XTTN",
      year: input.year,
      originalScore: 0,
      originalScale: 100,
      normalizedScore30: 0,
      targetScale: 30,
      formulaUsed: `${input.schoolCode}_XTTN_ELIGIBILITY`,
      details: {
        subtype: payload.subtype,
        eligible: payload.eligible,
        resultType: "eligibility",
        note: "Diện này trả về kết quả đủ điều kiện, không giả lập điểm số.",
      },
      warnings: [
        "Diện xét tuyển thẳng/chứng chỉ quốc tế cần đối chiếu điều kiện hồ sơ chính thức.",
      ],
    };
  }

  const thinkingScore = clamp((payload.tsaScore ?? 0) * 40 / 60, 0, 40);
  const achievementScore = clamp(payload.achievementScore ?? 0, 0, 50);
  const bonusScore = clamp(
    (payload.bonusScoreManual ?? 0) +
      (payload.languageCertificateBonus ?? 0) +
      (payload.otherBonus ?? 0),
    0,
    10,
  );
  const profileScore = clamp(thinkingScore + achievementScore + bonusScore, 0, 100);
  const normalizedScore30 = profileScore * 30 / 100;

  return {
    schoolCode: input.schoolCode,
    method: "XTTN",
    year: input.year,
    originalScore: profileScore,
    originalScale: 100,
    normalizedScore30,
    targetScale: 30,
    formulaUsed: "thinkingScore + achievementScore + bonusScore",
    details: {
      subtype: payload.subtype,
      tsaScore: payload.tsaScore,
      thinkingScore,
      achievementScore,
      bonusScore,
      bonusScoreManual: payload.bonusScoreManual,
      languageCertificateBonus: payload.languageCertificateBonus,
      otherBonus: payload.otherBonus,
      profileScore,
      interviewStatus: payload.interviewStatus,
      languageCertificateConversion: payload.languageCertificateConversion,
    },
    warnings: [XTTN_WARNING],
  };
}
