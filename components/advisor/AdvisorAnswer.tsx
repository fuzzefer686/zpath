import { AlertTriangle } from "lucide-react";

import { AdvisorFeedback } from "@/components/advisor/AdvisorFeedback";
import { MarkdownContent } from "@/components/advisor/MarkdownContent";
import { AdvisorIntent } from "@/lib/advisor/intents";
import type { AdvisorAnswer as AdvisorAnswerData } from "@/lib/advisor/types";

type AdvisorAnswerProps = {
  answer: AdvisorAnswerData;
  messageId?: string | null;
  onFollowUpSelect?: (question: string) => void;
};

const admissionCautionIntents: AdvisorIntent[] = [
  AdvisorIntent.ADMISSION_CHANCE,
  AdvisorIntent.SCORE_SUGGESTION,
  AdvisorIntent.SCORE_CALCULATION,
  AdvisorIntent.LATEST_ADMISSION_INFO,
];

export function AdvisorAnswer({
  answer,
  messageId,
}: AdvisorAnswerProps) {
  const shouldShowAdmissionCaution = admissionCautionIntents.includes(
    answer.answerType,
  );

  return (
    <div className="w-full animate-fade-up bg-transparent flex flex-col gap-4 text-foreground">
      {/* Title */}
      <h2 className="font-display text-2xl font-bold tracking-tight text-foreground mt-2">
        {answer.title}
      </h2>
      
      {/* Summary */}
      <p className="text-sm md:text-base leading-7 text-muted-foreground mt-1 mb-2">
        {answer.summary}
      </p>

      {/* Sections */}
      <div className="space-y-6 mt-2">
        {answer.sections.map((section) => (
          <section key={section.heading} className="space-y-2">
            <h3 className="font-display text-base md:text-lg font-bold text-foreground mt-4 mb-2">
              {section.heading}
            </h3>
            <MarkdownContent content={section.content} />
          </section>
        ))}
      </div>

      {/* Warnings */}
      {answer.warnings.length > 0 && (
        <div className="space-y-1.5 mt-2">
          {answer.warnings.map((warning) => (
            <div
              key={warning}
              className="flex gap-2 text-amber-600 text-sm leading-6 items-start"
            >
              <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-amber-500" />
              <p>{warning}</p>
            </div>
          ))}
        </div>
      )}

      {/* Admission Caution */}
      {shouldShowAdmissionCaution && (
        <div className="flex gap-2 text-amber-600 text-sm leading-6 items-start mt-2">
          <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-amber-500" />
          <p>
            Thông tin tuyển sinh có thể thay đổi theo từng năm. Khi đăng ký nguyện vọng, hãy kiểm tra lại website chính thức của trường.
          </p>
        </div>
      )}

      {/* Feedback Widget */}
      <div className="mt-4 pt-4 border-t border-border/20">
        <AdvisorFeedback messageId={messageId} />
      </div>
    </div>
  );
}
