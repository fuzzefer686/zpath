import { AdvisorIntent } from "@/lib/advisor/intents";
import type {
  AdvisorAnswer,
  AdvisorQuestionTemplate,
  AdvisorTemplateValues,
} from "@/lib/advisor/types";

function read(values: AdvisorTemplateValues, name: string) {
  return values[name]?.trim() ?? "";
}

function joinParts(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function generateVietnameseQuestion(
  template: AdvisorQuestionTemplate,
  values: AdvisorTemplateValues,
) {
  const majorName = read(values, "majorName");
  const schoolName = read(values, "schoolName");
  const majorA = read(values, "majorA");
  const majorB = read(values, "majorB");
  const schoolA = read(values, "schoolA");
  const schoolB = read(values, "schoolB");
  const score = read(values, "score");
  const combination = read(values, "combination");
  const region = read(values, "region");
  const interest = read(values, "interest");
  const interests = read(values, "interests");
  const strengths = read(values, "strengths");
  const dislikes = read(values, "dislikes");
  const priority = read(values, "priority");
  const year = read(values, "year");
  const combinationText = combination === "other" ? "tổ hợp khác" : combination;

  switch (template.id) {
    case "review_major":
      return joinParts([
        `Review ngành ${majorName}`,
        schoolName ? `tại ${schoolName}` : null,
      ]);
    case "compare_majors":
      return joinParts([
        `So sánh ${majorA} và ${majorB}`,
        schoolName ? `ở ${schoolName}` : null,
      ]);
    case "compare_schools":
      return joinParts([
        `So sánh ${schoolA} và ${schoolB}`,
        majorName ? `nếu em muốn học ngành ${majorName}` : null,
      ]);
    case "admission_chance":
      return joinParts([
        `${score} điểm ${combinationText}`,
        schoolName ? `vào ${schoolName}` : null,
        majorName ? `ngành ${majorName}` : null,
        "thì cơ hội đỗ thế nào?",
      ]);
    case "score_suggestion":
      return joinParts([
        `${score} điểm ${combinationText} nên chọn trường/ngành nào`,
        region ? `ở ${region}` : null,
        interest ? `nếu em thích ${interest}` : null,
        "?",
      ]);
    case "personal_fit":
      return joinParts([
        `Em thích ${interests}, điểm mạnh là ${strengths}, ưu tiên ${priority.toLowerCase()}`,
        dislikes ? `và không thích ${dislikes}` : null,
        "thì nên chọn ngành nào?",
      ]);
    case "tuition":
      return joinParts([
        "Học phí",
        majorName ? `ngành ${majorName}` : null,
        schoolName ? `tại ${schoolName}` : null,
        "hiện nay khoảng bao nhiêu?",
      ]);
    case "career_path":
      return `Học ngành ${majorName} ra làm nghề gì?`;
    case "latest_admission_info":
      return joinParts([
        "Thông tin tuyển sinh mới nhất",
        year ? `năm ${year}` : null,
        `của ${schoolName}`,
      ]);
    default:
      return template.examplePrompt;
  }
}

export function createMockAdvisorAnswer({
  template,
  question,
  values,
}: {
  template: AdvisorQuestionTemplate | null;
  question: string;
  values?: AdvisorTemplateValues;
}): AdvisorAnswer {
  const safeValues = values ?? {};
  const majorName = read(safeValues, "majorName") || "ngành đang quan tâm";
  const schoolName = read(safeValues, "schoolName");
  const majorA = read(safeValues, "majorA") || "ngành thứ nhất";
  const majorB = read(safeValues, "majorB") || "ngành thứ hai";
  const score = read(safeValues, "score") || "mức điểm của em";
  const combination = read(safeValues, "combination") || "tổ hợp xét tuyển";
  const schoolA = read(safeValues, "schoolA") || "trường thứ nhất";
  const sourceDate = new Date().toLocaleDateString("vi-VN");

  if (template?.id === "review_major") {
    return {
      title: `Review ${majorName}${schoolName ? ` tại ${schoolName}` : ""}`,
      summary: "Đây là bản trả lời mẫu để minh họa cách ZPath sẽ trình bày nhận định về một ngành học.",
      answerType: AdvisorIntent.REVIEW_MAJOR,
      confidence: "medium",
      dataStatus: "general_advice",
      sections: [
        {
          heading: "Ngành này học gì?",
          content: `${majorName} thường xoay quanh kiến thức nền của lĩnh vực, kỹ năng phân tích vấn đề và các học phần ứng dụng. Nếu gắn với một trường cụ thể, ZPath sẽ tách riêng chương trình đào tạo, điểm chuẩn và học phí khi có dữ liệu.`,
        },
        {
          heading: "Ai có thể phù hợp?",
          content: "Ngành này nên được đánh giá theo sở thích, môn học mạnh, khả năng tự học và kiểu môi trường làm việc em mong muốn. Đây mới là nhận định mẫu, chưa dựa trên dữ liệu cá nhân đầy đủ.",
        },
      ],
      warnings: [
        "Không nên chọn ngành chỉ vì tên ngành đang phổ biến hoặc điểm chuẩn cao.",
      ],
      sources: [],
      followUpQuestions: [
        `Ngành ${majorName} cần học giỏi môn gì?`,
        `So sánh ${majorName} với một ngành gần nó`,
        schoolName ? `Điểm chuẩn ${majorName} tại ${schoolName} gần đây thế nào?` : `Trường nào mạnh về ${majorName}?`,
      ],
    };
  }

  if (template?.id === "compare_majors") {
    return {
      title: `So sánh ${majorA} và ${majorB}`,
      summary: "Bản mẫu này cho thấy câu trả lời so sánh sẽ tách rõ chương trình học, độ phù hợp và hướng nghề nghiệp.",
      answerType: AdvisorIntent.COMPARE_MAJORS,
      confidence: "medium",
      dataStatus: "general_advice",
      sections: [
        {
          heading: "Khác nhau về nội dung học",
          content: `${majorA} và ${majorB} có thể cùng nhóm lĩnh vực nhưng khác nhau ở trọng tâm đào tạo, kỹ năng cốt lõi và kiểu bài tập/thực hành. Khi có dữ liệu thật, ZPath sẽ đối chiếu theo từng trường và chương trình cụ thể.`,
        },
        {
          heading: "Khác nhau về đầu ra",
          content: `${majorA} thường nên được nhìn theo nhóm vị trí việc làm chính, còn ${majorB} cần so thêm môi trường làm việc, chứng chỉ/kỹ năng bổ trợ và khả năng chuyển ngành.`,
        },
      ],
      warnings: [
        "So sánh ngành cần xét theo trường đào tạo cụ thể, không chỉ theo tên ngành.",
      ],
      sources: [],
      followUpQuestions: [
        `Ngành ${majorA} hợp với kiểu học sinh nào?`,
        `Ngành ${majorB} ra trường làm gì?`,
        `Nếu điểm không quá cao thì nên chọn ${majorA} hay ${majorB}?`,
      ],
    };
  }

  if (template?.id === "admission_chance") {
    return {
      title: `Ước tính cơ hội với ${score} điểm ${combination}`,
      summary: "ZPath sẽ trình bày cơ hội theo vùng an toàn, vừa tầm và thử sức, nhưng không cam kết kết quả trúng tuyển.",
      answerType: AdvisorIntent.ADMISSION_CHANCE,
      confidence: "low",
      dataStatus: "limited_data",
      sections: [
        {
          heading: "Cách hiểu mức điểm",
          content: `${score} điểm ${combination} cần được so với điểm chuẩn các năm gần nhất, phương thức xét tuyển, chỉ tiêu và biến động đề thi. Đây là bản mẫu nên chưa kết luận trường/ngành cụ thể.`,
        },
        {
          heading: "Cách chia lựa chọn",
          content: "Một danh sách tốt nên có nhóm an toàn, nhóm vừa tầm và nhóm thử sức. Với mỗi lựa chọn, cần kiểm tra đúng phương thức xét tuyển và tổ hợp được chấp nhận.",
        },
      ],
      warnings: [
        "ZPath không bảo đảm đỗ/trượt. Điểm chuẩn và điều kiện tuyển sinh có thể thay đổi theo từng năm.",
      ],
      sources: [],
      followUpQuestions: [
        `Với ${score} điểm ${combination}, trường nào an toàn hơn?`,
        "Nên chọn ngành trước hay chọn trường trước?",
        "Cách đọc điểm chuẩn theo từng phương thức xét tuyển?",
      ],
    };
  }

  if (template?.id === "latest_admission_info") {
    return {
      title: `Thông tin tuyển sinh mới nhất của ${read(safeValues, "schoolName") || "một trường đại học"}`,
      summary: "Đây là bản mẫu có cấu trúc nguồn web. Khi tích hợp tìm kiếm, ZPath sẽ thay các nguồn placeholder bằng URL thật.",
      answerType: AdvisorIntent.LATEST_ADMISSION_INFO,
      confidence: "low",
      dataStatus: "web_augmented",
      sections: [
        {
          heading: "Thông tin cần kiểm tra",
          content: "Các mục quan trọng gồm đề án tuyển sinh, phương thức xét tuyển, chỉ tiêu, thời gian đăng ký, học phí, tổ hợp xét tuyển và điều kiện phụ.",
        },
        {
          heading: "Cách dùng thông tin",
          content: "Nên ưu tiên thông báo chính thức từ trường và cơ quan quản lý. Các bài báo chỉ nên dùng để tham khảo nhanh, sau đó đối chiếu lại với nguồn gốc.",
        },
      ],
      warnings: [
        "Nguồn bên dưới là placeholder cho giao diện, chưa phải kết quả tìm kiếm thật.",
      ],
      sources: [
        {
          title: `${read(safeValues, "schoolName") || schoolA} - Trang tuyển sinh chính thức`,
          url: "https://example.edu.vn/tuyen-sinh",
          publisher: read(safeValues, "schoolName") || schoolA,
          accessedAt: sourceDate,
          sourceType: "official_school_site",
        },
        {
          title: "Quy chế tuyển sinh đại học - nguồn quản lý nhà nước",
          url: "https://example.gov.vn/tuyen-sinh-dai-hoc",
          publisher: "Cơ quan quản lý giáo dục",
          accessedAt: sourceDate,
          sourceType: "government_site",
        },
      ],
      followUpQuestions: [
        "Trường này có những phương thức xét tuyển nào?",
        "Điểm chuẩn các năm gần đây thay đổi ra sao?",
        "Học phí và học bổng của trường này thế nào?",
      ],
    };
  }

  return {
    title: "Tư vấn tổng quan từ ZPath",
    summary: `ZPath đã nhận câu hỏi: "${question}". Đây là phản hồi mẫu trước khi kết nối AI và dữ liệu thật.`,
    answerType: template?.defaultIntent ?? AdvisorIntent.GENERAL_ADVICE,
    confidence: "low",
    dataStatus: "general_advice",
    sections: [
      {
        heading: "Cách ZPath sẽ trả lời",
        content: "Câu trả lời sẽ tách dữ liệu có nguồn, thông tin cần kiểm chứng và phần tư vấn định hướng để học sinh dễ ra quyết định.",
      },
      {
        heading: "Bước tiếp theo",
        content: "Khi tích hợp backend, ZPath sẽ ưu tiên dữ liệu nội bộ, sau đó mới bổ sung nguồn web nếu thông tin thiếu hoặc cần cập nhật.",
      },
    ],
    warnings: [
      "Đây là phản hồi mẫu, chưa gọi Gemini, Supabase hoặc web search.",
    ],
    sources: [],
    followUpQuestions: [
      "Em nên cung cấp thêm điểm số hay sở thích không?",
      "Có thể so sánh thêm một trường khác không?",
      "Làm sao kiểm chứng thông tin tuyển sinh?",
    ],
  };
}
