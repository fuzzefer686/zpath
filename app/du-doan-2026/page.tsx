import type { Metadata } from "next";

import { ScorePrediction2026ArticleV2 } from "@/components/news/ScorePrediction2026ArticleV2";

const seoTitle = "Dự đoán điểm chuẩn 2026 — Bách khoa HN, Ngoại thương, Kinh tế Quốc dân";
const seoDescription =
  "Bản cập nhật 04/07: dự đoán điểm chuẩn 2026 cho 60 chương trình HUST (bổ sung dữ liệu 2023, kiểm chứng nghi vấn Tuyên Quang) cùng FTU, NEU. Lưu ý: điểm dự đoán, không phải điểm chính thức.";

export const metadata: Metadata = {
  title: seoTitle,
  description: seoDescription,
  alternates: {
    canonical: "/du-doan-2026",
  },
  openGraph: {
    title: seoTitle,
    description: seoDescription,
    type: "article",
  },
};

export default function ScorePrediction2026Page() {
  return <ScorePrediction2026ArticleV2 />;
}
