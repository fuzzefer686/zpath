import type { NewsArticle } from "@/types/news";

export type ExamDocumentType = "de" | "dap_an";

export type ExamScheduleRow = {
  date: string;
  session: string;
  subject: string;
  duration: string;
  distributionTime: string;
  startTime: string;
};

export type StaticExamAnswerRoute = {
  slug: string;
  href: string;
  dayLabel: string;
  dateLabel: string;
  title: string;
  description: string;
  updatedAt: string;
  scheduleRows: ExamScheduleRow[];
  subjects: Array<{
    name: string;
    time: string;
    status: "ready" | "updating";
    note: string;
  }>;
};

export const EXAM_DAY_11_SCHEDULE_ROWS: ExamScheduleRow[] = [
  {
    date: "11.6.2026",
    session: "Sáng",
    subject: "Ngữ văn",
    duration: "120 phút",
    distributionTime: "07 giờ 30",
    startTime: "07 giờ 35",
  },
  {
    date: "11.6.2026",
    session: "Chiều",
    subject: "Toán",
    duration: "90 phút",
    distributionTime: "14 giờ 20",
    startTime: "14 giờ 30",
  },
];

export const EXAM_DAY_12_SCHEDULE_ROWS: ExamScheduleRow[] = [
  "Ngoại ngữ",
  "Lịch sử",
  "Vật lí",
  "Hóa học",
  "Sinh học",
  "Địa lí",
  "Giáo dục kinh tế và pháp luật (GDKT&PL)",
  "Tin học",
  "Công nghệ",
  "Các đề tương đương",
].map((subject) => ({
    date: "12.6.2026",
    session: "Sáng",
    subject,
    duration: "50 phút",
    distributionTime: "07 giờ 30 hoặc 08 giờ 35",
    startTime: "07 giờ 35 hoặc 08 giờ 40",
  }));

export const EXAM_SCHEDULE_ROWS = [
  ...EXAM_DAY_11_SCHEDULE_ROWS,
  ...EXAM_DAY_12_SCHEDULE_ROWS,
];

function createExamSubjects(rows: ExamScheduleRow[]) {
  return rows
    .filter((row) => !row.subject.includes("thủ tục"))
    .map((row) => ({
      name: row.subject,
      time: row.session,
      status: "updating" as const,
      note: `${row.session}. ${row.duration}. Bắt đầu: ${row.startTime}.`,
    }));
}

export const STATIC_EXAM_ANSWER_ROUTES: StaticExamAnswerRoute[] = [
  {
    slug: "dap-an-de-thi-ngay-11-thang-6",
    href: "/news/dap-an-de-thi-ngay-11-thang-6",
    dayLabel: "Ngày 11/6",
    dateLabel: "11 tháng 6, 2026",
    title: "Đề thi và đáp án gợi ý ngày 11 tháng 6 2026",
    description:
      "Cập nhật nhanh đề thi, đáp án gợi ý và hướng dẫn dùng ZPATH để tính điểm xét tuyển sau buổi thi ngày 11/6.",
    updatedAt: "2026-06-11T00:00:00.000Z",
    scheduleRows: EXAM_DAY_11_SCHEDULE_ROWS,
    subjects: createExamSubjects(EXAM_DAY_11_SCHEDULE_ROWS),
  },
  {
    slug: "dap-an-de-thi-ngay-12-thang-6",
    href: "/news/dap-an-de-thi-ngay-12-thang-6",
    dayLabel: "Ngày 12/6",
    dateLabel: "12 tháng 6, 2026",
    title: "Đề thi và đáp án gợi ý ngày 12 tháng 6 2026",
    description:
      "Tổng hợp đề thi, đáp án gợi ý theo từng môn tự chọn và cách tra cứu cơ hội xét tuyển bằng dữ liệu điểm chuẩn trên ZPATH cho ngày 12/6.",
    updatedAt: "2026-06-12T00:00:00.000Z",
    scheduleRows: EXAM_DAY_12_SCHEDULE_ROWS,
    subjects: createExamSubjects(EXAM_DAY_12_SCHEDULE_ROWS),
  },
];

export const STATIC_NEWS_ARTICLES: NewsArticle[] = [
  {
    id: "static-dap-an-de-thi-ngay-11-thang-6",
    articleNumber: null,
    slug: STATIC_EXAM_ANSWER_ROUTES[0].slug,
    href: STATIC_EXAM_ANSWER_ROUTES[0].href,
    tag: "Tuyển sinh 2026",
    title: STATIC_EXAM_ANSWER_ROUTES[0].title,
    excerpt: STATIC_EXAM_ANSWER_ROUTES[0].description,
    contentMarkdown:
      "Cập nhật đề thi và đáp án gợi ý ngày 11/6/2026, kèm công cụ ZPATH hỗ trợ tính điểm xét tuyển.",
    author: "Ban biên tập ZPATH",
    readTime: "3 phút đọc",
    featured: true,
    imageGradient: "from-primary/40 via-accent/40 to-secondary/60",
    coverImageUrl: null,
    status: "published",
    moderationNote: null,
    ownerId: null,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: STATIC_EXAM_ANSWER_ROUTES[0].updatedAt,
    updatedAt: STATIC_EXAM_ANSWER_ROUTES[0].updatedAt,
  },
  {
    id: "static-dap-an-de-thi-ngay-12-thang-6",
    articleNumber: null,
    slug: STATIC_EXAM_ANSWER_ROUTES[1].slug,
    href: STATIC_EXAM_ANSWER_ROUTES[1].href,
    tag: "Tuyển sinh 2026",
    title: STATIC_EXAM_ANSWER_ROUTES[1].title,
    excerpt: STATIC_EXAM_ANSWER_ROUTES[1].description,
    contentMarkdown:
      "Cập nhật đề thi và đáp án gợi ý ngày 12/6/2026 theo từng môn tự chọn, kèm hướng dẫn tra cứu cơ hội xét tuyển trên ZPATH.",
    author: "Ban biên tập ZPATH",
    readTime: "3 phút đọc",
    featured: true,
    imageGradient: "from-secondary/50 via-primary/40 to-tier-high/50",
    coverImageUrl: null,
    status: "published",
    moderationNote: null,
    ownerId: null,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: STATIC_EXAM_ANSWER_ROUTES[1].updatedAt,
    updatedAt: STATIC_EXAM_ANSWER_ROUTES[1].updatedAt,
  },
];

export function getStaticExamAnswerRoute(slug: string) {
  return STATIC_EXAM_ANSWER_ROUTES.find((route) => route.slug === slug) ?? null;
}
