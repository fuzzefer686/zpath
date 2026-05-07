import { Star } from "lucide-react";

import { SectionHeading } from "@/components/zpath/SectionHeading";

const items = [
  {
    name: "Minh Anh",
    role: "12A1, THPT Chu Văn An",
    text: "Mình ngỡ ngàng vì kết quả khớp với dự đoán của thầy cô. Quyết định nguyện vọng nhanh hơn nhiều.",
    color: "bg-primary text-primary-foreground",
  },
  {
    name: "Quốc Bảo",
    role: "12 Toán, THPT Lê Hồng Phong",
    text: "App giao diện xịn xò, dễ dùng. Phần phân tích SBTI rất hợp với mình.",
    color: "bg-secondary text-secondary-foreground",
  },
  {
    name: "Hà My",
    role: "Phụ huynh",
    text: "Cảm ơn ZPATH đã giúp con mình bớt hoang mang trong giai đoạn nước rút.",
    color: "bg-accent text-accent-foreground",
  },
];

export function Testimonials() {
  return (
    <section className="bg-muted/40 py-20 sm:py-28">
      <div className="container-page">
        <SectionHeading
          eyebrow="Cộng đồng"
          title={
            <>
              Hơn <span className="text-gradient-hero">10.000 học sinh</span> đã tin tưởng
            </>
          }
        />
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {items.map((item) => (
            <div key={item.name} className="flex flex-col rounded-3xl border-2 border-border bg-card p-6 shadow-sm">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="h-4 w-4 fill-tier-mid text-tier-mid" />
                ))}
              </div>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-foreground/80">{item.text}</p>
              <div className="mt-5 flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full font-display font-bold ${item.color}`}
                >
                  {item.name[0]}
                </div>
                <div>
                  <div className="font-bold">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
