import {
  evaluateGeneratedCertificateConfig,
  type GeneratedCertificateConfig,
} from "../generated-config";
import type {
  CertificateConverterContext,
  CertificateUserInput,
  ConverterSchoolSummary,
  MethodApplicabilityResult,
  SchoolConverterAdapter,
} from "../types";

const AOF_SOURCE_LABEL =
  "AOF 2026 — Đề án tuyển sinh Học viện Tài chính, Phương thức xét tuyển 2026.";

/**
 * Conversion table (Bảng 2.3) — Bảng quy đổi chứng chỉ tiếng Anh quốc tế
 *
 * IELTS  | TOEFL iBT (pre-2026) | TOEFL iBT (from 2026) | SAT/ACT | Điểm quy đổi
 * 5.5    | 55–69                | 3.5                    | SAT 1050 / ACT 22 | 9.00
 * 6.0    | 70–79                | 4.0                    | SAT 1200 / ACT 27 | 9.25
 * 6.5    | 80–89                | 4.5                    | SAT 1300 / ACT 29 | 9.50
 * 7.0    | 90–99                | 5.0                    | SAT 1400 / ACT 31 | 9.75
 * ≥ 7.5  | ≥ 100                | ≥ 5.5                  | SAT 1500 / ACT 33 | 10.00
 *
 * Source: PHUONG_THUC_XET_TUYEN_2026.docx — Section 2.3, AOF Admission Plan 2026.
 */
const AOF_CONFIG: GeneratedCertificateConfig = {
  schoolCode: "AOF",
  schoolName: "Học viện Tài chính",
  year: 2026,
  methods: [
    {
      methodCode: "PT2_N1_CERT",
      methodName: "PT2 Nhóm 1 — Xét tuyển kết hợp thí sinh xuất sắc",
      applicability: "conditional",
      note: "Chứng chỉ ≥ IELTS 7.0 / TOEFL iBT ≥ 100 là một trong các điều kiện tham gia Nhóm 1. Điểm quy đổi dùng làm Điểm môn 3 trong công thức ĐXT = M1 + M2 + M3 (thang 30).",
      sourceEvidence: [
        "Nhóm 1 yêu cầu học lực 3 năm THPT loại Tốt + MỘT trong: IELTS Academic ≥ 7.0, TOEFL iBT (trước 2026) ≥ 100, SAT ≥ 1450, ACT ≥ 31, hoặc giải HSG.",
        "Điểm môn 3: Điểm quy đổi thành tích vượt trội; chứng chỉ ngoại ngữ áp dụng Bảng 2.3 đề án.",
        "Chứng chỉ IELTS/TOEFL phải cấp từ 01/06/2024 đến thời điểm kết thúc nộp hồ sơ.",
      ],
      rules: [
        {
          certificateType: "IELTS_ACADEMIC",
          mode: "numeric_range",
          scoreField: "subject_score",
          reason:
            "IELTS ≥ 7.0 là ngưỡng điều kiện Nhóm 1; điểm quy đổi theo Bảng 2.3 làm Điểm môn 3.",
          conditions: [
            "Học lực 3 năm THPT loại Tốt (tốt nghiệp trước 2025: loại Giỏi).",
            "Chứng chỉ IELTS Academic, cấp từ 01/06/2024.",
          ],
          entries: [
            { minScore: 7.0, maxScore: 7.4, convertedScore: 9.75 },
            { minScore: 7.5, maxScore: 10.0, convertedScore: 10.0 },
          ],
        },
        {
          certificateType: "TOEFL_IBT",
          mode: "numeric_range",
          scoreField: "subject_score",
          reason:
            "TOEFL iBT đạt ngưỡng Nhóm 1 (trước 2026: ≥100 hoặc từ 2026: ≥5.0) được quy đổi theo Bảng 2.3 làm Điểm môn 3.",
          conditions: [
            "Học lực 3 năm THPT loại Tốt (tốt nghiệp trước 2025: loại Giỏi).",
            "Không dùng TOEFL iBT Home Edition.",
          ],
          entries: [
            { minScore: 5.0, maxScore: 5.4, convertedScore: 9.75 },
            { minScore: 5.5, maxScore: 10, convertedScore: 10.0 },
            { minScore: 100, maxScore: 120, convertedScore: 10.0 },
          ],
        },
        {
          certificateType: "SAT",
          mode: "numeric_range",
          scoreField: "subject_score",
          reason:
            "SAT đạt ngưỡng Nhóm 1 (≥1450) được quy đổi theo Bảng 2.3 làm Điểm môn 3.",
          conditions: [
            "Học lực 3 năm THPT loại Tốt (tốt nghiệp trước 2025: loại Giỏi).",
          ],
          entries: [
            { minScore: 1400, maxScore: 1499, convertedScore: 9.75 },
            { minScore: 1500, maxScore: 1600, convertedScore: 10.0 },
          ],
        },
        {
          certificateType: "ACT",
          mode: "numeric_range",
          scoreField: "subject_score",
          reason:
            "ACT đạt ngưỡng Nhóm 1 (≥31) được quy đổi theo Bảng 2.3 làm Điểm môn 3.",
          conditions: [
            "Học lực 3 năm THPT loại Tốt (tốt nghiệp trước 2025: loại Giỏi).",
          ],
          entries: [
            { minScore: 31, maxScore: 32, convertedScore: 9.75 },
            { minScore: 33, maxScore: 36, convertedScore: 10.0 },
          ],
        },
      ],
    },
    {
      methodCode: "PT2_N2_CERT",
      methodName: "PT2 Nhóm 2 — Xét tuyển kết hợp thành tích ngoại ngữ tốt",
      applicability: "conditional",
      note: "Chứng chỉ ≥ IELTS 5.5 / TOEFL iBT ≥ 55 là một trong các điều kiện tham gia Nhóm 2. Điểm quy đổi dùng làm Điểm môn 3 trong công thức ĐXT = M1 + M2 + M3 (thang 30).",
      sourceEvidence: [
        "Nhóm 2 yêu cầu học lực 3 năm THPT loại Tốt + MỘT trong: IELTS Academic ≥ 5.5, TOEFL iBT (trước 2026) ≥ 55, SAT ≥ 1050, ACT ≥ 22, hoặc giải HSG Nhì/Ba tỉnh/TP.",
        "Điểm môn 3: Điểm quy đổi thành tích học tập, chứng chỉ Tiếng Anh quốc tế (Bảng 2.3 đề án).",
        "Điểm môn 1: điểm thi THPT 2026 môn Toán; Điểm môn 2: TBC 3 năm tổ hợp cao nhất.",
      ],
      rules: [
        {
          certificateType: "IELTS_ACADEMIC",
          mode: "numeric_range",
          scoreField: "subject_score",
          reason:
            "IELTS ≥ 5.5 là ngưỡng điều kiện Nhóm 2; điểm quy đổi theo Bảng 2.3 làm Điểm môn 3.",
          conditions: [
            "Học lực 3 năm THPT loại Tốt (tốt nghiệp trước 2025: loại Giỏi).",
          ],
          entries: [
            { minScore: 5.5, maxScore: 5.9, convertedScore: 9.0 },
            { minScore: 6.0, maxScore: 6.4, convertedScore: 9.25 },
            { minScore: 6.5, maxScore: 6.9, convertedScore: 9.5 },
            { minScore: 7.0, maxScore: 7.4, convertedScore: 9.75 },
            { minScore: 7.5, maxScore: 10.0, convertedScore: 10.0 },
          ],
        },
        {
          certificateType: "TOEFL_IBT",
          mode: "numeric_range",
          scoreField: "subject_score",
          reason:
            "TOEFL iBT đạt ngưỡng Nhóm 2 (trước 2026: ≥55 hoặc từ 2026: ≥3.5) được quy đổi theo Bảng 2.3 làm Điểm môn 3.",
          conditions: [
            "Học lực 3 năm THPT loại Tốt (tốt nghiệp trước 2025: loại Giỏi).",
            "Không dùng TOEFL iBT Home Edition.",
          ],
          entries: [
            { minScore: 3.5, maxScore: 3.9, convertedScore: 9.0 },
            { minScore: 4.0, maxScore: 4.4, convertedScore: 9.25 },
            { minScore: 4.5, maxScore: 4.9, convertedScore: 9.5 },
            { minScore: 5.0, maxScore: 5.4, convertedScore: 9.75 },
            { minScore: 5.5, maxScore: 10, convertedScore: 10.0 },
            { minScore: 55, maxScore: 69, convertedScore: 9.0 },
            { minScore: 70, maxScore: 79, convertedScore: 9.25 },
            { minScore: 80, maxScore: 89, convertedScore: 9.5 },
            { minScore: 90, maxScore: 99, convertedScore: 9.75 },
            { minScore: 100, maxScore: 120, convertedScore: 10.0 },
          ],
        },
        {
          certificateType: "SAT",
          mode: "numeric_range",
          scoreField: "subject_score",
          reason:
            "SAT đạt ngưỡng Nhóm 2 (≥1050) được quy đổi theo Bảng 2.3 làm Điểm môn 3.",
          conditions: [
            "Học lực 3 năm THPT loại Tốt (tốt nghiệp trước 2025: loại Giỏi).",
          ],
          entries: [
            { minScore: 1050, maxScore: 1199, convertedScore: 9.0 },
            { minScore: 1200, maxScore: 1299, convertedScore: 9.25 },
            { minScore: 1300, maxScore: 1399, convertedScore: 9.5 },
            { minScore: 1400, maxScore: 1499, convertedScore: 9.75 },
            { minScore: 1500, maxScore: 1600, convertedScore: 10.0 },
          ],
        },
        {
          certificateType: "ACT",
          mode: "numeric_range",
          scoreField: "subject_score",
          reason:
            "ACT đạt ngưỡng Nhóm 2 (≥22) được quy đổi theo Bảng 2.3 làm Điểm môn 3.",
          conditions: [
            "Học lực 3 năm THPT loại Tốt (tốt nghiệp trước 2025: loại Giỏi).",
          ],
          entries: [
            { minScore: 22, maxScore: 26, convertedScore: 9.0 },
            { minScore: 27, maxScore: 28, convertedScore: 9.25 },
            { minScore: 29, maxScore: 30, convertedScore: 9.5 },
            { minScore: 31, maxScore: 32, convertedScore: 9.75 },
            { minScore: 33, maxScore: 36, convertedScore: 10.0 },
          ],
        },
      ],
    },
    {
      methodCode: "PT3_THPT_CERT",
      methodName: "PT3 — Thi THPT 2026 + chứng chỉ thay điểm tiếng Anh",
      applicability: "direct",
      note: "Điểm chứng chỉ thay thế điểm thi THPT môn Tiếng Anh trong tổ hợp. Nếu điểm thi THPT cao hơn → giữ nguyên điểm thi.",
      sourceEvidence: [
        "PT3 – Mục 3.3: Thí sinh có chứng chỉ Tiếng Anh quốc tế được quy đổi điểm thay thế điểm thi THPT môn Tiếng Anh (bao gồm cả thí sinh không có điểm thi Tiếng Anh).",
        "Nếu điểm thi THPT môn Tiếng Anh cao hơn điểm quy đổi → giữ nguyên điểm thi.",
        "Áp dụng bảng quy đổi 2.3; đăng ký trực tuyến tại https://xettuyen.hvtc.edu.vn từ 28/05/2026.",
      ],
      rules: [
        {
          certificateType: "IELTS_ACADEMIC",
          mode: "numeric_range",
          scoreField: "subject_score",
          reason:
            "Điểm IELTS quy đổi (Bảng 2.3) thay thế điểm thi THPT môn Tiếng Anh. Áp dụng tổ hợp A01, D01, D07, X26.",
          conditions: [
            "Chỉ áp dụng khi chọn tổ hợp có môn Tiếng Anh: A01, D01, D07, X26.",
            "Nếu điểm thi THPT Tiếng Anh cao hơn điểm quy đổi → giữ điểm thi.",
          ],
          entries: [
            { minScore: 5.5, maxScore: 5.9, convertedScore: 9.0 },
            { minScore: 6.0, maxScore: 6.4, convertedScore: 9.25 },
            { minScore: 6.5, maxScore: 6.9, convertedScore: 9.5 },
            { minScore: 7.0, maxScore: 7.4, convertedScore: 9.75 },
            { minScore: 7.5, maxScore: 10.0, convertedScore: 10.0 },
          ],
        },
        {
          certificateType: "TOEFL_IBT",
          mode: "numeric_range",
          scoreField: "subject_score",
          reason:
            "Điểm TOEFL iBT quy đổi (Bảng 2.3) thay thế điểm thi THPT môn Tiếng Anh. Áp dụng tổ hợp A01, D01, D07, X26.",
          conditions: [
            "Chỉ áp dụng khi chọn tổ hợp có môn Tiếng Anh: A01, D01, D07, X26.",
            "Không dùng TOEFL iBT Home Edition.",
            "Nếu điểm thi THPT Tiếng Anh cao hơn điểm quy đổi → giữ điểm thi.",
          ],
          entries: [
            { minScore: 3.5, maxScore: 3.9, convertedScore: 9.0 },
            { minScore: 4.0, maxScore: 4.4, convertedScore: 9.25 },
            { minScore: 4.5, maxScore: 4.9, convertedScore: 9.5 },
            { minScore: 5.0, maxScore: 5.4, convertedScore: 9.75 },
            { minScore: 5.5, maxScore: 10, convertedScore: 10.0 },
            { minScore: 55, maxScore: 69, convertedScore: 9.0 },
            { minScore: 70, maxScore: 79, convertedScore: 9.25 },
            { minScore: 80, maxScore: 89, convertedScore: 9.5 },
            { minScore: 90, maxScore: 99, convertedScore: 9.75 },
            { minScore: 100, maxScore: 120, convertedScore: 10.0 },
          ],
        },
      ],
    },
  ],
};

/** Normalize IELTS aliases to the standard certificateType used in AOF_CONFIG. */
function normalizeAofCertificateType(certificateType: string): string {
  if (certificateType === "IELTS") return "IELTS_ACADEMIC";
  return certificateType;
}

export class AofConverterAdapter implements SchoolConverterAdapter {
  readonly adapterId = "aof-adapter";
  readonly schoolCodes = ["AOF"] as const;

  async getResults({
    input,
  }: {
    input: CertificateUserInput;
    school: ConverterSchoolSummary;
    context: CertificateConverterContext;
  }): Promise<MethodApplicabilityResult[]> {
    const normalizedInput: CertificateUserInput = {
      ...input,
      certificateType: normalizeAofCertificateType(input.certificateType),
    };

    return evaluateGeneratedCertificateConfig(AOF_CONFIG, normalizedInput).map(
      (result) => ({ ...result, sourceLabel: AOF_SOURCE_LABEL }),
    );
  }
}
