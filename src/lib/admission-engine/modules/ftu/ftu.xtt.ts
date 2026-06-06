import type { AdmissionInput, AdmissionScoreResult } from "../../core/types";
import { isRecord, round2 } from "./ftu.shared";
import type { FtuXttObject } from "./ftu.types";

const XTT_WARNING =
  "Xét tuyển thẳng phụ thuộc vào việc xét hồ sơ và chỉ tiêu của Trường; kết quả chỉ kiểm tra điều kiện sơ bộ theo mục 6.1.1.";

// Đối tượng d cần tổng 3 môn thi TN THPT theo tổ hợp (gồm điểm ưu tiên) >= 24.0.
const OBJECT_D_MIN_TOTAL = 24.0;

const OBJECT_LABELS: Record<FtuXttObject, string> = {
  a: "Anh hùng lao động/LLVT/Chiến sĩ thi đua toàn quốc đã tốt nghiệp THPT",
  b: "Tham gia/đạt giải Olympic quốc tế",
  c: "Đạt giải Nhất/Nhì/Ba kỳ thi HSG cấp Quốc gia",
  d: "Đạt giải chính thức cuộc thi nghệ thuật quốc tế",
  e: "Người khuyết tật đặc biệt nặng",
  f: "Người nước ngoài hoặc học chương trình THPT ở nước ngoài",
  g: "Dân tộc thiểu số rất ít người",
};

type FtuXttParsed = {
  programCode?: string;
  object: FtuXttObject;
  totalThreeSubjects?: number;
  awardYear?: number;
};

function parseXttPayload(payload: unknown): FtuXttParsed {
  if (!isRecord(payload)) {
    throw new Error("Dữ liệu xét tuyển thẳng không hợp lệ.");
  }

  const object = payload.object as FtuXttObject;
  if (!OBJECT_LABELS[object]) {
    throw new Error("Đối tượng xét tuyển thẳng không hợp lệ.");
  }

  return {
    programCode:
      typeof payload.programCode === "string" ? payload.programCode : undefined,
    object,
    totalThreeSubjects:
      typeof payload.totalThreeSubjects === "number" &&
      Number.isFinite(payload.totalThreeSubjects)
        ? payload.totalThreeSubjects
        : undefined,
    awardYear:
      typeof payload.awardYear === "number" && Number.isFinite(payload.awardYear)
        ? payload.awardYear
        : undefined,
  };
}

export function calculateFtuXttEligibility(
  input: AdmissionInput,
): AdmissionScoreResult {
  const parsed = parseXttPayload(input.payload);

  const conditions: { label: string; passed: boolean }[] = [];
  let eligible = true;

  conditions.push({
    label: `Thuộc đối tượng xét tuyển thẳng: ${OBJECT_LABELS[parsed.object]}`,
    passed: true,
  });

  if (parsed.object === "d") {
    const total = parsed.totalThreeSubjects ?? 0;
    const passed = total >= OBJECT_D_MIN_TOTAL;
    if (!passed) eligible = false;
    conditions.push({
      label: `Tổng điểm 3 môn thi TN THPT theo tổ hợp (gồm ưu tiên) đạt >= ${OBJECT_D_MIN_TOTAL.toFixed(1)} (hiện: ${round2(total)})`,
      passed,
    });
  }

  return {
    schoolCode: input.schoolCode,
    method: "XTT",
    year: input.year,
    originalScore: 0,
    originalScale: 30,
    normalizedScore30: 0,
    targetScale: 30,
    formulaUsed: "FTU_XTT_ELIGIBILITY",
    details: {
      programCode: parsed.programCode,
      object: parsed.object,
      objectLabel: OBJECT_LABELS[parsed.object],
      resultType: "eligibility",
      eligible,
      conditions,
      awardYear: parsed.awardYear,
    },
    warnings: [XTT_WARNING],
  };
}
