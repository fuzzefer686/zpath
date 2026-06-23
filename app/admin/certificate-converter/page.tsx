import type { Metadata } from "next";

import { AdminCertificateConverterGeneratorClient } from "@/components/admin/AdminCertificateConverterGeneratorClient";

export const metadata: Metadata = {
  title: "Auto-generate quy đổi chứng chỉ - ZPATH Admin",
  description:
    "Generate draft config quy đổi chứng chỉ theo phương thức xét tuyển bằng AI và review trước khi dùng.",
};

export default function AdminCertificateConverterPage() {
  return <AdminCertificateConverterGeneratorClient />;
}
