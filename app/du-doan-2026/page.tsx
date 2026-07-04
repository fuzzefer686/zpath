import type { Metadata } from "next";

import { ScorePrediction2026Article } from "@/components/news/ScorePrediction2026Article";

const seoTitle = "Dự đoán điểm chuẩn 2026 — Bách khoa HN, Ngoại thương, Kinh tế Quốc dân";
const seoDescription =
  "Điểm chuẩn dự đoán 2026 cho HUST, FTU, NEU: khoảng dao động và mức tin cậy từng ngành, kèm giải thích phương pháp dễ hiểu. Lưu ý: điểm dự đoán, không phải điểm chính thức.";

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
  return <ScorePrediction2026Article />;
}
