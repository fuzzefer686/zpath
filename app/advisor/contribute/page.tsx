import Link from "next/link";
import { ArrowLeft, DatabaseZap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AdvisorContributeForm } from "@/components/zpath/AdvisorContributeForm";

export default function AdvisorContributePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border bg-muted/30 py-12 sm:py-16">
        <div className="container-page">
          <Button asChild variant="ghost" size="sm" className="mb-6">
            <Link href="/advisor">
              <ArrowLeft className="h-4 w-4" /> Quay lại advisor
            </Link>
          </Button>

          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary">
              <DatabaseZap className="h-3.5 w-3.5" />
              Đóng góp dữ liệu
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">
              Cập nhật trọng số ngành học
            </h1>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Chọn ngành và gửi bộ trọng số đề xuất cho thuật toán tư vấn.
            </p>
          </div>
        </div>
      </section>

      <section className="py-10 sm:py-14">
        <div className="container-page">
          <div className="max-w-4xl">
            <AdvisorContributeForm />
          </div>
        </div>
      </section>
    </div>
  );
}
