import type { Metadata } from "next";

import { NewsEditor } from "@/components/news/NewsEditor";

export const metadata: Metadata = {
  title: "Tạo bài viết - ZPATH",
};

export default function NewNewsArticlePage() {
  return <NewsEditor />;
}
