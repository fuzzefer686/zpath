/**
 * Static data for the "Dự đoán điểm chuẩn 2026" article (/du-doan-2026).
 *
 * Transcribed verbatim from the three source report tables (HUST, FTU, NEU).
 * Numbers are kept as strings so each school's original formatting (Vietnamese
 * comma decimals for HUST/FTU, dot decimals for NEU) survives untouched — these
 * are predictions quoted from reports, not values we compute or re-round.
 *
 * IMPORTANT: these are PREDICTED cut-off scores, not official results. The
 * article must always render the disclaimer alongside them.
 */

/** Common confidence tag used across schools (free text, shown as a badge). */
export type ConfidenceTag =
  | "Rất cao"
  | "Cao"
  | "Khá cao"
  | "Khá"
  | "Trung bình"
  | "Thấp"
  | "Thận trọng";

/** Đại học Bách khoa Hà Nội (HUST). */
export type HustRow = {
  /** Mã ngành / chương trình. */
  code: string;
  /** Điểm dự đoán 2026. */
  predicted: string;
  /** Sai số dự kiến (± điểm). */
  margin: string;
  /** Cận dưới khoảng điểm. */
  low: string;
  /** Cận trên khoảng điểm. */
  high: string;
  /** Mức tin cậy. */
  confidence: ConfidenceTag;
  /** Cách nên dùng. */
  usage: string;
  /** Cơ sở xác định sai số. */
  basis: string;
};

export const HUST_ROWS: HustRow[] = [
  { code: "IT-E10", predicted: "29,44", margin: "0,64", low: "28,80", high: "30,08", confidence: "Trung bình", usage: "Cần dự phòng thêm", basis: "MAE ngành" },
  { code: "IT1", predicted: "29,25", margin: "0,06", low: "29,19", high: "29,31", confidence: "Cao", usage: "Dùng tương đối sát", basis: "MAE ngành" },
  { code: "IT2", predicted: "28,88", margin: "0,23", low: "28,65", high: "29,11", confidence: "Cao", usage: "Dùng tương đối sát", basis: "MAE ngành" },
  { code: "EE2", predicted: "28,50", margin: "0,21", low: "28,29", high: "28,71", confidence: "Cao", usage: "Dùng tương đối sát", basis: "MAE ngành" },
  { code: "MS2", predicted: "28,31", margin: "0,31", low: "28,00", high: "28,62", confidence: "Khá", usage: "Nên cộng/trừ biên an toàn", basis: "MAE ngành" },
  { code: "ET1", predicted: "28,13", margin: "0,32", low: "27,81", high: "28,45", confidence: "Khá", usage: "Nên cộng/trừ biên an toàn", basis: "MAE ngành" },
  { code: "ME1", predicted: "27,94", margin: "0,19", low: "27,75", high: "28,13", confidence: "Cao", usage: "Dùng tương đối sát", basis: "khoảng quota (MAE 0.02 quá nhỏ, không đáng tin ở mẫu 1 cặp)" },
  { code: "MI1", predicted: "27,94", margin: "0,19", low: "27,75", high: "28,13", confidence: "Cao", usage: "Dùng tương đối sát", basis: "khoảng quota" },
  { code: "MI2", predicted: "27,75", margin: "0,16", low: "27,59", high: "27,91", confidence: "Cao", usage: "Dùng tương đối sát", basis: "khoảng quota" },
  { code: "EE1", predicted: "27,56", margin: "0,42", low: "27,14", high: "27,98", confidence: "Trung bình", usage: "Cần dự phòng thêm", basis: "MAE ngành" },
  { code: "TE1", predicted: "27,00", margin: "0,22", low: "26,78", high: "27,22", confidence: "Cao", usage: "Dùng tương đối sát", basis: "MAE ngành" },
  { code: "ME2", predicted: "26,50", margin: "0,99", low: "25,51", high: "27,49", confidence: "Thấp", usage: "Chỉ tham khảo, không tư vấn sát nút", basis: "MAE ngành (đuôi thấp, kém tin cậy nhất)" },
  { code: "TE3", predicted: "26,50", margin: "0,35", low: "26,15", high: "26,85", confidence: "Khá", usage: "Nên cộng/trừ biên an toàn", basis: "MAE ngành" },
  { code: "TE2", predicted: "26,13", margin: "0,25", low: "25,88", high: "26,38", confidence: "Cao", usage: "Dùng tương đối sát", basis: "khoảng quota" },
  { code: "HE1", predicted: "25,50", margin: "0,84", low: "24,66", high: "26,34", confidence: "Thấp", usage: "Chỉ tham khảo, không tư vấn sát nút", basis: "MAE ngành (đuôi thấp, kém tin cậy nhất)" },
];

/** ĐH Ngoại thương — trụ sở Hà Nội (FTU). */
export type FtuRow = {
  /** Mã nhóm/ngành. */
  code: string;
  /** Tên ngành dễ hiểu. */
  name: string;
  /** Tên viết tắt. */
  shortName: string;
  /** Thang điểm (30 hoặc 40). */
  scale: string;
  /** Điểm dự kiến 2026. */
  predicted: string;
  /** Mức thấp dự kiến. */
  low: string;
  /** Mức cao dự kiến. */
  high: string;
  /** Độ rộng khoảng điểm. */
  width: string;
  /** Mức chắc chắn / Ghi chú. */
  note: string;
  /** Đánh giá độ chắc chắn. */
  confidence: ConfidenceTag;
};

export const FTU_ROWS: FtuRow[] = [
  { code: "KDQH", name: "Kinh doanh quốc tế", shortName: "KDQT", scale: "30", predicted: "27,75", low: "27,50", high: "28,00", width: "0,50", note: "Ngành hot, khoảng dự báo hẹp", confidence: "Cao" },
  { code: "KTEH", name: "Kinh tế đối ngoại", shortName: "KTĐN", scale: "30", predicted: "27,50", low: "27,05", high: "27,95", width: "0,90", note: "Nhóm điểm cao, tương đối ổn định", confidence: "Khá cao" },
  { code: "KTKH", name: "Kế toán", shortName: "Kế toán", scale: "30", predicted: "26,75", low: "25,80", high: "27,70", width: "1,90", note: "Khoảng dự báo trung bình", confidence: "Trung bình" },
  { code: "KTQH", name: "Kinh tế quốc tế", shortName: "KTQT", scale: "30", predicted: "26,50", low: "25,20", high: "27,80", width: "2,60", note: "Cần theo dõi biến động cơ chế/chỉ tiêu", confidence: "Thận trọng" },
  { code: "TCHH", name: "Tài chính - Ngân hàng", shortName: "TCNH", scale: "30", predicted: "26,25", low: "24,86", high: "27,64", width: "2,78", note: "Khoảng dự báo rộng do kế thừa sai số 2025", confidence: "Thận trọng" },
  { code: "QTKH", name: "Quản trị kinh doanh", shortName: "QTKD", scale: "30", predicted: "25,75", low: "23,40", high: "28,10", width: "4,70", note: "Khoảng rộng nhất; 2025 từng chịu cú sốc chỉ tiêu", confidence: "Thận trọng" },
  { code: "LAWH", name: "Luật", shortName: "Luật", scale: "30", predicted: "25,50", low: "23,95", high: "27,05", width: "3,10", note: "Khoảng dự báo rộng, nên dùng thận trọng", confidence: "Thận trọng" },
  { code: "NNAH", name: "Ngôn ngữ Anh", shortName: "NN Anh", scale: "40", predicted: "33,25", low: "32,65", high: "33,85", width: "1,20", note: "Thang 40; không so trực tiếp với thang 30", confidence: "Khá cao" },
  { code: "KHMH", name: "Khoa học máy tính", shortName: "KHMT", scale: "40", predicted: "36,50", low: "36,15", high: "36,85", width: "0,70", note: "Thang 40; khoảng dự báo hẹp", confidence: "Cao" },
];

/** ĐH Kinh tế Quốc dân (NEU). */
export type NeuRow = {
  /** Xếp hạng. */
  rank: number;
  /** Mã ngành. */
  code: string;
  /** Tên ngành. */
  name: string;
  /** Điểm dự đoán. */
  predicted: string;
  /** Cận dưới. */
  low: string;
  /** Cận trên. */
  high: string;
  /** Biên sai số ±. */
  margin: string;
  /** Mức tin cậy. */
  confidence: ConfidenceTag;
  /** Tin cậy (%). */
  confidencePct: string;
  /** Ghi chú. */
  note: string;
};

export const NEU_ROWS: NeuRow[] = [
  { rank: 1, code: "7340122", name: "Thương mại điện tử", predicted: "28.75", low: "28.42", high: "29.08", margin: "0.33", confidence: "Cao", confidencePct: "80%", note: "Ngành hot nhất trong danh sách" },
  { rank: 2, code: "7340120", name: "Kinh doanh quốc tế", predicted: "28.25", low: "27.65", high: "28.85", margin: "0.60", confidence: "Khá", confidencePct: "70%", note: "Khoảng dự đoán rộng hơn nhóm top" },
  { rank: 3, code: "7510605", name: "Logistics và Quản lý chuỗi cung ứng", predicted: "28.25", low: "27.89", high: "28.61", margin: "0.36", confidence: "Cao", confidencePct: "80%", note: "Nhóm top, biên sai số vừa" },
  { rank: 4, code: "7340302", name: "Kiểm toán", predicted: "28.00", low: "27.62", high: "28.38", margin: "0.38", confidence: "Cao", confidencePct: "80%", note: "Nhóm top, biên sai số vừa" },
  { rank: 5, code: "7340115", name: "Marketing", predicted: "27.75", low: "27.50", high: "28.00", margin: "0.25", confidence: "Rất cao", confidencePct: "85%", note: "Backtest 2024→2025 sai số thấp" },
  { rank: 6, code: "7320108", name: "Quan hệ công chúng", predicted: "27.75", low: "27.07", high: "28.43", margin: "0.68", confidence: "Trung bình", confidencePct: "60%", note: "Ngành đuôi nhóm nhạy nguyện vọng hơn" },
  { rank: 7, code: "7310106", name: "Kinh tế quốc tế", predicted: "27.75", low: "27.37", high: "28.13", margin: "0.38", confidence: "Cao", confidencePct: "80%", note: "Nhóm điểm cao, biên sai số vừa" },
  { rank: 8, code: "7340201", name: "Tài chính – Ngân hàng", predicted: "27.00", low: "26.88", high: "27.12", margin: "0.12", confidence: "Rất cao", confidencePct: "85%", note: "Backtest 2024→2025 sai số thấp" },
  { rank: 9, code: "7340101", name: "Quản trị kinh doanh", predicted: "26.75", low: "26.50", high: "27.00", margin: "0.25", confidence: "Rất cao", confidencePct: "85%", note: "Backtest 2024→2025 sai số thấp" },
  { rank: 10, code: "7340301", name: "Kế toán", predicted: "26.75", low: "26.50", high: "27.00", margin: "0.25", confidence: "Rất cao", confidencePct: "85%", note: "Khoảng dự đoán hẹp" },
  { rank: 11, code: "7220201", name: "Ngôn ngữ Anh", predicted: "26.25", low: "25.99", high: "26.51", margin: "0.26", confidence: "Cao", confidencePct: "80%", note: "Cần chú ý thay đổi hệ số Anh giai đoạn trước" },
  { rank: 12, code: "7310101", name: "Kinh tế học", predicted: "26.25", low: "25.77", high: "26.73", margin: "0.48", confidence: "Khá", confidencePct: "70%", note: "Ngành nhạy nguyện vọng hơn" },
  { rank: 13, code: "EP10", name: "EP10 BFI", predicted: "26.00", low: "24.77", high: "27.23", margin: "1.23", confidence: "Trung bình", confidencePct: "60%", note: "Khoảng rộng do thay đổi kép/ tái cấu trúc chương trình" },
  { rank: 14, code: "7480101", name: "Khoa học máy tính", predicted: "26.00", low: "25.75", high: "26.25", margin: "0.25", confidence: "Rất cao", confidencePct: "85%", note: "Khoảng dự đoán hẹp" },
  { rank: 15, code: "7380101", name: "Luật", predicted: "25.60", low: "25.06", high: "26.14", margin: "0.54", confidence: "Khá", confidencePct: "70%", note: "Ngành nhạy nguyện vọng hơn" },
  { rank: 16, code: "7480201", name: "Công nghệ thông tin", predicted: "25.60", low: "25.43", high: "25.78", margin: "0.18", confidence: "Rất cao", confidencePct: "85%", note: "Khoảng dự đoán rất hẹp" },
];

/** Article publish/update date, shown in the byline. */
export const SCORE_2026_UPDATED_AT = "2026-07-02";
