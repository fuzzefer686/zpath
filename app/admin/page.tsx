import type { Metadata } from "next";

import { AdminHubClient } from "@/components/admin/AdminHubClient";

export const metadata: Metadata = {
  title: "Quản trị - ZPATH Admin",
  description: "Bảng điều khiển quản trị ZPATH — truy cập các công cụ admin.",
};

export default function AdminPage() {
  return <AdminHubClient />;
}
