import type { Metadata } from "next";

import { AdminAdmissionClient } from "@/components/admin/AdminAdmissionClient";

export const metadata: Metadata = {
  title: "Quản lý trang tính điểm - ZPATH Admin",
  description:
    "Tải đề án tuyển sinh, trích xuất cấu hình bằng AI, phê duyệt và publish trang tính điểm theo trường.",
};

export default function AdminAdmissionPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="container-page py-6 md:py-8">
        <AdminAdmissionClient />
      </section>
    </div>
  );
}
