import { resolveFTUCertificateConvertedScore } from "@/src/lib/admission";

import type {
  CertificateConverterContext,
  CertificateUserInput,
  ConverterSchoolSummary,
  MethodApplicabilityResult,
  SchoolConverterAdapter,
} from "../types";

const FTU_SOURCE_LABEL =
  "FTU 2026 admission information, Decision No. 1566/QĐ-ĐHNT dated 08/04/2026.";

const FTU_CERTIFICATE_TYPE_MAP: Record<string, string> = {
  IELTS_ACADEMIC: "IELTS",
  IELTS: "IELTS",
  TOEFL_IBT: "TOEFL_IBT",
  TOEIC: "TOEIC",
  HSK: "HSK",
  JLPT: "JLPT",
  DELF_DALF: "DELF",
  TCF: "TCF",
};

function mapCertificateType(certificateType: string) {
  return FTU_CERTIFICATE_TYPE_MAP[certificateType] ?? certificateType;
}

function createMethodResult(
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
    reason: "Không tìm thấy mức quy đổi chứng chỉ FTU phù hợp.",
    notes: [],
    sourceLabel: FTU_SOURCE_LABEL,
  };
}

async function resolveConvertedScore(input: CertificateUserInput) {
  if (input.certificateType === "TOEIC" && input.toeic) {
    return null;
  }

  const rawScore =
    input.score ??
    input.textValue ??
    input.bandId;
  if (rawScore === undefined) return null;

  return resolveFTUCertificateConvertedScore({
    certificateType: mapCertificateType(input.certificateType),
    rawScore,
  });
}

export class FtuConverterAdapter implements SchoolConverterAdapter {
  readonly adapterId = "ftu-adapter";
  readonly schoolCodes = ["FTU"] as const;

  async getResults({
    input,
    school,
  }: {
    input: CertificateUserInput;
    school: ConverterSchoolSummary;
    context: CertificateConverterContext;
  }): Promise<MethodApplicabilityResult[]> {
    const transcript = createMethodResult(
      school,
      "ACADEMIC_TRANSCRIPT_WITH_LANGUAGE_CERT",
      "Học bạ + chứng chỉ ngoại ngữ",
    );
    const thpt = createMethodResult(
      school,
      "THPT_WITH_LANGUAGE_CERT",
      "THPT + chứng chỉ ngoại ngữ",
    );
    const international = createMethodResult(
      school,
      "INTERNATIONAL_ASSESSMENT_WITH_LANGUAGE_CERT",
      "SAT/ACT/A-Level + chứng chỉ ngoại ngữ",
    );

    if (input.certificateType === "TOEIC" && input.toeic) {
      transcript.reason =
        "FTU cần đầu vào TOEIC ở dạng một giá trị quy đổi theo bảng trường; chưa hỗ trợ nhập 4 kỹ năng độc lập.";
      thpt.reason =
        "FTU cần đầu vào TOEIC ở dạng một giá trị quy đổi theo bảng trường; chưa hỗ trợ nhập 4 kỹ năng độc lập.";
      international.reason =
        "FTU cần đầu vào TOEIC ở dạng một giá trị quy đổi theo bảng trường; chưa hỗ trợ nhập 4 kỹ năng độc lập.";
      return [transcript, thpt, international];
    }

    const converted = await resolveConvertedScore(input);
    if (converted === null) {
      return [transcript, thpt, international];
    }

    transcript.status = "applicable";
    transcript.convertedScore = converted;
    transcript.reason = "Áp dụng trực tiếp làm điểm môn ngoại ngữ trong phương thức học bạ.";

    thpt.status = "applicable";
    thpt.convertedScore = converted;
    thpt.reason = "Áp dụng trực tiếp làm điểm môn ngoại ngữ trong phương thức THPT.";

    international.status = "conditional";
    international.convertedScore = converted;
    international.reason =
      "Áp dụng cho phương thức đánh giá quốc tế, nhưng cần thêm điểm SAT/ACT/A-Level để tính tổng.";
    international.notes.push(
      "Điểm chứng chỉ là một thành phần của công thức, không phải kết quả cuối cùng.",
    );

    return [transcript, thpt, international];
  }
}
