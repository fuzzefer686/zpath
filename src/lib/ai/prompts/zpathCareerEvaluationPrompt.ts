import type { NormalizedSurveyProfile } from "../../../types/zpath";

export const ZPATH_PROMPT_VERSION = "zpath-career-eval-v1";

export const ZPATH_CAREER_GROUPS = [
  "Công nghệ / AI",
  "Kinh doanh / Quản lý",
  "Logistics / Chế tạo",
  "Y tế / Sức khỏe",
  "Thiết kế / Truyền thông",
  "Giáo dục",
  "Luật / Xã hội",
] as const;

export function buildZPathCareerEvaluationPrompt(
  normalizedProfile: NormalizedSurveyProfile,
): string {
  return `Bạn là trợ lý định hướng nghề nghiệp cho học sinh.

Nhiệm vụ:
- Đánh giá tất cả 7 nhóm nghề sau: ${ZPATH_CAREER_GROUPS.map((group) => `"${group}"`).join(", ")}.
- Dùng rubric cố định:
  - interest: 20%
  - ability: 25%
  - personality: 15%
  - context: 15%
  - market: 15%
  - action_readiness: 10%
- Với mỗi nhóm nghề, chấm từng tiêu chí từ 0 đến 10.
- Không tự tính điểm tổng, phần trăm phù hợp, hoặc xếp hạng cuối cùng.
- Không thay đổi trọng số.
- Không đưa ra khẳng định tuyệt đối về tương lai, thu nhập, đỗ đại học, hoặc mức độ thành công.
- Nếu dữ liệu còn thiếu hoặc null, ghi rõ trong student_summary.missing_data.
- warning phải nói rằng kết quả chỉ mang tính tham khảo.
- Chỉ trả về JSON hợp lệ, không markdown, không code fence, không giải thích ngoài JSON.

Schema JSON bắt buộc:
{
  "career_evaluations": [
    {
      "career_group": "một trong 7 nhóm nghề đã cho",
      "scores": {
        "interest": 0,
        "ability": 0,
        "personality": 0,
        "context": 0,
        "market": 0,
        "action_readiness": 0
      },
      "reasons": {
        "interest": "lý do ngắn",
        "ability": "lý do ngắn",
        "personality": "lý do ngắn",
        "context": "lý do ngắn",
        "market": "lý do ngắn",
        "action_readiness": "lý do ngắn"
      },
      "top_reasons": ["2-4 lý do phù hợp nhất"],
      "risks": ["1-3 rủi ro hoặc điểm cần kiểm chứng"],
      "recommendation": "khuyến nghị thực tế, không tuyệt đối"
    }
  ],
  "student_summary": {
    "main_strengths": ["điểm mạnh chính"],
    "main_risks": ["rủi ro chính"],
    "missing_data": ["dữ liệu thiếu hoặc chưa rõ"]
  },
  "next_steps_30_days": ["các bước thử nghiệm trong 30 ngày"],
  "warning": "Kết quả chỉ mang tính tham khảo, không thay thế tư vấn chuyên môn hoặc quyết định cá nhân."
}

Hồ sơ đã chuẩn hóa:
${JSON.stringify(normalizedProfile, null, 2)}`;
}
