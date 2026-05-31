import { Compass, Sparkles } from "lucide-react";

import { AdvisorSearchBox } from "@/components/advisor/AdvisorSearchBox";

type AdvisorHeroProps = {
  question: string;
  allowWebSearch: boolean;
  onQuestionChange: (question: string) => void;
  onAsk: () => void;
  onAllowWebSearchChange: (allowWebSearch: boolean) => void;
};

export function AdvisorHero({
  question,
  allowWebSearch,
  onQuestionChange,
  onAsk,
  onAllowWebSearchChange,
}: AdvisorHeroProps) {
  return (
    <section className="relative border-b border-white/20 bg-background overflow-hidden py-12 sm:py-20 lg:py-24">
      {/* Premium background mesh & grids */}
      <div className="absolute inset-0 bg-mesh opacity-80" />
      <div className="absolute inset-0 grid-dots opacity-30" />

      {/* Decorative Floating Glowing Blobs */}
      <div className="absolute top-1/4 left-10 h-72 w-72 rounded-full bg-zpath-primary/15 blur-3xl animate-float-slow pointer-events-none" />
      <div className="absolute bottom-1/4 right-10 h-80 w-80 rounded-full bg-zpath-secondary/20 blur-3xl animate-float pointer-events-none" />
      <div className="absolute top-12 right-1/4 h-56 w-56 rounded-full bg-zpath-accent/15 blur-3xl animate-float-slow pointer-events-none" />

      <div className="container-page relative z-10">
        <div className="mx-auto max-w-4xl text-center">
          {/* Sparkles pill badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/60 px-4.5 py-2.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-primary shadow-glow backdrop-blur-xl animate-fade-up">
            <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
            AI Advisor cho tuyển sinh Việt Nam
          </div>

          {/* Glowing gradient heading */}
          <h1 className="mt-6 font-display text-5xl font-black leading-tight sm:text-7xl lg:text-8xl tracking-tight animate-fade-up" style={{ animationDelay: "90ms" }}>
            Hỏi <span className="text-gradient-hero">ZPath</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-sm sm:text-lg leading-relaxed text-muted-foreground font-medium animate-fade-up" style={{ animationDelay: "180ms" }}>
            Khám phá ngành học, tra cứu trường đại học, đối sánh điểm chuẩn, học phí, cơ hội đỗ và giải đáp mọi thắc mắc về nghề nghiệp tương lai.
          </p>

          <div className="mt-10 animate-fade-up" style={{ animationDelay: "270ms" }}>
            <AdvisorSearchBox
              value={question}
              allowWebSearch={allowWebSearch}
              onChange={onQuestionChange}
              onAsk={onAsk}
              onAllowWebSearchChange={onAllowWebSearchChange}
            />
          </div>

          <div className="mx-auto mt-6 flex max-w-2xl items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground font-semibold animate-fade-up" style={{ animationDelay: "360ms" }}>
            <Compass className="h-4 w-4 text-primary animate-spin" style={{ animationDuration: "12s" }} />
            <span>Hỏi tự nhiên bằng tiếng Việt về bất kỳ trường học hoặc ngành nghề nào bạn muốn.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
