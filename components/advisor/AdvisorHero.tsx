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
    <section className="border-b border-border bg-[linear-gradient(135deg,hsl(var(--background))_0%,hsl(var(--muted))_52%,hsl(var(--secondary)/0.22)_100%)]">
      <div className="container-page py-10 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-4 py-2 text-xs font-bold uppercase text-primary shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            AI advisor cho tuyển sinh Việt Nam
          </div>

          <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight text-foreground sm:text-6xl lg:text-7xl">
            Hỏi ZPath
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Hỏi về ngành học, trường đại học, điểm chuẩn, học phí, cơ hội đỗ và nghề nghiệp tương lai.
          </p>

          <div className="mt-8">
            <AdvisorSearchBox
              value={question}
              allowWebSearch={allowWebSearch}
              onChange={onQuestionChange}
              onAsk={onAsk}
              onAllowWebSearchChange={onAllowWebSearchChange}
            />
          </div>

          <div className="mx-auto mt-5 flex max-w-2xl items-center justify-center gap-2 text-sm text-muted-foreground">
            <Compass className="h-4 w-4 text-accent" />
            <span>Hỏi tự nhiên bằng tiếng Việt về bất kỳ trường hoặc ngành nào.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
