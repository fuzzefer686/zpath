"use client";

import {
  AlertCircle,
  ClipboardList,
  Database,
  Globe2,
  Loader2,
  RotateCcw,
  Sparkles,
} from "lucide-react";

import { AdvisorAnswer } from "@/components/advisor/AdvisorAnswer";
import { AdvisorAnswerPlaceholder } from "@/components/advisor/AdvisorAnswerPlaceholder";
import { DynamicQuestionForm } from "@/components/advisor/DynamicQuestionForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type {
  AdvisorAnswer as AdvisorAnswerData,
  AdvisorQuestionTemplate,
  AdvisorTemplateValues,
} from "@/lib/advisor/types";

type AdvisorInteractionPanelProps = {
  selectedTemplate: AdvisorQuestionTemplate | null;
  question: string;
  answer: AdvisorAnswerData | null;
  answerMessageId?: string | null;
  allowWebSearch: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  canRetry: boolean;
  onSubmitQuestion: (question: string, values: AdvisorTemplateValues) => void;
  onFollowUpQuestion: (question: string) => void;
  onRetry: () => void;
  wide?: boolean;
};

export function AdvisorInteractionPanel({
  selectedTemplate,
  question,
  answer,
  answerMessageId,
  allowWebSearch,
  isLoading,
  errorMessage,
  canRetry,
  onSubmitQuestion,
  onFollowUpQuestion,
  onRetry,
  wide = false,
}: AdvisorInteractionPanelProps) {
  return (
    <aside className={wide ? "min-w-0 space-y-5" : "min-w-0 space-y-4 lg:sticky lg:top-6"}>
      {selectedTemplate ? (
        <Card>
          <CardContent className="p-5">
            <DynamicQuestionForm
              key={selectedTemplate.id}
              template={selectedTemplate}
              onSubmit={onSubmitQuestion}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-5">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ClipboardList className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-lg font-bold">Chọn một mẫu câu hỏi</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  ZPath sẽ mở form phù hợp với từng nhu cầu và tự tạo câu hỏi tiếng Việt tự nhiên.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card className="animate-fade-up overflow-hidden border-primary/20">
          <CardContent className="space-y-5 p-5 sm:p-7">
            <div className="flex gap-3">
              <span className="flex h-12 w-12 shrink-0 animate-pulse-glow items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-2xl font-black leading-tight">
                  ZPath đang phân tích câu hỏi...
                </h2>
                <p className="mt-2 text-base leading-7 text-muted-foreground">
                  Câu trả lời sẽ tách rõ dữ liệu ZPath, nguồn web nếu có và phần tư vấn.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <LoadingStep
                icon={Sparkles}
                text="ZPath đang phân tích câu hỏi..."
                active
              />
              <LoadingStep
                icon={Database}
                text="Đang kiểm tra dữ liệu ZPath..."
                active
              />
              {allowWebSearch && (
                <LoadingStep
                  icon={Globe2}
                  text="Đang tìm thêm nguồn web đáng tin cậy..."
                  active
                />
              )}
            </div>
          </CardContent>
        </Card>
      ) : errorMessage ? (
        <Card className="border-destructive/30">
          <CardContent className="p-5">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                <AlertCircle className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg font-bold">
                  ZPath chưa trả lời được lúc này
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Có thể kết nối dữ liệu hoặc dịch vụ AI đang chậm. Bạn có thể thử lại với cùng câu hỏi hoặc rút gọn câu hỏi một chút.
                </p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Chi tiết: {errorMessage}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 rounded-md"
                  onClick={onRetry}
                  disabled={!canRetry}
                >
                  <RotateCcw className="h-4 w-4" />
                  Thử lại
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : answer ? (
        <AdvisorAnswer
          answer={answer}
          messageId={answerMessageId}
          onFollowUpSelect={onFollowUpQuestion}
        />
      ) : (
        <AdvisorAnswerPlaceholder
          question={question}
          onExampleSelect={onFollowUpQuestion}
        />
      )}
    </aside>
  );
}

function LoadingStep({
  icon: Icon,
  text,
  active,
}: {
  icon: typeof Sparkles;
  text: string;
  active: boolean;
}) {
  return (
    <div className="flex min-h-20 items-center gap-3 rounded-md border bg-background px-3 py-3 text-sm shadow-sm">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="font-semibold leading-5 text-foreground">{text}</span>
      {active && (
        <span className="ml-auto h-2 w-2 rounded-full bg-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]" />
      )}
    </div>
  );
}
