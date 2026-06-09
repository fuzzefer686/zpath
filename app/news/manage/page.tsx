import type { Metadata } from "next";

import { NewsManager } from "@/components/news/NewsManager";

export const metadata: Metadata = {
  title: "Quản lý bài viết - ZPATH",
};

export default function NewsManagePage() {
  return <NewsManager />;
}
