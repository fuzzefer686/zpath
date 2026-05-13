import type { SbtiType } from "@/types/zpath";

export type PersonalityDescription = {
  code: SbtiType;
  title: string;
  summary: string;
};

export const PERSONALITY_TEST_URL =
  "https://www.16personalities.com/vi/b%C3%A0i-ki%E1%BB%83m-tra-t%C3%ADnh-c%C3%A1ch";

export const PERSONALITY_DESCRIPTIONS: Record<SbtiType, PersonalityDescription> = {
  INTJ: {
    code: "INTJ",
    title: "Kiến trúc sư",
    summary: "Tư duy chiến lược, độc lập, thích xây hệ thống và giải quyết vấn đề phức tạp.",
  },
  INTP: {
    code: "INTP",
    title: "Nhà tư duy",
    summary: "Tò mò, phân tích sâu, mạnh về logic, ý tưởng mới và khám phá nguyên lý.",
  },
  ENTJ: {
    code: "ENTJ",
    title: "Nhà chỉ huy",
    summary: "Quyết đoán, định hướng mục tiêu, hợp với vai trò lãnh đạo và hoạch định chiến lược.",
  },
  ENTP: {
    code: "ENTP",
    title: "Người tranh luận",
    summary: "Linh hoạt, sáng tạo, thích thử nghiệm ý tưởng và nhìn vấn đề từ nhiều góc độ.",
  },
  INFJ: {
    code: "INFJ",
    title: "Người cố vấn",
    summary: "Sâu sắc, giàu lý tưởng, quan tâm tác động xã hội và phát triển con người.",
  },
  INFP: {
    code: "INFP",
    title: "Người hòa giải",
    summary: "Giàu giá trị cá nhân, sáng tạo, đồng cảm và phù hợp với công việc có ý nghĩa.",
  },
  ENFJ: {
    code: "ENFJ",
    title: "Người dẫn dắt",
    summary: "Truyền cảm hứng, kết nối tốt, mạnh về hỗ trợ đội nhóm và phát triển cộng đồng.",
  },
  ENFP: {
    code: "ENFP",
    title: "Người truyền cảm hứng",
    summary: "Nhiệt tình, giàu ý tưởng, thích môi trường năng động và các công việc sáng tạo.",
  },
  ISTJ: {
    code: "ISTJ",
    title: "Nhà hậu cần",
    summary: "Kỷ luật, đáng tin cậy, chú trọng dữ kiện, quy trình và chất lượng thực thi.",
  },
  ISFJ: {
    code: "ISFJ",
    title: "Người bảo vệ",
    summary: "Chu đáo, bền bỉ, quan tâm chi tiết và thích tạo giá trị ổn định cho người khác.",
  },
  ESTJ: {
    code: "ESTJ",
    title: "Người điều hành",
    summary: "Thực tế, có tổ chức, mạnh về quản lý nguồn lực, quy trình và trách nhiệm.",
  },
  ESFJ: {
    code: "ESFJ",
    title: "Người lãnh sự",
    summary: "Hòa đồng, trách nhiệm, giỏi phối hợp và phù hợp với môi trường nhiều tương tác.",
  },
  ISTP: {
    code: "ISTP",
    title: "Nhà kỹ thuật",
    summary: "Thực hành tốt, bình tĩnh, thích phân tích cách hệ thống vận hành và tối ưu nó.",
  },
  ISFP: {
    code: "ISFP",
    title: "Người nghệ sĩ",
    summary: "Tinh tế, linh hoạt, đề cao trải nghiệm cá nhân và có cảm quan thẩm mỹ tốt.",
  },
  ESTP: {
    code: "ESTP",
    title: "Doanh nhân",
    summary: "Nhanh nhạy, thích hành động, hợp với môi trường cạnh tranh và quyết định thực tế.",
  },
  ESFP: {
    code: "ESFP",
    title: "Người giải trí",
    summary: "Cởi mở, giàu năng lượng, giao tiếp tốt và thích các công việc có tính trải nghiệm.",
  },
};

export function getPersonalityLabel(type: SbtiType) {
  const description = PERSONALITY_DESCRIPTIONS[type];
  return `${description.code} - ${description.title}`;
}
