import { QuestionTemplateCard } from "@/components/advisor/QuestionTemplateCard";
import type { AdvisorQuestionTemplate } from "@/lib/advisor/types";

type QuestionTemplateGridProps = {
  templates: AdvisorQuestionTemplate[];
  compact?: boolean;
  onPickTemplate: (template: AdvisorQuestionTemplate) => void;
};

export function QuestionTemplateGrid({
  templates,
  compact = false,
  onPickTemplate,
}: QuestionTemplateGridProps) {
  return (
    <div>
      <div className={compact ? "grid gap-3" : "grid gap-3 sm:grid-cols-2"}>
        {templates.map((template) => (
          <QuestionTemplateCard
            key={template.id}
            template={template}
            onClick={() => onPickTemplate(template)}
          />
        ))}
      </div>
    </div>
  );
}
