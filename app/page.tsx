"use client";

import Link from "next/link";
import { ArrowRight, BookOpenCheck, Compass, GraduationCap, MapPinned } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="bg-background">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh" />
        <div className="absolute inset-0 grid-dots opacity-40" />
        <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 animate-blob bg-primary/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-40 h-80 w-80 animate-blob bg-secondary/40 blur-3xl" style={{ animationDelay: "2s" }} />

        <div className="container-page relative pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border-2 border-foreground/10 bg-card/80 px-4 py-2 text-xs font-bold uppercase tracking-widest backdrop-blur">
              <Compass className="h-3.5 w-3.5 text-accent" /> Định hướng ngành và trường đại học
            </div>
            <h1 className="font-display text-4xl font-bold leading-[1.05] sm:text-6xl md:text-7xl">
              Mở đường <span className="text-gradient-hero">tương lai</span><br />
              bắt đầu từ ZPATH
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Tìm ngành học hợp với hồ sơ của bạn, rồi đối chiếu với trường, tổ hợp,
              điểm chuẩn và phương thức tuyển sinh đang được cập nhật trong ZPath.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild variant="hero" size="xl" className="w-full sm:w-auto">
                <Link href="/survey">Tư vấn Ngành <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
              <Button asChild variant="outline" size="xl" className="w-full sm:w-auto">
                <Link href="/unimap">Khám phá trường</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* GUIDANCE */}
      <section className="py-18 sm:py-24">
        <div className="container-page">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-primary">
              Lộ trình tuyển sinh cá nhân
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-5xl">
              Bắt đầu từ ngành phù hợp, kết thúc bằng lựa chọn có dữ liệu
            </h2>
            <p className="mt-4 text-muted-foreground">
              ZPath tập trung vào hai việc quan trọng nhất: hiểu hồ sơ định hướng
              của bạn và kiểm tra các trường phù hợp với dữ liệu tuyển sinh thực tế.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: BookOpenCheck,
                title: "Hồ sơ định hướng",
                desc: "Ghi nhận sở thích, thế mạnh và ưu tiên học tập để gợi ý nhóm ngành hợp lý.",
              },
              {
                icon: MapPinned,
                title: "Dữ liệu tuyển sinh",
                desc: "Đối chiếu chương trình, tổ hợp, học phí và điểm chuẩn theo từng trường.",
              },
              {
                icon: GraduationCap,
                title: "Kế hoạch ứng tuyển",
                desc: "So sánh kết quả tính điểm với mốc tham khảo để chọn phương án an toàn hơn.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border-2 border-border bg-card p-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-lg font-bold">{item.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28">
        <div className="container-page">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-hero p-10 text-center text-primary-foreground shadow-glow sm:p-16">
            <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 animate-blob bg-white/20 blur-2xl" />
            <div className="pointer-events-none absolute -right-10 -bottom-10 h-52 w-52 animate-blob bg-white/20 blur-2xl" style={{ animationDelay: "3s" }} />
            <GraduationCap className="mx-auto mb-4 h-10 w-10 opacity-90" />
            <h2 className="font-display text-3xl font-bold sm:text-5xl">Sẵn sàng cho mùa thi 2026?</h2>
            <p className="mx-auto mt-4 max-w-xl opacity-90">
              Chọn hướng đi trước, rồi kiểm tra trường và phương thức tuyển sinh phù hợp.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild variant="lime" size="xl" className="w-full sm:w-auto">
                <Link href="/survey">Tư vấn Ngành</Link>
              </Button>
              <Button asChild variant="outline" size="xl" className="w-full border-white/40 bg-white/10 text-white hover:bg-white/20 sm:w-auto">
                <Link href="/unimap">Khám phá trường</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
