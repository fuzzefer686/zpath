import { MarkdownContent } from "@/components/advisor/MarkdownContent";

type AnswerSectionCardProps = {
  heading: string;
  content: string;
  index?: number;
};

export function AnswerSectionCard({
  heading,
  content,
  index = 0,
}: AnswerSectionCardProps) {
  return (
    <section className="animate-fade-up rounded-md border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-black text-primary-foreground">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xl font-bold leading-tight text-foreground sm:text-2xl">
            {heading}
          </h3>
          <div className="mt-4">
            <MarkdownContent content={content} />
          </div>
        </div>
      </div>
    </section>
  );
}
