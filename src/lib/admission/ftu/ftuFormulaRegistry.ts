import type {
  FormulaDefinition,
  FTUAdmissionMethod,
  FTUProgramGroup,
  FTUScoringInput,
} from "./ftuTypes";

const SOURCE_NOTE =
  "FTU 2026 admission information, Decision No. 1566/QĐ-ĐHNT dated 08/04/2026.";

function formulaCode(method: FTUAdmissionMethod, group?: FTUProgramGroup) {
  return group ? `FTU_2026_${method}_${group}` : `FTU_2026_${method}`;
}

function getFormulaText(method: FTUAdmissionMethod, group?: FTUProgramGroup) {
  if (method === "DIRECT_ADMISSION") {
    return "Xét tuyển thẳng theo Quy chế của Bộ GD&ĐT và quy định của Trường Đại học Ngoại thương.";
  }

  if (method === "DOMESTIC_ASSESSMENT") {
    if (group === "TECH_DATA_AI") {
      return "Nhóm Công nghệ/Dữ liệu/AI: điểm quy đổi bài đánh giá trong nước nhân hệ số 4/3, cộng điểm ưu tiên và điểm thưởng.";
    }
    if (group === "COMMERCIAL_LANGUAGE") {
      return "Nhóm Ngôn ngữ thương mại: chỉ hỗ trợ HSA theo công thức quy đổi sang thang 40, cộng điểm ưu tiên và điểm thưởng.";
    }
    return "Nhóm tiêu chuẩn/tích hợp: quy đổi kết quả đánh giá trong nước về thang điểm chính thức, cộng điểm ưu tiên và điểm thưởng.";
  }

  if (method === "INTERNATIONAL_ASSESSMENT_WITH_LANGUAGE_CERT") {
    if (group === "TECH_DATA_AI") {
      return "Nhóm Công nghệ/Dữ liệu/AI: điểm quy đổi SAT/ACT/A-Level và chứng chỉ ngoại ngữ theo công thức thang 40.";
    }
    if (group === "COMMERCIAL_LANGUAGE") {
      return "Nhóm Ngôn ngữ thương mại: điểm quy đổi đánh giá quốc tế kết hợp chứng chỉ ngoại ngữ theo công thức thang 40.";
    }
    return "Nhóm tiêu chuẩn/tích hợp: điểm quy đổi đánh giá quốc tế kết hợp chứng chỉ ngoại ngữ theo công thức thang 30.";
  }

  if (group === "TECH_DATA_AI") {
    return "Nhóm Công nghệ/Dữ liệu/AI: M1 x 2 + M2 + M3 + điểm ưu tiên + điểm thưởng.";
  }
  if (group === "COMMERCIAL_LANGUAGE") {
    return "Nhóm Ngôn ngữ thương mại: M1 + M2 x 1.5 + M3 x 1.5 + điểm ưu tiên + điểm thưởng.";
  }
  return "Nhóm tiêu chuẩn/tích hợp: M1 + M2 + M3 + điểm ưu tiên + điểm thưởng.";
}

export function getFTUFormula(input: FTUScoringInput): FormulaDefinition {
  const group = input.programGroup;
  const officialMaxScore =
    input.method === "DIRECT_ADMISSION"
      ? null
      : group === "TECH_DATA_AI" || group === "COMMERCIAL_LANGUAGE"
        ? 40
        : 30;

  return {
    code: formulaCode(input.method, group),
    officialMaxScore,
    formulaTextVi: getFormulaText(input.method, group),
    sourceNotes: [SOURCE_NOTE],
  };
}

export function normalizeFTUScoreTo30(
  rawScore: number,
  officialMaxScore: 30 | 40,
) {
  return officialMaxScore === 30 ? rawScore : (rawScore * 30) / 40;
}

export function roundFTUScore(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
