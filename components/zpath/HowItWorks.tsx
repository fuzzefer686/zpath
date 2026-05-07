import { ClipboardList, Cpu, Target } from "lucide-react";

import { SectionHeading } from "@/components/zpath/SectionHeading";

const steps = [
  {
    icon: ClipboardList,
    title: "Nhập dữ liệu",
    desc: "Tính cách SBTI, điểm 4 môn và điểm thưởng trong khoảng 2 phút.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Cpu,
    title: "Thuật toán xử lý",
    desc: "Đối chiếu với dữ liệu tuyển sinh từng vùng để ra dự đoán.",
    color: "bg-accent/10 text-accent",
  },
  {
    icon: Target,
    title: "Nhận kết quả",
    desc: "Tỉ lệ đỗ rõ ràng: LOW, MID hay HIGH cùng lời khuyên cá nhân.",
    color: "bg-tier-high/10 text-tier-high",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="py-20 sm:py-28">
      <div className="container-page">
        <SectionHeading
          eyebrow="Cách hoạt động"
          title={
            <>
              3 bước <span className="text-gradient-hero">đơn giản</span>
            </>
          }
          description="Không cần lằng nhằng, chỉ vài phút bạn đã biết được cơ hội đỗ của mình."
        />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <div
                key={step.title}
                className="group relative rounded-3xl border-2 border-border bg-card p-7 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
              >
                <div className="absolute -right-4 -top-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground font-display text-xl font-bold text-background">
                  {index + 1}
                </div>
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${step.color}`}>
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="mt-5 font-display text-xl font-bold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
