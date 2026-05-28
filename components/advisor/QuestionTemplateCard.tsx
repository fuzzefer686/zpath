import { ArrowUpRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { AdvisorQuestionTemplate } from "@/lib/advisor/types";

type QuestionTemplateCardProps = {
  template: AdvisorQuestionTemplate;
  onClick: () => void;
};

export function QuestionTemplateCard({
  template,
  onClick,
}: QuestionTemplateCardProps) {
  const requiredFields = template.requiredFields.filter((field) => field.required);

  return (
    <Card>
      <button
        type="button"
        onClick={onClick}
        className="group flex min-h-40 w-full items-start justify-between gap-4 p-4 text-left transition-colors hover:bg-muted/50"
      >
        <span className="min-w-0">
          <span className="block text-base font-bold leading-6 text-foreground">
            {template.title}
          </span>
          {template.description && (
            <span className="mt-2 block text-sm leading-6 text-muted-foreground">
              {template.description}
            </span>
          )}
          <span className="mt-3 block text-sm font-semibold leading-6 text-primary">
            {template.examplePrompt}
          </span>
          {requiredFields.length > 0 && (
            <span className="mt-3 flex flex-wrap gap-1.5">
              {requiredFields.map((field) => (
                <span
                  key={field.name}
                  className="rounded-md bg-secondary/30 px-2 py-1 text-xs font-semibold text-secondary-foreground"
                >
                  {field.label}
                </span>
              ))}
            </span>
          )}
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </button>
    </Card>
  );
}
