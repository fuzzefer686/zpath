import type { AdmissionInput, AdmissionScoreResult } from "../../core/types";

type HustXttnScale = 30 | 100;

const XTTN_WARNING =
  "MVP chỉ hỗ trợ nhập thủ công điểm XTTN đã được tính sẵn.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseHustXttnPayload(payload: unknown) {
  if (!isRecord(payload)) {
    throw new Error("HUST XTTN payload must be an object.");
  }

  const { xttnScore } = payload;

  if (typeof xttnScore !== "number" || !Number.isFinite(xttnScore)) {
    throw new Error("HUST XTTN xttnScore must be a finite number.");
  }

  const scale = payload.scale ?? 30;
  if (scale !== 30 && scale !== 100) {
    throw new Error("HUST XTTN scale must be either 30 or 100.");
  }

  if (xttnScore < 0 || xttnScore > scale) {
    throw new Error(`HUST XTTN xttnScore must be between 0 and ${scale}.`);
  }

  return {
    xttnScore,
    scale: scale as HustXttnScale,
  };
}

export function calculateHustXttnScore(
  input: AdmissionInput,
): AdmissionScoreResult {
  const payload = parseHustXttnPayload(input.payload);
  const normalizedScore30 =
    payload.scale === 30 ? payload.xttnScore : (payload.xttnScore / 100) * 30;

  return {
    schoolCode: input.schoolCode,
    method: "XTTN",
    year: input.year,
    originalScore: payload.xttnScore,
    originalScale: payload.scale,
    normalizedScore30,
    targetScale: 30,
    formulaUsed: `${input.schoolCode}_XTTN_MANUAL_INPUT`,
    details: {
      xttnScore: payload.xttnScore,
      scale: payload.scale,
      conversion:
        payload.scale === 30 ? "manual score on scale 30" : "xttnScore / 100 * 30",
    },
    warnings: [XTTN_WARNING],
  };
}
