import type {
  GenericAdmissionConfig,
  GenericCertificateLevel,
  GenericSubjectCombination,
} from "@/src/lib/admission-engine/generic/config-schema";

/**
 * AOF — Học viện Tài chính, Admission Config 2026
 *
 * Source: Đề án tuyển sinh Học viện Tài chính năm 2026
 * (PHUONG_THUC_XET_TUYEN_2026.docx)
 *
 * Supported methods:
 *   PT3_THPT          — Xét điểm thi tốt nghiệp THPT (thang 30)
 *   PT2_N1_HOCBA_CERT — Xét tuyển kết hợp Nhóm 1 (TBC Toán HB + TBC môn 2 tốt nhất HB + Cert/HSG)
 *   PT2_N2_CERT       — Xét tuyển kết hợp Nhóm 2 (Toán THPT + TBC tổ hợp HB + Cert TA)
 *   PT2_N3_HOC_BA     — Xét tuyển kết hợp Nhóm 3 (Toán THPT + TBC tổ hợp HB + Best môn phụ THPT)
 */

/**
 * Bảng 2.3 — Quy đổi IELTS Academic (thang 0–9) theo đề án AOF 2026.
 */
const IELTS_LEVELS: GenericCertificateLevel[] = [
  { band: 5.5, convertedScore: 9.0 },
  { band: 6.0, convertedScore: 9.25 },
  { band: 6.5, convertedScore: 9.5 },
  { band: 7.0, convertedScore: 9.75 },
  { band: 7.5, convertedScore: 10.0 },
];

/**
 * Bảng 2.3 — Quy đổi TOEFL iBT (trước 2026, thang 0–120) theo đề án AOF 2026.
 */
const TOEFL_IBT_LEGACY_LEVELS: GenericCertificateLevel[] = [
  { band: 55, convertedScore: 9.0 },
  { band: 70, convertedScore: 9.25 },
  { band: 80, convertedScore: 9.5 },
  { band: 90, convertedScore: 9.75 },
  { band: 100, convertedScore: 10.0 },
];

/**
 * Bảng 2.3 — Quy đổi TOEFL iBT (từ 2026, thang 3.5–5.5) theo đề án AOF 2026.
 */
const TOEFL_IBT_2026_LEVELS: GenericCertificateLevel[] = [
  { band: 3.5, convertedScore: 9.0 },
  { band: 4.0, convertedScore: 9.25 },
  { band: 4.5, convertedScore: 9.5 },
  { band: 5.0, convertedScore: 9.75 },
  { band: 5.5, convertedScore: 10.0 },
];

/**
 * Bảng 2.3 — Quy đổi SAT theo đề án AOF 2026.
 */
const SAT_LEVELS: GenericCertificateLevel[] = [
  { band: 1050, convertedScore: 9.0 },
  { band: 1200, convertedScore: 9.25 },
  { band: 1300, convertedScore: 9.5 },
  { band: 1400, convertedScore: 9.75 },
  { band: 1500, convertedScore: 10.0 },
];

/**
 * Bảng 2.3 — Quy đổi ACT theo đề án AOF 2026.
 */
const ACT_LEVELS: GenericCertificateLevel[] = [
  { band: 22, convertedScore: 9.0 },
  { band: 27, convertedScore: 9.25 },
  { band: 29, convertedScore: 9.5 },
  { band: 31, convertedScore: 9.75 },
  { band: 33, convertedScore: 10.0 },
];

/**
 * 6 tổ hợp được AOF sử dụng trong PT3 (Phương thức 3 — thi THPT 2026).
 * Tiếng Anh (key: "english") trong tổ hợp là điểm thi THPT; cert được nhập
 * riêng và hệ thống lấy MAX giữa hai nguồn.
 */
const AOF_PT3_COMBINATIONS: GenericSubjectCombination[] = [
  {
    code: "A00",
    label: "A00 — Toán, Vật lý, Hóa học",
    subjects: [
      { key: "math", label: "Toán", required: true, type: "number", min: 0, max: 10 },
      { key: "physics", label: "Vật lý", required: true, type: "number", min: 0, max: 10 },
      { key: "chemistry", label: "Hóa học", required: true, type: "number", min: 0, max: 10 },
    ],
  },
  {
    code: "A01",
    label: "A01 — Toán, Vật lý, Tiếng Anh",
    subjects: [
      { key: "math", label: "Toán", required: true, type: "number", min: 0, max: 10 },
      { key: "physics", label: "Vật lý", required: true, type: "number", min: 0, max: 10 },
      { key: "english", label: "Tiếng Anh (thi)", required: true, type: "number", min: 0, max: 10 },
    ],
  },
  {
    code: "D01",
    label: "D01 — Toán, Ngữ văn, Tiếng Anh",
    subjects: [
      { key: "math", label: "Toán", required: true, type: "number", min: 0, max: 10 },
      { key: "literature", label: "Ngữ văn", required: true, type: "number", min: 0, max: 10 },
      { key: "english", label: "Tiếng Anh (thi)", required: true, type: "number", min: 0, max: 10 },
    ],
  },
  {
    code: "D07",
    label: "D07 — Toán, Hóa học, Tiếng Anh",
    subjects: [
      { key: "math", label: "Toán", required: true, type: "number", min: 0, max: 10 },
      { key: "chemistry", label: "Hóa học", required: true, type: "number", min: 0, max: 10 },
      { key: "english", label: "Tiếng Anh (thi)", required: true, type: "number", min: 0, max: 10 },
    ],
  },
  {
    code: "X06",
    label: "X06 — Toán, Vật lý, Tin học",
    subjects: [
      { key: "math", label: "Toán", required: true, type: "number", min: 0, max: 10 },
      { key: "physics", label: "Vật lý", required: true, type: "number", min: 0, max: 10 },
      { key: "informatics", label: "Tin học", required: true, type: "number", min: 0, max: 10 },
    ],
  },
  {
    code: "X26",
    label: "X26 — Toán, Tin học, Tiếng Anh",
    subjects: [
      { key: "math", label: "Toán", required: true, type: "number", min: 0, max: 10 },
      { key: "informatics", label: "Tin học", required: true, type: "number", min: 0, max: 10 },
      { key: "english", label: "Tiếng Anh (thi)", required: true, type: "number", min: 0, max: 10 },
    ],
  },
];

/** English subject formula terms: take max(thi, ielts_cert, toefl legacy, toefl 2026). */
const ENGLISH_MAX_TERM = {
  inputKey: "english",
  weight: 1,
  maxOfInputKeys: [
    "english",
    "ielts_cert",
    "toefl_cert_legacy",
    "toefl_cert_2026",
  ] as string[],
};

export const AOF_ADMISSION_CONFIG: GenericAdmissionConfig = {
  schemaVersion: 2,
  schoolCode: "AOF",
  schoolName: "Học viện Tài chính",
  year: 2026,
  programSource: "db",
  benchmarkSource: "db",
  benchmarkYear: 2025,
  disclaimer:
    "Kết quả chỉ mang tính tham khảo dựa trên đề án tuyển sinh chính thức. Vui lòng đối chiếu thông tin với Học viện Tài chính trước khi đăng ký xét tuyển.",
  sourceUrl: "https://xettuyen.hvtc.edu.vn",
  methods: [
    // -----------------------------------------------------------------------
    // PT3 — Xét tuyển theo điểm thi tốt nghiệp THPT 2026
    // ĐXT = Môn 1 + Môn 2 + Môn 3 (thang 30)
    // Cert TA thay điểm thi nếu cao hơn (tổ hợp A01, D01, D07, X26)
    // -----------------------------------------------------------------------
    {
      methodCode: "PT3_THPT",
      methodName: "PT3 — Xét điểm thi tốt nghiệp THPT",
      description:
        "Điểm xét tuyển = tổng 3 môn tổ hợp (thang 30). Chứng chỉ IELTS/TOEFL có thể thay điểm thi Tiếng Anh nếu điểm quy đổi cao hơn (tổ hợp A01, D01, D07, X26).",
      requirements: [
        "Tốt nghiệp THPT trên toàn quốc.",
        "Ngưỡng đầu vào: 19 điểm (chương trình chuẩn), 20 điểm (CCQT, DDP).",
        "Tổ hợp A00 và X06 chỉ dành cho chương trình chuẩn và DDP.",
        "Tổ hợp CCQT và Ngôn ngữ Anh: chỉ xét A01, D01, D07, X26.",
      ],
      sources: [
        {
          url: "https://xettuyen.hvtc.edu.vn",
          label: "Đề án tuyển sinh AOF 2026 — Phương thức 3",
          excerpt:
            "Thí sinh có chứng chỉ Tiếng Anh quốc tế được quy đổi điểm thay thế điểm thi THPT môn Tiếng Anh. Nếu điểm thi cao hơn → giữ điểm thi.",
        },
      ],
      uiTemplate: "thpt_combination",
      combinationInputKey: "combination",
      priorityInputKey: "priority",
      inputs: [
        {
          key: "subjects",
          label: "Điểm thi các môn",
          type: "subject_group",
          required: true,
          combinations: AOF_PT3_COMBINATIONS,
        },
        {
          key: "ielts_cert",
          label: "Chứng chỉ IELTS Academic",
          type: "certificate",
          required: false,
          min: 0,
          max: 9,
          step: 0.5,
          certificateLevels: IELTS_LEVELS,
          note: "Nhập band score IELTS (5.5 – 9.0). Hệ thống quy đổi sang thang /10 theo Bảng 2.3.",
        },
        {
          key: "toefl_cert_legacy",
          label: "TOEFL iBT trước 2026 (thang 0–120)",
          type: "certificate",
          required: false,
          min: 0,
          max: 120,
          certificateLevels: TOEFL_IBT_LEGACY_LEVELS,
          note: "TOEFL iBT phiên bản trước 2026 (thang 0–120). Không dùng Home Edition.",
        },
        {
          key: "toefl_cert_2026",
          label: "TOEFL iBT từ 2026 (thang 3.5–5.5)",
          type: "certificate",
          required: false,
          min: 3.5,
          max: 5.5,
          step: 0.5,
          certificateLevels: TOEFL_IBT_2026_LEVELS,
          note: "TOEFL iBT từ 2026 theo thang mới (3.5–5.5), quy đổi theo Bảng 2.3.",
        },
        {
          key: "priority",
          label: "Điểm ưu tiên",
          type: "number",
          required: false,
          min: 0,
          max: 3.5,
          step: 0.25,
          note: "Cộng điểm ưu tiên khu vực và đối tượng theo quy định TT 08/2022.",
        },
      ],
      combinations: AOF_PT3_COMBINATIONS,
      formula: {
        type: "formula_group_scale",
        programGroupInputKey: "combination",
        groups: [
          {
            groupKey: "A00",
            scale: 30,
            terms: [
              { inputKey: "math", weight: 1 },
              { inputKey: "physics", weight: 1 },
              { inputKey: "chemistry", weight: 1 },
            ],
          },
          {
            groupKey: "A01",
            scale: 30,
            terms: [
              { inputKey: "math", weight: 1 },
              { inputKey: "physics", weight: 1 },
              { ...ENGLISH_MAX_TERM },
            ],
          },
          {
            groupKey: "D01",
            scale: 30,
            terms: [
              { inputKey: "math", weight: 1 },
              { inputKey: "literature", weight: 1 },
              { ...ENGLISH_MAX_TERM },
            ],
          },
          {
            groupKey: "D07",
            scale: 30,
            terms: [
              { inputKey: "math", weight: 1 },
              { inputKey: "chemistry", weight: 1 },
              { ...ENGLISH_MAX_TERM },
            ],
          },
          {
            groupKey: "X06",
            scale: 30,
            terms: [
              { inputKey: "math", weight: 1 },
              { inputKey: "physics", weight: 1 },
              { inputKey: "informatics", weight: 1 },
            ],
          },
          {
            groupKey: "X26",
            scale: 30,
            terms: [
              { inputKey: "math", weight: 1 },
              { inputKey: "informatics", weight: 1 },
              { ...ENGLISH_MAX_TERM },
            ],
          },
        ],
      },
      benchmark30: null,
    },

    // -----------------------------------------------------------------------
    // PT2 Nhóm 1 — Xét tuyển kết hợp (Thí sinh xuất sắc)
    // ĐXT = TBC học bạ Toán (M1) + TBC học bạ môn cao nhất (M2) + Cert/HSG (M3)
    // Mỗi M nhập từng năm (Lớp 10, 11, 12) → tính trung bình (weight = 1/3 mỗi năm)
    // -----------------------------------------------------------------------
    {
      methodCode: "PT2_N1_HOCBA_CERT",
      methodName: "PT2 Nhóm 1 — Xét kết hợp (thí sinh xuất sắc)",
      description:
        "ĐXT = TBC học bạ môn Toán (M1) + TBC học bạ môn cao nhất trong Văn/Lý/Hóa/Tin (M2) + Điểm quy đổi chứng chỉ TA hoặc giải HSG (M3). Thang 30.",
      requirements: [
        "Học lực 3 năm THPT loại Tốt (tốt nghiệp trước 2025: loại Giỏi).",
        "MỘT TRONG CÁC thành tích: IELTS ≥ 7.0 | TOEFL iBT ≥ 100 | SAT ≥ 1450 | ACT ≥ 31 | Giải Khuyến khích HSG Quốc gia | Giải Nhất HSG cấp Tỉnh/TP.",
        "Chứng chỉ IELTS/TOEFL phải được cấp từ 01/06/2024 đến thời điểm kết thúc nộp hồ sơ.",
      ],
      eligibilityRules: [
        {
          type: "required_any",
          inputKeys: [
            "ielts_cert",
            "toefl_cert_legacy",
            "toefl_cert_2026",
            "sat_cert",
            "act_cert",
            "hsg_score",
          ],
          message:
            "PT2 Nhóm 1 yêu cầu ít nhất một thành tích: IELTS/TOEFL/SAT/ACT hoặc điểm quy đổi HSG.",
        },
      ],
      sources: [
        {
          url: "https://xettuyen.hvtc.edu.vn",
          label: "Đề án tuyển sinh AOF 2026 — Phương thức 2, Nhóm 1",
          excerpt:
            "Điểm môn 3: Điểm quy đổi thành tích vượt trội (theo Bảng 2.3 và 2.4).",
        },
      ],
      uiTemplate: "flat",
      priorityInputKey: "priority",
      inputs: [
        // M1 — TBC học bạ Toán (3 năm)
        {
          key: "sec_m1",
          label: "M1 — TBC học bạ môn Toán",
          type: "section" as const,
          required: false,
          note: "Nhập điểm trung bình cả năm học môn Toán cho từng lớp.",
        },
        {
          key: "toan_hb10",
          label: "Toán học bạ — TBC Lớp 10 (M1)",
          type: "number",
          required: true,
          min: 0,
          max: 10,
          step: 0.1,
          note: "Điểm trung bình cả năm lớp 10 môn Toán. Thang /10.",
        },
        {
          key: "toan_hb11",
          label: "Toán học bạ — TBC Lớp 11 (M1)",
          type: "number",
          required: true,
          min: 0,
          max: 10,
          step: 0.1,
        },
        {
          key: "toan_hb12",
          label: "Toán học bạ — TBC Lớp 12 (M1)",
          type: "number",
          required: true,
          min: 0,
          max: 10,
          step: 0.1,
        },
        // M2 — TBC học bạ môn 2 tốt nhất (3 năm)
        {
          key: "sec_m2",
          label: "M2 — TBC học bạ môn tốt nhất (Văn / Lý / Hóa / Tin)",
          type: "section" as const,
          required: false,
          note: "Chọn 1 môn có điểm trung bình cao nhất trong: Ngữ văn, Vật lý, Hóa học, Tin học — nhập điểm TBC cả năm của môn đó cho từng lớp.",
        },
        {
          key: "mon2_hb10",
          label: "Môn 2 tốt nhất học bạ — TBC Lớp 10 (M2)",
          type: "number",
          required: true,
          min: 0,
          max: 10,
          step: 0.1,
          note: "Nhập TBC cả năm của 1 môn cao nhất trong: Ngữ văn, Vật lý, Hóa học, Tin học.",
        },
        {
          key: "mon2_hb11",
          label: "Môn 2 tốt nhất học bạ — TBC Lớp 11 (M2)",
          type: "number",
          required: true,
          min: 0,
          max: 10,
          step: 0.1,
          note: "Điểm TBC cả năm của cùng môn đã chọn ở Lớp 10.",
        },
        {
          key: "mon2_hb12",
          label: "Môn 2 tốt nhất học bạ — TBC Lớp 12 (M2)",
          type: "number",
          required: true,
          min: 0,
          max: 10,
          step: 0.1,
          note: "Điểm TBC cả năm của cùng môn đã chọn ở Lớp 10.",
        },
        // M3 — Chứng chỉ TA (tự quy đổi) hoặc điểm quy đổi HSG
        {
          key: "sec_m3",
          label: "M3 — Điểm quy đổi thành tích vượt trội",
          type: "section" as const,
          required: false,
          note: "Nhập chứng chỉ Tiếng Anh (tự quy đổi) hoặc điểm quy đổi giải HSG (Bảng 2.4). Hệ thống lấy điểm cao nhất.",
        },
        {
          key: "ielts_cert",
          label: "IELTS Academic (M3 — điều kiện ≥ 7.0)",
          type: "certificate",
          required: false,
          min: 0,
          max: 9,
          step: 0.5,
          certificateLevels: IELTS_LEVELS,
          note: "IELTS ≥ 7.0 → 9.75 | ≥ 7.5 → 10.0. Quy đổi tự động theo Bảng 2.3.",
        },
        {
          key: "toefl_cert_legacy",
          label: "TOEFL iBT trước 2026 (M3 — điều kiện ≥ 100)",
          type: "certificate",
          required: false,
          min: 0,
          max: 120,
          certificateLevels: TOEFL_IBT_LEGACY_LEVELS,
          note: "TOEFL iBT ≥ 100 → 10.0. Phiên bản trước 2026, không dùng Home Edition.",
        },
        {
          key: "toefl_cert_2026",
          label: "TOEFL iBT từ 2026 (M3 — điều kiện ≥ 5.0)",
          type: "certificate",
          required: false,
          min: 3.5,
          max: 5.5,
          step: 0.5,
          certificateLevels: TOEFL_IBT_2026_LEVELS,
          note: "TOEFL iBT 5.0 → 9.75 | 5.5 → 10.0 theo bảng quy đổi từ 2026.",
        },
        {
          key: "sat_cert",
          label: "SAT (M3)",
          type: "certificate",
          required: false,
          min: 400,
          max: 1600,
          step: 10,
          certificateLevels: SAT_LEVELS,
          note: "SAT 1400–1499 → 9.75 | ≥1500 → 10.0. Điều kiện Nhóm 1: SAT ≥ 1450.",
        },
        {
          key: "act_cert",
          label: "ACT (M3)",
          type: "certificate",
          required: false,
          min: 1,
          max: 36,
          step: 1,
          certificateLevels: ACT_LEVELS,
          note: "ACT 31–32 → 9.75 | ≥33 → 10.0. Điều kiện Nhóm 1: ACT ≥ 31.",
        },
        {
          key: "hsg_score",
          label: "Điểm quy đổi giải HSG (M3)",
          type: "number",
          required: false,
          min: 0,
          max: 10,
          step: 0.25,
          note: "Bảng 2.4: Giải Nhất HSG tỉnh/TP hoặc Giải Khuyến khích HSG QG → nhập 10.0 | Giải Ba HSG QG → 9.0 | Giải Nhì HSG QG → 9.5.",
        },
        {
          key: "priority",
          label: "Điểm ưu tiên",
          type: "number",
          required: false,
          min: 0,
          max: 3.5,
          step: 0.25,
          note: "Cộng điểm ưu tiên theo TT 08/2022 (nếu có).",
        },
      ],
      formula: {
        type: "weighted_combination",
        terms: [
          // M1 = TBC học bạ Toán = (lớp10 + lớp11 + lớp12) / 3
          { inputKey: "toan_hb10", weight: 1 / 3 },
          { inputKey: "toan_hb11", weight: 1 / 3 },
          { inputKey: "toan_hb12", weight: 1 / 3 },
          // M2 = TBC học bạ môn 2 tốt nhất = (lớp10 + lớp11 + lớp12) / 3
          { inputKey: "mon2_hb10", weight: 1 / 3 },
          { inputKey: "mon2_hb11", weight: 1 / 3 },
          { inputKey: "mon2_hb12", weight: 1 / 3 },
          // M3 = max(ielts_cert, toefl_cert_legacy, toefl_cert_2026, sat_cert, act_cert, hsg_score)
          {
            inputKey: "ielts_cert",
            weight: 1,
            maxOfInputKeys: [
              "ielts_cert",
              "toefl_cert_legacy",
              "toefl_cert_2026",
              "sat_cert",
              "act_cert",
              "hsg_score",
            ],
          },
        ],
        targetScale: 30,
      },
      benchmark30: null,
      note: "Hệ thống tự tính TBC (Lớp 10 + 11 + 12) / 3 cho M1 và M2. M3 lấy điểm cao nhất giữa IELTS, TOEFL iBT (2 thang), SAT, ACT và giải HSG.",
    },

    // -----------------------------------------------------------------------
    // PT2 Nhóm 2 — Xét tuyển kết hợp (Thành tích ngoại ngữ tốt)
    // ĐXT = Điểm thi THPT Toán (M1) + TBC học bạ tổ hợp 3 môn (M2) + Cert TA (M3)
    // M2: user nhập từng năm cho từng môn trong tổ hợp → weight = 1/9 mỗi điểm
    // -----------------------------------------------------------------------
    {
      methodCode: "PT2_N2_CERT",
      methodName: "PT2 Nhóm 2 — Xét kết hợp (chứng chỉ ngoại ngữ)",
      description:
        "ĐXT = Điểm thi THPT môn Toán (M1) + TBC học bạ 3 năm tổ hợp cao nhất — nhập từng môn từng năm (M2) + Điểm quy đổi chứng chỉ Tiếng Anh (M3). Thang 30.",
      requirements: [
        "Học lực 3 năm THPT loại Tốt (tốt nghiệp trước 2025: loại Giỏi).",
        "Chứng chỉ IELTS ≥ 5.5 HOẶC TOEFL iBT ≥ 55 (một trong các điều kiện tham gia Nhóm 2).",
        "Nhóm 2 cũng chấp nhận giải Nhì/Ba HSG cấp Tỉnh/TP làm điều kiện; M3 tương ứng theo Bảng 2.4 (ngoài phạm vi công cụ này).",
      ],
      eligibilityRules: [
        {
          type: "required_any",
          inputKeys: [
            "ielts_cert",
            "toefl_cert_legacy",
            "toefl_cert_2026",
            "sat_cert",
            "act_cert",
          ],
          message:
            "PT2 Nhóm 2 yêu cầu ít nhất một thành tích ngoại ngữ/chuẩn hóa: IELTS, TOEFL iBT, SAT hoặc ACT.",
        },
      ],
      sources: [
        {
          url: "https://xettuyen.hvtc.edu.vn",
          label: "Đề án tuyển sinh AOF 2026 — Phương thức 2, Nhóm 2",
          excerpt:
            "Điểm môn 3: Điểm quy đổi thành tích học tập, chứng chỉ Tiếng Anh quốc tế (Bảng 2.3).",
        },
      ],
      uiTemplate: "flat",
      priorityInputKey: "priority",
      inputs: [
        // M1
        {
          key: "sec_m1",
          label: "M1 — Điểm thi THPT môn Toán",
          type: "section" as const,
          required: false,
        },
        {
          key: "math_thpt",
          label: "Toán (thi THPT)",
          type: "number",
          required: true,
          min: 0,
          max: 10,
          note: "Điểm thi tốt nghiệp THPT 2026 môn Toán.",
        },
        // M2 — TBC học bạ tổ hợp 3 môn
        {
          key: "sec_m2",
          label: "M2 — TBC học bạ 3 môn tổ hợp cao nhất",
          type: "section" as const,
          required: false,
          note: "Nhập TBC cả năm cho từng lớp của từng môn trong tổ hợp xét tuyển tốt nhất. Toán có mặt trong tất cả tổ hợp.",
        },
        // Toán học bạ (có trong TẤT CẢ tổ hợp)
        {
          key: "toan_hb10",
          label: "Toán học bạ — Lớp 10",
          type: "number",
          required: true,
          min: 0,
          max: 10,
          step: 0.1,
        },
        {
          key: "toan_hb11",
          label: "Toán học bạ — Lớp 11",
          type: "number",
          required: true,
          min: 0,
          max: 10,
          step: 0.1,
        },
        {
          key: "toan_hb12",
          label: "Toán học bạ — Lớp 12",
          type: "number",
          required: true,
          min: 0,
          max: 10,
          step: 0.1,
        },
        // Môn 2 học bạ (theo tổ hợp)
        {
          key: "mon2_hb10",
          label: "Môn 2 học bạ — Lớp 10",
          type: "number",
          required: true,
          min: 0,
          max: 10,
          step: 0.1,
          note: "A00/A01/X06 → Vật lý | D01 → Ngữ văn | D07 → Hóa học | X26 → Tin học.",
        },
        {
          key: "mon2_hb11",
          label: "Môn 2 học bạ — Lớp 11",
          type: "number",
          required: true,
          min: 0,
          max: 10,
          step: 0.1,
        },
        {
          key: "mon2_hb12",
          label: "Môn 2 học bạ — Lớp 12",
          type: "number",
          required: true,
          min: 0,
          max: 10,
          step: 0.1,
        },
        // Môn 3 học bạ (theo tổ hợp)
        {
          key: "mon3_hb10",
          label: "Môn 3 học bạ — Lớp 10",
          type: "number",
          required: true,
          min: 0,
          max: 10,
          step: 0.1,
          note: "A00 → Hóa học | A01/D01/D07/X26 → Tiếng Anh | X06 → Tin học.",
        },
        {
          key: "mon3_hb11",
          label: "Môn 3 học bạ — Lớp 11",
          type: "number",
          required: true,
          min: 0,
          max: 10,
          step: 0.1,
        },
        {
          key: "mon3_hb12",
          label: "Môn 3 học bạ — Lớp 12",
          type: "number",
          required: true,
          min: 0,
          max: 10,
          step: 0.1,
        },
        // M3 — Chứng chỉ TA
        {
          key: "sec_m3",
          label: "M3 — Chứng chỉ Tiếng Anh quốc tế",
          type: "section" as const,
          required: false,
          note: "Nhập chứng chỉ nếu có. Hệ thống lấy điểm quy đổi cao hơn giữa IELTS và TOEFL.",
        },
        {
          key: "ielts_cert",
          label: "IELTS Academic",
          type: "certificate",
          required: false,
          min: 0,
          max: 9,
          step: 0.5,
          certificateLevels: IELTS_LEVELS,
          note: "Tối thiểu 5.5 để đủ điều kiện Nhóm 2. Quy đổi tự động theo Bảng 2.3.",
        },
        {
          key: "toefl_cert_legacy",
          label: "TOEFL iBT trước 2026 (thang 0–120)",
          type: "certificate",
          required: false,
          min: 0,
          max: 120,
          certificateLevels: TOEFL_IBT_LEGACY_LEVELS,
          note: "Tối thiểu 55. Phiên bản trước 2026, không dùng Home Edition.",
        },
        {
          key: "toefl_cert_2026",
          label: "TOEFL iBT từ 2026 (thang 3.5–5.5)",
          type: "certificate",
          required: false,
          min: 3.5,
          max: 5.5,
          step: 0.5,
          certificateLevels: TOEFL_IBT_2026_LEVELS,
          note: "Tối thiểu 3.5 theo bảng từ 2026.",
        },
        {
          key: "sat_cert",
          label: "SAT",
          type: "certificate",
          required: false,
          min: 400,
          max: 1600,
          step: 10,
          certificateLevels: SAT_LEVELS,
          note: "Nhóm 2 chấp nhận SAT ≥ 1050; quy đổi theo Bảng 2.3.",
        },
        {
          key: "act_cert",
          label: "ACT",
          type: "certificate",
          required: false,
          min: 1,
          max: 36,
          step: 1,
          certificateLevels: ACT_LEVELS,
          note: "Nhóm 2 chấp nhận ACT ≥ 22; quy đổi theo Bảng 2.3.",
        },
        {
          key: "priority",
          label: "Điểm ưu tiên",
          type: "number",
          required: false,
          min: 0,
          max: 3.5,
          step: 0.25,
        },
      ],
      formula: {
        type: "weighted_combination",
        terms: [
          // M1 = Điểm thi THPT Toán
          { inputKey: "math_thpt", weight: 1 },
          // M2 = TBC tổ hợp học bạ = (TBC_mon1 + TBC_mon2 + TBC_mon3) / 3
          //    = sum(9 annual grades) / 9  → weight = 1/9 mỗi điểm
          { inputKey: "toan_hb10", weight: 1 / 9 },
          { inputKey: "toan_hb11", weight: 1 / 9 },
          { inputKey: "toan_hb12", weight: 1 / 9 },
          { inputKey: "mon2_hb10", weight: 1 / 9 },
          { inputKey: "mon2_hb11", weight: 1 / 9 },
          { inputKey: "mon2_hb12", weight: 1 / 9 },
          { inputKey: "mon3_hb10", weight: 1 / 9 },
          { inputKey: "mon3_hb11", weight: 1 / 9 },
          { inputKey: "mon3_hb12", weight: 1 / 9 },
          // M3 = max(ielts_cert, toefl_cert_legacy, toefl_cert_2026, sat_cert, act_cert)
          {
            inputKey: "ielts_cert",
            weight: 1,
            maxOfInputKeys: [
              "ielts_cert",
              "toefl_cert_legacy",
              "toefl_cert_2026",
              "sat_cert",
              "act_cert",
            ],
          },
        ],
        targetScale: 30,
      },
      benchmark30: null,
      note: "Hệ thống tính M2 = TBC tổ hợp: nhập TBC từng năm cho mỗi môn, công thức tự tính trung bình. M3 lấy điểm quy đổi cao nhất giữa IELTS, TOEFL iBT (2 thang), SAT và ACT.",
    },

    // -----------------------------------------------------------------------
    // PT2 Nhóm 3 — Xét tuyển kết hợp (Kết quả học tập tốt)
    // ĐXT = Điểm thi THPT Toán (M1) + TBC học bạ tổ hợp (M2) + max môn phụ THPT (M3)
    // M2: user nhập từng năm cho từng môn → weight = 1/9 mỗi điểm
    // -----------------------------------------------------------------------
    {
      methodCode: "PT2_N3_HOC_BA",
      methodName: "PT2 Nhóm 3 — Xét kết hợp (kết quả học tập)",
      description:
        "ĐXT = Điểm thi THPT môn Toán (M1) + TBC học bạ 3 năm tổ hợp cao nhất — nhập từng môn từng năm (M2) + Điểm thi THPT cao nhất trong nhóm môn phụ (M3 = max Lý/Hóa/Văn/TA/Tin). Thang 30.",
      requirements: [
        "Học lực 3 năm THPT loại Tốt (tốt nghiệp trước 2025: loại Giỏi).",
        "Không yêu cầu thêm thành tích đặc biệt.",
      ],
      sources: [
        {
          url: "https://xettuyen.hvtc.edu.vn",
          label: "Đề án tuyển sinh AOF 2026 — Phương thức 2, Nhóm 3",
          excerpt:
            "Điểm môn 3: Điểm thi THPT 2026 cao nhất trong các môn: Vật lý, Hóa học, Ngữ văn, Tiếng Anh, Tin học.",
        },
      ],
      uiTemplate: "flat",
      priorityInputKey: "priority",
      inputs: [
        // M1
        {
          key: "sec_m1",
          label: "M1 — Điểm thi THPT môn Toán",
          type: "section" as const,
          required: false,
        },
        {
          key: "math_thpt",
          label: "Toán (thi THPT)",
          type: "number",
          required: true,
          min: 0,
          max: 10,
          note: "Điểm thi tốt nghiệp THPT 2026 môn Toán.",
        },
        // M2 — TBC học bạ tổ hợp 3 môn
        {
          key: "sec_m2",
          label: "M2 — TBC học bạ 3 môn tổ hợp cao nhất",
          type: "section" as const,
          required: false,
          note: "Nhập TBC cả năm cho từng lớp của từng môn trong tổ hợp xét tuyển tốt nhất.",
        },
        // Toán học bạ (có trong TẤT CẢ tổ hợp)
        {
          key: "toan_hb10",
          label: "Toán học bạ — Lớp 10",
          type: "number",
          required: true,
          min: 0,
          max: 10,
          step: 0.1,
        },
        {
          key: "toan_hb11",
          label: "Toán học bạ — Lớp 11",
          type: "number",
          required: true,
          min: 0,
          max: 10,
          step: 0.1,
        },
        {
          key: "toan_hb12",
          label: "Toán học bạ — Lớp 12",
          type: "number",
          required: true,
          min: 0,
          max: 10,
          step: 0.1,
        },
        // Môn 2 học bạ (theo tổ hợp)
        {
          key: "mon2_hb10",
          label: "Môn 2 học bạ — Lớp 10",
          type: "number",
          required: true,
          min: 0,
          max: 10,
          step: 0.1,
          note: "A00/A01/X06 → Vật lý | D01 → Ngữ văn | D07 → Hóa học | X26 → Tin học.",
        },
        {
          key: "mon2_hb11",
          label: "Môn 2 học bạ — Lớp 11",
          type: "number",
          required: true,
          min: 0,
          max: 10,
          step: 0.1,
        },
        {
          key: "mon2_hb12",
          label: "Môn 2 học bạ — Lớp 12",
          type: "number",
          required: true,
          min: 0,
          max: 10,
          step: 0.1,
        },
        // Môn 3 học bạ (theo tổ hợp)
        {
          key: "mon3_hb10",
          label: "Môn 3 học bạ — Lớp 10",
          type: "number",
          required: true,
          min: 0,
          max: 10,
          step: 0.1,
          note: "A00 → Hóa học | A01/D01/D07/X26 → Tiếng Anh | X06 → Tin học.",
        },
        {
          key: "mon3_hb11",
          label: "Môn 3 học bạ — Lớp 11",
          type: "number",
          required: true,
          min: 0,
          max: 10,
          step: 0.1,
        },
        {
          key: "mon3_hb12",
          label: "Môn 3 học bạ — Lớp 12",
          type: "number",
          required: true,
          min: 0,
          max: 10,
          step: 0.1,
        },
        // M3 — Điểm thi THPT môn phụ
        {
          key: "sec_m3",
          label: "M3 — Điểm thi THPT môn phụ cao nhất",
          type: "section" as const,
          required: false,
          note: "Nhập các môn đã thi. Hệ thống tự lấy điểm cao nhất trong: Vật lý, Hóa học, Ngữ văn, Tiếng Anh, Tin học.",
        },
        {
          key: "physics",
          label: "Vật lý (thi THPT)",
          type: "number",
          required: false,
          min: 0,
          max: 10,
        },
        {
          key: "chemistry",
          label: "Hóa học (thi THPT)",
          type: "number",
          required: false,
          min: 0,
          max: 10,
        },
        {
          key: "literature",
          label: "Ngữ văn (thi THPT)",
          type: "number",
          required: false,
          min: 0,
          max: 10,
        },
        {
          key: "english",
          label: "Tiếng Anh (thi THPT)",
          type: "number",
          required: false,
          min: 0,
          max: 10,
        },
        {
          key: "informatics",
          label: "Tin học (thi THPT)",
          type: "number",
          required: false,
          min: 0,
          max: 10,
        },
        {
          key: "priority",
          label: "Điểm ưu tiên",
          type: "number",
          required: false,
          min: 0,
          max: 3.5,
          step: 0.25,
        },
      ],
      formula: {
        type: "weighted_combination",
        terms: [
          // M1 = Điểm thi THPT Toán
          { inputKey: "math_thpt", weight: 1 },
          // M2 = TBC tổ hợp học bạ = sum(9 annual grades) / 9
          { inputKey: "toan_hb10", weight: 1 / 9 },
          { inputKey: "toan_hb11", weight: 1 / 9 },
          { inputKey: "toan_hb12", weight: 1 / 9 },
          { inputKey: "mon2_hb10", weight: 1 / 9 },
          { inputKey: "mon2_hb11", weight: 1 / 9 },
          { inputKey: "mon2_hb12", weight: 1 / 9 },
          { inputKey: "mon3_hb10", weight: 1 / 9 },
          { inputKey: "mon3_hb11", weight: 1 / 9 },
          { inputKey: "mon3_hb12", weight: 1 / 9 },
          // M3 = max(Lý, Hóa, Văn, Anh, Tin) thi THPT
          {
            inputKey: "physics",
            weight: 1,
            maxOfInputKeys: [
              "physics",
              "chemistry",
              "literature",
              "english",
              "informatics",
            ],
          },
        ],
        targetScale: 30,
      },
      benchmark30: null,
      note: "Hệ thống tính M2 = TBC tổ hợp: nhập TBC từng năm cho mỗi môn, công thức tự tính trung bình. M3 lấy điểm thi THPT cao nhất trong các môn phụ.",
    },
  ],
};

export function getAofStaticConfig(): GenericAdmissionConfig {
  return AOF_ADMISSION_CONFIG;
}
