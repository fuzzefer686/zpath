import { AdvisorIntent } from "@/lib/advisor/intents";
import type {
  AdvisorQuestionTemplate,
  AdvisorTemplateField,
} from "@/lib/advisor/types";

const majorNameField: AdvisorTemplateField = {
  name: "majorName",
  label: "Ngành học",
  type: "text",
  placeholder: "Ví dụ: Marketing, Y đa khoa, Luật",
  required: true,
};

const optionalMajorNameField: AdvisorTemplateField = {
  ...majorNameField,
  required: false,
};

const schoolNameField: AdvisorTemplateField = {
  name: "schoolName",
  label: "Trường đại học",
  type: "text",
  placeholder: "Ví dụ: NEU, FTU, Đại học Y Hà Nội",
  required: true,
};

const optionalSchoolNameField: AdvisorTemplateField = {
  ...schoolNameField,
  required: false,
};

const scoreField: AdvisorTemplateField = {
  name: "score",
  label: "Điểm xét tuyển",
  type: "number",
  placeholder: "Ví dụ: 25",
  required: true,
};

const combinationField: AdvisorTemplateField = {
  name: "combination",
  label: "Tổ hợp xét tuyển",
  type: "select",
  placeholder: "Chọn tổ hợp",
  options: [
    { label: "A00", value: "A00" },
    { label: "A01", value: "A01" },
    { label: "B00", value: "B00" },
    { label: "C00", value: "C00" },
    { label: "D01", value: "D01" },
    { label: "D07", value: "D07" },
    { label: "D14", value: "D14" },
    { label: "D15", value: "D15" },
    { label: "H00", value: "H00" },
    { label: "V00", value: "V00" },
    { label: "Khác", value: "other" },
  ],
  required: true,
};

export const advisorQuestionTemplates = [
  {
    id: "review_major",
    title: "Review một ngành học",
    category: "Review ngành",
    description: "Tìm hiểu ngành học, độ khó, môn học chính và mức độ phù hợp.",
    defaultIntent: AdvisorIntent.REVIEW_MAJOR,
    requiredFields: [majorNameField, optionalSchoolNameField],
    examplePrompt: "Review ngành Marketing tại NEU",
    displayOrder: 1,
    allowWebSearch: true,
  },
  {
    id: "compare_majors",
    title: "So sánh 2 ngành",
    category: "So sánh ngành",
    description: "Đặt hai ngành cạnh nhau để so về chương trình học, cơ hội nghề nghiệp và độ phù hợp.",
    defaultIntent: AdvisorIntent.COMPARE_MAJORS,
    requiredFields: [
      {
        name: "majorA",
        label: "Ngành thứ nhất",
        type: "text",
        placeholder: "Ví dụ: Kinh tế quốc tế",
        required: true,
      },
      {
        name: "majorB",
        label: "Ngành thứ hai",
        type: "text",
        placeholder: "Ví dụ: Logistics",
        required: true,
      },
      optionalSchoolNameField,
    ],
    examplePrompt: "So sánh Kinh tế quốc tế và Logistics",
    displayOrder: 2,
    allowWebSearch: true,
  },
  {
    id: "compare_schools",
    title: "So sánh 2 trường",
    category: "So sánh trường",
    description: "So sánh thế mạnh, tuyển sinh, học phí và môi trường học của hai trường.",
    defaultIntent: AdvisorIntent.COMPARE_SCHOOLS,
    requiredFields: [
      {
        name: "schoolA",
        label: "Trường thứ nhất",
        type: "text",
        placeholder: "Ví dụ: NEU",
        required: true,
      },
      {
        name: "schoolB",
        label: "Trường thứ hai",
        type: "text",
        placeholder: "Ví dụ: FTU",
        required: true,
      },
      optionalMajorNameField,
    ],
    examplePrompt: "So sánh NEU và FTU ngành Kinh tế",
    displayOrder: 3,
    allowWebSearch: true,
  },
  {
    id: "admission_chance",
    title: "Ước tính cơ hội đỗ",
    category: "Cơ hội đỗ",
    description: "Đánh giá theo điểm, tổ hợp, trường hoặc ngành quan tâm, không cam kết kết quả trúng tuyển.",
    defaultIntent: AdvisorIntent.ADMISSION_CHANCE,
    requiredFields: [
      scoreField,
      combinationField,
      optionalSchoolNameField,
      optionalMajorNameField,
    ],
    examplePrompt: "25 điểm A00 có thể chọn trường/ngành nào?",
    displayOrder: 4,
    allowWebSearch: true,
  },
  {
    id: "score_suggestion",
    title: "Gợi ý trường/ngành theo điểm",
    category: "Cơ hội đỗ",
    description: "Tìm các lựa chọn phù hợp với mức điểm, tổ hợp, khu vực và sở thích.",
    defaultIntent: AdvisorIntent.SCORE_SUGGESTION,
    requiredFields: [
      scoreField,
      combinationField,
      {
        name: "region",
        label: "Khu vực",
        type: "select",
        placeholder: "Chọn khu vực",
        options: [
          { label: "Toàn quốc", value: "Toàn quốc" },
          { label: "Miền Bắc", value: "Miền Bắc" },
          { label: "Miền Trung", value: "Miền Trung" },
          { label: "Miền Nam", value: "Miền Nam" },
        ],
        required: false,
      },
      {
        name: "interest",
        label: "Sở thích",
        type: "text",
        placeholder: "Ví dụ: kinh doanh, công nghệ, y dược",
        required: false,
      },
    ],
    examplePrompt: "25 điểm A00 nên chọn ngành nào ở miền Bắc?",
    displayOrder: 5,
    allowWebSearch: true,
  },
  {
    id: "personal_fit",
    title: "Tìm ngành phù hợp",
    category: "Tìm ngành phù hợp",
    description: "Gợi ý ngành theo sở thích, điểm mạnh, điều không thích và ưu tiên cá nhân.",
    defaultIntent: AdvisorIntent.PERSONAL_FIT,
    requiredFields: [
      {
        name: "interests",
        label: "Sở thích",
        type: "textarea",
        placeholder: "Ví dụ: giao tiếp, tiếng Anh, tổ chức sự kiện",
        required: true,
      },
      {
        name: "strengths",
        label: "Điểm mạnh",
        type: "textarea",
        placeholder: "Ví dụ: học tiếng Anh khá, thuyết trình tốt",
        required: true,
      },
      {
        name: "dislikes",
        label: "Điều không thích",
        type: "textarea",
        placeholder: "Ví dụ: không thích làm việc quá nhiều với máy móc",
        required: false,
      },
      {
        name: "priority",
        label: "Ưu tiên",
        type: "select",
        placeholder: "Chọn ưu tiên",
        options: [
          { label: "Dễ xin việc", value: "Dễ xin việc" },
          { label: "Thu nhập tốt", value: "Thu nhập tốt" },
          { label: "Phù hợp sở thích", value: "Phù hợp sở thích" },
          { label: "Ít áp lực", value: "Ít áp lực" },
          { label: "Có thể đi nước ngoài", value: "Có thể đi nước ngoài" },
          { label: "Có thể học lên cao", value: "Có thể học lên cao" },
        ],
        required: true,
      },
    ],
    examplePrompt: "Em thích giao tiếp, học tiếng Anh khá, nên chọn ngành nào?",
    displayOrder: 6,
  },
  {
    id: "tuition",
    title: "Hỏi học phí",
    category: "Học phí & chương trình học",
    description: "Tra cứu và giải thích học phí theo ngành, trường hoặc nhóm trường.",
    defaultIntent: AdvisorIntent.TUITION,
    requiredFields: [optionalSchoolNameField, optionalMajorNameField],
    examplePrompt: "Học phí ngành Y đa khoa hiện nay khoảng bao nhiêu?",
    displayOrder: 7,
    allowWebSearch: true,
  },
  {
    id: "career_path",
    title: "Nghề nghiệp sau tốt nghiệp",
    category: "Nghề nghiệp sau tốt nghiệp",
    description: "Tìm hiểu các hướng việc làm, kỹ năng cần chuẩn bị và triển vọng của một ngành.",
    defaultIntent: AdvisorIntent.CAREER_PATH,
    requiredFields: [majorNameField],
    examplePrompt: "Học ngành Luật ra làm nghề gì?",
    displayOrder: 8,
    allowWebSearch: true,
  },
  {
    id: "latest_admission_info",
    title: "Thông tin tuyển sinh mới nhất",
    category: "Thông tin tuyển sinh mới nhất",
    description: "Tìm đề án, phương thức xét tuyển, mốc thời gian và lưu ý tuyển sinh theo trường.",
    defaultIntent: AdvisorIntent.LATEST_ADMISSION_INFO,
    requiredFields: [
      schoolNameField,
      {
        name: "year",
        label: "Năm tuyển sinh",
        type: "number",
        placeholder: "Ví dụ: 2026",
        required: false,
      },
    ],
    examplePrompt: "Thông tin tuyển sinh mới nhất của Đại học Bách khoa Hà Nội",
    displayOrder: 9,
    allowWebSearch: true,
  },
] satisfies AdvisorQuestionTemplate[];

export const advisorTemplateCategories = Array.from(
  new Map(
    [...advisorQuestionTemplates]
      .sort((left, right) => left.displayOrder - right.displayOrder)
      .map((template) => [template.category, template.category]),
  ).values(),
);

export function getAdvisorTemplatesByCategory(category: string) {
  return advisorQuestionTemplates
    .filter((template) => template.category === category)
    .sort((left, right) => left.displayOrder - right.displayOrder);
}

export function getAdvisorTemplateById(templateId: string) {
  return advisorQuestionTemplates.find((template) => template.id === templateId) ?? null;
}
