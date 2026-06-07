export type UetAdmissionInfo2026 = {
  schoolCode: string;
  year: number;
  totalQuota: number;
  admissionScope: string;
  applicationTimeline: string;
  eligibility: string;
  notes?: string;
  sourceUrl: string;
};

export const UET_ADMISSION_INFO_2026: UetAdmissionInfo2026 = {
  schoolCode: "QHI",
  year: 2025,
  totalQuota: 2950,
  admissionScope: "Tuyển sinh trên phạm vi cả nước và quốc tế.",
  applicationTimeline:
    "Theo lịch trình chung của Bộ Giáo dục và Đào tạo và Kế hoạch tuyển sinh của Đại học Quốc gia Hà Nội.",
  eligibility:
    "Thí sinh đã tốt nghiệp chương trình THPT của Việt Nam hoặc tương đương; đạt các điều kiện về sức khỏe và ngưỡng đảm bảo chất lượng đầu vào của Trường.",
  notes:
    "Các phương thức xét tuyển bao gồm xét điểm thi tốt nghiệp THPT, thi ĐGNL ĐHQGHN, xét tuyển thẳng và xét chứng chỉ quốc tế kết hợp.",
  sourceUrl: "https://tuyensinh.uet.vnu.edu.vn",
};
