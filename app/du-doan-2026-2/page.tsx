import type { Metadata } from "next";

import { ScorePrediction2026Article } from "@/components/news/ScorePrediction2026Article";

const seoTitle =
  "Dự đoán điểm chuẩn 2026 (bản 02/07) — Bách khoa HN, Ngoại thương, Kinh tế Quốc dân";
const seoDescription =
  "Bản dự đoán điểm chuẩn 2026 ngày 02/07 cho HUST, FTU, NEU. Đã có bản cập nhật mới hơn tại /du-doan-2026 (mở rộng toàn bộ ngành HUST, bổ sung dữ liệu 2023).";

export const metadata: Metadata = {
  title: seoTitle,
  description: seoDescription,
  alternates: {
    canonical: "/du-doan-2026-2",
  },
  openGraph: {
    title: seoTitle,
    description: seoDescription,
    type: "article",
  },
};

export default function ScorePrediction2026ArchivePage() {
  return <ScorePrediction2026Article />;
}
