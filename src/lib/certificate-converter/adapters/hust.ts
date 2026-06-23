import {
  HUST_LANGUAGE_CERTIFICATE_SOURCE_LABEL,
  convertLanguageCertificateToBand,
  convertToeicFourSkills,
  isLanguageCertificateType,
} from "@/src/lib/admission-engine/modules/hust/language-certificate";

import type {
  CertificateConverterContext,
  CertificateUserInput,
  ConverterSchoolSummary,
  MethodApplicabilityResult,
  SchoolConverterAdapter,
} from "../types";

function parseHustConversion(input: CertificateUserInput) {
  if (input.certificateType === "TOEIC") {
    const toeic = input.toeic ?? {};
    const hasAllSkills = ["listening", "speaking", "reading", "writing"].every(
      (skill) => typeof toeic[skill as keyof typeof toeic] === "number",
    );
    if (!hasAllSkills) return null;
    return convertToeicFourSkills({
      listening: toeic.listening,
      speaking: toeic.speaking,
      reading: toeic.reading,
      writing: toeic.writing,
    });
  }

  if (!isLanguageCertificateType(input.certificateType)) return null;

  return convertLanguageCertificateToBand({
    certificateType: input.certificateType,
    score: input.score,
    bandId: input.bandId,
    textValue: input.textValue,
  });
}

function createCommonResult(
  school: ConverterSchoolSummary,
  methodCode: string,
  methodName: string,
): MethodApplicabilityResult {
  return {
    schoolCode: school.schoolCode,
    schoolName: school.schoolName,
    methodCode,
    methodName,
    status: "not_applicable",
    convertedScore: null,
    scoreUnit: "/10",
    reason: "Không tìm thấy mức quy đổi phù hợp theo bảng chứng chỉ của HUST.",
    notes: [],
    sourceLabel: HUST_LANGUAGE_CERTIFICATE_SOURCE_LABEL,
  };
}

export class HustConverterAdapter implements SchoolConverterAdapter {
  readonly adapterId = "hust-adapter";
  readonly schoolCodes = ["HUST"] as const;

  async getResults({
    input,
    school,
  }: {
    input: CertificateUserInput;
    school: ConverterSchoolSummary;
    context: CertificateConverterContext;
  }): Promise<MethodApplicabilityResult[]> {
    const conversion = parseHustConversion(input);

    const thpt = createCommonResult(school, "THPT", "Điểm thi THPT");
    const tsa = createCommonResult(school, "TSA", "Đánh giá tư duy");
    const xttn = createCommonResult(
      school,
      "XTTN",
      "Xét tuyển tài năng (hồ sơ + phỏng vấn)",
    );

    if (!conversion) {
      if (input.certificateType === "TOEIC") {
        thpt.reason =
          "TOEIC cần đủ 4 kỹ năng (Nghe, Nói, Đọc, Viết) để quy đổi.";
        tsa.reason =
          "TOEIC cần đủ 4 kỹ năng (Nghe, Nói, Đọc, Viết) để cộng điểm bonus.";
        xttn.reason =
          "TOEIC cần đủ 4 kỹ năng (Nghe, Nói, Đọc, Viết) để cộng điểm bonus.";
      }
      return [thpt, tsa, xttn];
    }

    thpt.status = "conditional";
    thpt.convertedScore = conversion.convertedSubjectScoreOutOf10;
    thpt.reason =
      "Áp dụng khi chọn tổ hợp có môn tiếng Anh và tổ hợp cho phép quy đổi chứng chỉ.";
    thpt.notes.push(
      "Các tổ hợp thường dùng quy đổi: A01, D01, D07 (theo module HUST hiện tại).",
    );

    tsa.status = "applicable";
    tsa.convertedScore = conversion.bonusScoreOutOf10;
    tsa.reason =
      "Dùng làm điểm thưởng chứng chỉ ngoại ngữ trong công thức TSA của HUST.";
    tsa.notes.push(
      "Điểm thưởng được cộng vào tổng điểm trước bước quy đổi về thang 30.",
    );

    xttn.status = "applicable";
    xttn.convertedScore = conversion.bonusScoreOutOf10;
    xttn.reason =
      "Dùng làm điểm thưởng chứng chỉ ngoại ngữ trong công thức XTTN của HUST.";
    xttn.notes.push("Điểm thưởng nằm trong thành phần bonus của hồ sơ năng lực.");

    return [thpt, tsa, xttn];
  }
}
