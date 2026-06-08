import { BookOpenCheck, Compass, FileQuestion, Lock, Sparkles } from "lucide-react";

import { AdvisorSearchBox } from "@/components/advisor/AdvisorSearchBox";

type AdvisorHeroProps = {
  question: string;
  allowWebSearch: boolean;
  onQuestionChange: (question: string) => void;
  onAsk: () => void;
  onAllowWebSearchChange: (allowWebSearch: boolean) => void;
  onOpenExamTool: () => void;
};

export function AdvisorHero({
  question,
  allowWebSearch,
  onQuestionChange,
  onAsk,
  onAllowWebSearchChange,
  onOpenExamTool,
}: AdvisorHeroProps) {
  const tools = [
    {
      title: "Công cụ giải đề thi",
      description: "Đọc ảnh đề, kiểm tra lại nội dung và giải từng câu.",
      icon: FileQuestion,
      action: onOpenExamTool,
      active: true,
    },
    {
      title: "TBD",
      description: "Đang chuẩn bị",
      icon: BookOpenCheck,
      action: undefined,
      active: false,
    },
    {
      title: "TBD",
      description: "Đang chuẩn bị",
      icon: Lock,
      action: undefined,
      active: false,
    },
  ];

  return (
    <section className="relative border-b border-white/20 bg-background overflow-hidden py-8 sm:py-12 lg:py-16">
      <div className="absolute inset-0 bg-mesh opacity-80" />
      <div className="absolute inset-0 grid-dots opacity-30" />

      <div className="container-page relative z-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,2fr)] lg:items-stretch">
          <aside className="rounded-3xl border border-white/45 bg-white/58 p-3 backdrop-blur-2xl shadow-sm animate-fade-up">
            <div className="px-2 pb-2 pt-1">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">
                Zpath AI tools
              </div>
            </div>
            <div className="space-y-2">
              {tools.map((tool, index) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={`${tool.title}-${index}`}
                    type="button"
                    onClick={tool.action}
                    disabled={!tool.active}
                    className={`group flex w-full items-start gap-3 rounded-2xl p-4 text-left transition ${
                      tool.active
                        ? "bg-white/86 text-foreground shadow-sm hover:-translate-y-0.5 hover:bg-white"
                        : "cursor-not-allowed bg-white/38 text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                        tool.active
                          ? "bg-primary text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-black">{tool.title}</span>
                      <span className="mt-1 block text-xs font-semibold leading-5 text-muted-foreground">
                        {tool.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="rounded-3xl border border-white/45 bg-white/55 p-5 backdrop-blur-2xl shadow-glow animate-fade-up sm:p-8" style={{ animationDelay: "90ms" }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-4 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-primary">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Zpath AI cho tuyển sinh và luyện đề
            </div>

            <h1 className="mt-5 font-display text-4xl font-black leading-tight tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Hỏi <span className="text-gradient-hero">Zpath AI</span>
            </h1>

            <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-muted-foreground sm:text-base">
              Khám phá ngành học, tra cứu trường đại học, đối sánh điểm chuẩn và đọc ảnh đề thi để giải từng bước.
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

            <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-muted-foreground sm:text-sm">
              <Compass className="h-4 w-4 text-primary" />
              <span>Hỏi tự nhiên bằng tiếng Việt về bất kỳ trường học hoặc ngành nghề nào bạn muốn.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
