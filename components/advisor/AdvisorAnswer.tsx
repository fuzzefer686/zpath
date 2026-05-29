import { AlertTriangle, Database, Globe2, Info, Lightbulb } from "lucide-react";

import { AnswerSectionCard } from "@/components/advisor/AnswerSectionCard";
import { ConfidenceBadge } from "@/components/advisor/ConfidenceBadge";
import { AdvisorFeedback } from "@/components/advisor/AdvisorFeedback";
import { FollowUpSuggestions } from "@/components/advisor/FollowUpSuggestions";
import { SourceList } from "@/components/advisor/SourceList";
import { AdvisorIntent } from "@/lib/advisor/intents";
import type { AdvisorAnswer as AdvisorAnswerData, AdvisorAnswerDataStatus } from "@/lib/advisor/types";

type AdvisorAnswerProps = {
  answer: AdvisorAnswerData;
  messageId?: string | null;
  onFollowUpSelect?: (question: string) => void;
};

const dataStatusConfig: Record<
  AdvisorAnswerDataStatus,
  {
    label: string;
    icon: typeof Database;
    className: string;
  }
> = {
  internal_data: {
    label: "Dữ liệu từ ZPath",
    icon: Database,
    className: "border-primary/20 bg-primary/5 text-primary",
  },
  web_augmented: {
    label: "Có bổ sung tìm kiếm web",
    icon: Globe2,
    className: "border-accent/25 bg-accent/10 text-accent",
  },
  limited_data: {
    label: "Dữ liệu còn hạn chế",
    icon: Info,
    className: "border-tier-mid/40 bg-tier-mid-soft text-tier-mid-foreground",
  },
  general_advice: {
    label: "Tư vấn tổng quan",
    icon: Lightbulb,
    className: "border-secondary/40 bg-secondary/25 text-secondary-foreground",
  },
};

const defaultFollowUps: Partial<Record<AdvisorIntent, string[]>> = {
  [AdvisorIntent.REVIEW_MAJOR]: [
    "So sánh ngành này với ngành gần giống",
    "Xem điểm chuẩn các trường có ngành này",
    "Tìm trường phù hợp với mức điểm của em",
    "Xem học phí ngành này",
  ],
  [AdvisorIntent.CAREER_PATH]: [
    "Ngành này nên học thêm kỹ năng gì?",
    "So sánh cơ hội việc làm với ngành gần giống",
    "Xem các vị trí nghề nghiệp phổ biến",
    "Tìm trường đào tạo ngành này",
  ],
  [AdvisorIntent.ADMISSION_CHANCE]: [
    "Tìm trường phù hợp với mức điểm của em",
    "Xem điểm chuẩn các năm gần đây",
    "So sánh phương thức xét tuyển",
    "Gợi ý nguyện vọng an toàn hơn",
  ],
  [AdvisorIntent.SCORE_SUGGESTION]: [
    "Tìm trường phù hợp với mức điểm của em",
    "Xem ngành có triển vọng việc làm tốt",
    "Lọc theo khu vực em muốn học",
    "So sánh học phí các lựa chọn",
  ],
  [AdvisorIntent.TUITION]: [
    "So sánh học phí giữa các trường",
    "Xem chương trình học của ngành này",
    "Tìm học bổng hoặc hỗ trợ tài chính",
    "Xem điểm chuẩn ngành này",
  ],
  [AdvisorIntent.LATEST_ADMISSION_INFO]: [
    "Xem phương thức xét tuyển năm nay",
    "Xem điểm chuẩn các năm gần đây",
    "Xem học phí và chương trình học",
    "Tìm ngành phù hợp trong trường này",
  ],
};

const admissionCautionIntents: AdvisorIntent[] = [
  AdvisorIntent.ADMISSION_CHANCE,
  AdvisorIntent.SCORE_SUGGESTION,
  AdvisorIntent.SCORE_CALCULATION,
  AdvisorIntent.LATEST_ADMISSION_INFO,
];

function getFollowUpQuestions(answer: AdvisorAnswerData) {
  const merged = [
    ...answer.followUpQuestions,
    ...(defaultFollowUps[answer.answerType] ?? defaultFollowUps[AdvisorIntent.REVIEW_MAJOR] ?? []),
  ];

  return Array.from(new Set(merged)).slice(0, 6);
}

export function AdvisorAnswer({
  answer,
  messageId,
  onFollowUpSelect,
}: AdvisorAnswerProps) {
  const status = dataStatusConfig[answer.dataStatus];
  const StatusIcon = status.icon;
  const followUpQuestions = getFollowUpQuestions(answer);
  const shouldShowAdmissionCaution = admissionCautionIntents.includes(
    answer.answerType,
  );

  return (
    <article className="w-full animate-fade-up overflow-hidden rounded-md border border-border bg-card shadow-md">
      <header className="border-b bg-muted/40 p-5 sm:p-7">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <ConfidenceBadge confidence={answer.confidence} />
            <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-bold ${status.className}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {status.label}
            </span>
          </div>
          <div>
            <h2 className="font-display text-3xl font-black leading-tight tracking-normal text-foreground sm:text-4xl">
              {answer.title}
            </h2>
            <p className="mt-3 max-w-4xl text-base leading-8 text-muted-foreground sm:text-lg">
              {answer.summary}
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-7 p-4 sm:p-6 lg:p-7">
        <div className="space-y-5">
          {answer.sections.map((section, index) => (
            <AnswerSectionCard
              key={section.heading}
              heading={section.heading}
              content={section.content}
              index={index}
            />
          ))}
        </div>

        {answer.warnings.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-display text-lg font-bold">Lưu ý</h3>
            {answer.warnings.map((warning) => (
              <div
                key={warning}
                className="flex gap-3 rounded-md border border-accent/25 bg-accent/10 p-4 text-base leading-7"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <p>{warning}</p>
              </div>
            ))}
          </div>
        )}

        {shouldShowAdmissionCaution && (
          <div className="flex gap-3 rounded-md border border-accent/25 bg-accent/10 p-4 text-base leading-7">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <p>
              Thông tin tuyển sinh có thể thay đổi theo từng năm. Khi đăng ký nguyện vọng, hãy kiểm tra lại website chính thức của trường.
            </p>
          </div>
        )}

        <div>
          <h3 className="font-display text-lg font-bold">Nguồn tham khảo</h3>
          <div className="mt-3">
            <SourceList
              sources={answer.sources}
              dataStatus={answer.dataStatus}
            />
          </div>
        </div>

        <FollowUpSuggestions
          questions={followUpQuestions}
          onSelect={onFollowUpSelect}
        />

        <AdvisorFeedback messageId={messageId} />
      </div>
    </article>
  );
}
