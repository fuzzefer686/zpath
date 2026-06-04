import neuModule from "./src/lib/admission-engine/modules/neu/index";

// Giả lập một thí sinh: có IELTS 7.5 và tham gia xét tuyển bằng điểm thi THPT
const sampleInput = {
    method: "THPT" as const,
    year: 2026,
    payload: {
        combination: "D01" as const, // Tổ hợp Toán, Văn, Anh
        scores: {
            toán: 8.5,
            văn: 8.0,
            anh: 6.5, // Điểm thi tốt nghiệp môn Anh
            lý: 0,
            hóa: 0,
            sinh: 0,
            lichSu: 0,
            diaLy: 0,
            gdcd: 0
        },
        profile: {
            khuVuc: "KV2", // Điểm ưu tiên khu vực
            doiTuong: "NONE",
            certificate: { type: "IELTS" as const, score: 7.5 }, // IELTS 7.5 được NEU quy đổi thành 10
            uuTienXetTuyen: "GiaiNhi" as const // Giải Nhì học sinh giỏi Quốc gia (được cộng điểm thưởng ở PTXT5)
        }
    }
};

try {
    console.log("⏳ Đang chạy bộ lõi tính điểm tuyển sinh NEU 2026...");
    const result = neuModule.calculate(sampleInput);

    console.log("\n=============================================");
    console.log(`🏫 TRƯỜNG: ${neuModule.schoolName} (${result.schoolCode})`);
    console.log(`📅 NĂM TUYỂN SINH: ${result.year}`);
    console.log("=============================================");
    console.log(`🎯 ĐIỂM XÉT TUYỂN CUỐI CÙNG: ${result.normalizedScore30} / 30.00`);
    console.log(`🛠️ CÔNG THỨC ĐƯỢC TỰ ĐỘNG ÁP DỤNG: ${result.formulaUsed}`);
    console.log("=============================================");
    console.log("📝 LƯU Ý TỪ HỆ THỐNG:");
    result.warnings.forEach(warn => console.log(`⚠️  ${warn}`));
    console.log("=============================================\n");

} catch (error) {
    console.error("❌ Có lỗi xảy ra khi tính toán:", error);
}
