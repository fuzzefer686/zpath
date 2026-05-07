import { BarChart3, Brain, MapPin, ShieldCheck, Trophy, Wand2 } from "lucide-react";

import { SectionHeading } from "@/components/zpath/SectionHeading";

const features = [
  { icon: Brain, title: "Phân tích SBTI", desc: "Hiểu tính cách để đề xuất ngành phù hợp." },
  { icon: MapPin, title: "Theo vùng địa lý", desc: "Dự đoán riêng cho từng tỉnh/thành phố." },
  { icon: BarChart3, title: "Điểm 4 môn chuẩn", desc: "Toán, Văn và 2 môn tự chọn theo quy chế mới." },
  { icon: Trophy, title: "Điểm thưởng IELTS / Giải", desc: "Tự động cộng bonus công bằng, minh bạch." },
  { icon: Wand2, title: "Thuật toán cá nhân hóa", desc: "Liên tục cập nhật theo dữ liệu thực tế." },
  { icon: ShieldCheck, title: "Bảo mật dữ liệu", desc: "Không lưu thông tin cá nhân khi dùng thử." },
];

export function Features() {
  return (
    <section id="features" className="bg-muted/40 py-20 sm:py-28">
      <div className="container-page">
        <SectionHeading
          eyebrow="Tính năng"
          title={
            <>
              Tất cả những gì bạn cần để <span className="text-gradient-hero">chọn đúng đường</span>
            </>
          }
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="group rounded-2xl border-2 border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground transition-transform group-hover:scale-110">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold">{feature.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
