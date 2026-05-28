import {
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  Globe2,
  Languages,
  Lightbulb,
  Palette,
  Scale,
  ShieldAlert,
  Stethoscope,
  Truck,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AdvisorAnswerPlaceholderProps = {
  question: string;
  mockAnswer?: string;
  onExampleSelect?: (question: string) => void;
};

const exampleQuestions = [
  {
    label: "Công nghệ",
    question: "Review ngành Khoa học máy tính và cơ hội việc làm",
    icon: Bot,
  },
  {
    label: "Kinh tế",
    question: "So sánh Kinh tế quốc tế và Logistics",
    icon: BriefcaseBusiness,
  },
  {
    label: "Y dược",
    question: "Review ngành Y đa khoa có khó không?",
    icon: Stethoscope,
  },
  {
    label: "Luật",
    question: "Học Luật ra làm nghề gì?",
    icon: Scale,
  },
  {
    label: "Thiết kế",
    question: "Ngành nào phù hợp với người thích vẽ và sáng tạo?",
    icon: Palette,
  },
  {
    label: "Ngôn ngữ",
    question: "Học Ngôn ngữ Anh có dễ xin việc không?",
    icon: Languages,
  },
  {
    label: "Logistics",
    question: "25 điểm A00 nên chọn ngành Logistics ở trường nào?",
    icon: Truck,
  },
];

export function AdvisorAnswerPlaceholder({
  question,
  mockAnswer,
  onExampleSelect,
}: AdvisorAnswerPlaceholderProps) {
  const displayQuestion = question.trim() || "Câu hỏi của bạn sẽ xuất hiện ở đây";

  return (
    <div>
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/40">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Bot className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="text-lg">Khung trả lời</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Câu trả lời sẽ được trình bày rõ nguồn và mức độ chắc chắn.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 p-5">
          <div className="rounded-md border border-border bg-background p-4">
            <div className="text-xs font-bold uppercase text-muted-foreground">
              Câu hỏi
            </div>
            <p className="mt-2 text-sm font-semibold leading-6">{displayQuestion}</p>
          </div>

          {mockAnswer && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
              <div className="text-xs font-bold uppercase text-primary">
                Câu trả lời mẫu
              </div>
              <p className="mt-2 text-sm leading-6 text-foreground">{mockAnswer}</p>
            </div>
          )}

          <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
            <div className="text-xs font-bold uppercase text-primary">
              Gợi ý câu hỏi
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {exampleQuestions.map((example) => {
                const ExampleIcon = example.icon;

                return (
                  <button
                    key={example.question}
                    type="button"
                    onClick={() => onExampleSelect?.(example.question)}
                    className="group flex min-h-16 items-start gap-3 rounded-md border border-border bg-background p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary/30 text-secondary-foreground group-hover:bg-primary/10 group-hover:text-primary">
                      <ExampleIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-primary">
                        {example.label}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-foreground">
                        {example.question}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <PlaceholderSection
            icon={CheckCircle2}
            title="Dữ liệu ZPath"
            text="Thông tin nội bộ về trường, ngành, điểm chuẩn, học phí và phương thức tuyển sinh."
          />
          <PlaceholderSection
            icon={Globe2}
            title="Nguồn web"
            text="Thông tin cập nhật từ nguồn bên ngoài, kèm URL tham khảo khi có sử dụng."
          />
          <PlaceholderSection
            icon={Lightbulb}
            title="Gợi ý cá nhân"
            text="Phân tích định hướng theo câu hỏi, sở thích, điểm số và mục tiêu học tập."
          />

          <div className="flex gap-3 rounded-md border border-accent/25 bg-accent/10 p-4 text-sm leading-6 text-foreground">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <p>
              ZPath không cam kết kết quả trúng tuyển và không tự tạo điểm chuẩn, học phí hoặc chính sách tuyển sinh khi chưa có nguồn xác thực.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PlaceholderSection({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof CheckCircle2;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary/30 text-secondary-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <h3 className="text-sm font-bold">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
