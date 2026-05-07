import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CtaBanner() {
  return (
    <section className="py-16">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-hero p-10 text-primary-foreground sm:p-16">
          <div className="pointer-events-none absolute -right-10 -top-10 h-60 w-60 animate-float-slow rounded-full bg-secondary/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 left-10 h-60 w-60 animate-float rounded-full bg-accent/40 blur-3xl" />
          <div className="relative max-w-2xl">
            <Sparkles className="h-10 w-10" />
            <h2 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-5xl">
              Sẵn sàng biết tỉ lệ đỗ của bạn?
            </h2>
            <p className="mt-4 text-base opacity-90 sm:text-lg">
              Chỉ khoảng 2 phút. Không đăng ký. Không cam kết. Thử ngay phiên bản demo.
            </p>
            <Button asChild variant="lime" size="xl" className="mt-8">
              <a href="#try">
                Bắt đầu dùng thử <ArrowRight className="h-5 w-5" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
