import { ArrowRight, Sparkles, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TierBadge } from "@/components/zpath/TierBadge";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-mesh" />
      <div className="absolute inset-0 grid-dots opacity-40" />
      <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 animate-blob bg-primary/30 blur-3xl" />
      <div
        className="pointer-events-none absolute -right-10 top-40 h-80 w-80 animate-blob bg-secondary/40 blur-3xl"
        style={{ animationDelay: "2s" }}
      />

      <div className="container-page relative pt-16 pb-24 sm:pt-24 sm:pb-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border-2 border-foreground/10 bg-card/80 px-4 py-2 text-xs font-bold uppercase tracking-widest backdrop-blur">
            <Zap className="h-3.5 w-3.5 text-accent" />
            Hướng nghiệp thông minh cho Gen-Z
          </div>

          <h1 className="font-display text-4xl font-bold leading-[1.05] sm:text-6xl md:text-7xl">
            Biết ngay <span className="text-gradient-hero">tỉ lệ đỗ</span>
            <br />
            theo vùng của bạn
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            ZPATH kết hợp <strong className="text-foreground">tính cách SBTI</strong>, điểm thi
            khảo sát và thành tích cá nhân để dự đoán cơ hội đỗ đại học theo thang{" "}
            <strong className="text-foreground">LOW · MID · HIGH</strong>.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <TierBadge tier="LOW" />
            <TierBadge tier="MID" />
            <TierBadge tier="HIGH" />
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="hero" size="xl" className="w-full sm:w-auto">
              <a href="#try">
                Dùng thử miễn phí <ArrowRight className="h-5 w-5" />
              </a>
            </Button>
            <Button asChild variant="outline" size="xl" className="w-full sm:w-auto">
              <a href="#how">Xem cách hoạt động</a>
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Không cần đăng ký
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> Kết quả tức thì
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-tier-high" /> Hơn 10.000 học sinh đã thử
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
