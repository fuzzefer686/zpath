import type { Metadata } from "next";

import { ExamAnswerLandingPage } from "@/components/news/ExamAnswerLandingPage";
import { getStaticExamAnswerRoute } from "@/lib/static-news-routes";

const route = getStaticExamAnswerRoute("dap-an-de-thi-ngay-12-thang-6");
const seoTitle = route?.title ?? "Đề thi và đáp án gợi ý ngày 12 tháng 6 2026";
const seoDescription =
  route?.description ??
  "Xem trực tiếp đề thi, đáp án gợi ý ngày 12/6. Công cụ ZPATH hỗ trợ tính điểm xét tuyển ngay sau khi biết điểm.";

export const metadata: Metadata = {
  title: seoTitle,
  description: seoDescription,
  alternates: {
    canonical: "/news/dap-an-de-thi-ngay-12-thang-6",
  },
};

export default function JuneTwelfthNewsLandingPage() {
  return <ExamAnswerLandingPage route={route!} />;
}
