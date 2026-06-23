import type { Metadata } from "next";

import { CertificateConverterSection } from "@/src/components/certificate-converter/CertificateConverterSection";

export const metadata: Metadata = {
  title: "Quy đổi chứng chỉ - ZPATH",
  description:
    "Tra cứu chứng chỉ ngoại ngữ có thể quy đổi ra bao nhiêu điểm và áp dụng cho phương thức xét tuyển nào.",
};

export default function CertificateConverterPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="container-page space-y-6 py-6 md:py-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight">
            Certificate Converter
          </h1>
          <p className="text-sm text-muted-foreground">
            Kiểm tra nhanh chứng chỉ của bạn được quy đổi như thế nào và áp dụng được cho phương thức nào.
          </p>
        </header>
        <CertificateConverterSection />
      </section>
    </div>
  );
}
