import type { AdmissionInput, AdmissionScoreResult } from "../../core/types";

type HustXttnSubtype =
  | "direct_admission"
  | "international_certificate"
  | "portfolio_interview";

type HustXttnPayload = {
  subtype: HustXttnSubtype;
  tsaScore?: number;
  achievementScore?: number;
  bonusScore?: number;
  interviewStatus?: string;
  eligible?: boolean;
};

const XTTN_WARNING =
  "XTTN diện hồ sơ năng lực đang tính theo thang 100 và quy đổi tuyến tính sang thang 30 để so sánh khi có điểm chuẩn.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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

  const bonusScore = parseFiniteNumber(payload.bonusScore ?? 0, "Điểm thưởng");
  if (bonusScore < 0) {
    throw new Error("Điểm thưởng không được âm.");
  }

  return {
    subtype,
    tsaScore,
    achievementScore,
    bonusScore,
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
  const bonusScore = clamp(payload.bonusScore ?? 0, 0, 10);
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
      profileScore,
      interviewStatus: payload.interviewStatus,
      languageCertificateBonus:
        "TODO: thêm cộng điểm chứng chỉ ngoại ngữ khi ZPath có dữ liệu chính thức.",
    },
    warnings: [XTTN_WARNING],
  };
}
