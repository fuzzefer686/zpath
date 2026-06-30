"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Brain,
  BriefcaseBusiness,
  ClipboardCheck,
  Compass,
  DatabaseZap,
  GraduationCap,
  MessageCircle,
  MapPinned,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/zpath/AuthProvider";
import { InlineAd } from "@/components/zpath/InlineAd";

const concerns = [
  {
    icon: BookOpenCheck,
    title: "Quá nhiều ngành học",
    desc: "Học sinh phải chọn giữa hàng trăm ngành và hàng nghìn chương trình đào tạo khác nhau.",
  },
  {
    icon: MapPinned,
    title: "Thông tin thay đổi từng năm",
    desc: "Phương thức tuyển sinh, tổ hợp, điểm chuẩn và chỉ tiêu luôn cần được đối chiếu lại.",
  },
  {
    icon: Target,
    title: "Khó xác định ưu tiên",
    desc: "Nhiều gia đình phân vân giữa sở thích, năng lực, xu hướng xã hội và cơ hội việc làm.",
  },
];

const roadmap = [
  {
    icon: Brain,
    title: "Hiểu bản thân",
    desc: "Phân tích sở thích, năng lực, tính cách và ưu tiên học tập để nhận diện hướng đi phù hợp.",
  },
  {
    icon: GraduationCap,
    title: "Hiểu ngành học",
    desc: "Giúp học sinh nhìn rõ yêu cầu, nội dung đào tạo và các lựa chọn ngành gần nhau.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Hiểu thị trường lao động",
    desc: "Kết nối lựa chọn đại học với bối cảnh nghề nghiệp, kỹ năng và cơ hội phát triển dài hạn.",
  },
  {
    icon: ClipboardCheck,
    title: "Xây kế hoạch xét tuyển",
    desc: "Hỗ trợ sắp xếp nguyện vọng, phương án học tập và chiến lược ứng tuyển thực tế hơn.",
  },
];

const productFeatures = [
  {
    eyebrow: "AI chatbot tư vấn",
    title: "Hỏi đáp tuyển sinh như đang nói chuyện với cố vấn",
    desc: "Chatbot AI của ZPATH giúp học sinh hỏi về ngành, trường, lộ trình học, cơ hội nghề nghiệp và chiến lược nguyện vọng dựa trên dữ liệu nội bộ cùng ngữ cảnh câu hỏi.",
    href: "/advisor",
    cta: "Mở AI chatbot",
    icon: MessageCircle,
    accent: "bg-primary/10 text-primary",
    bullets: [
      "Tư vấn theo ngành, trường, điểm và mục tiêu cá nhân.",
      "Tóm tắt dữ liệu tuyển sinh thành khuyến nghị dễ hành động.",
      "Gợi ý câu hỏi tiếp theo để học sinh không bị lạc hướng.",
    ],
  },
  {
    eyebrow: "Scoring",
    title: "Tính điểm xét tuyển và so sánh điểm chuẩn theo trường",
    desc: "Scoring hỗ trợ tính điểm theo phương thức xét tuyển của từng trường, đối chiếu với điểm chuẩn tham chiếu 2025 để học sinh nhìn nhanh mức độ an toàn, vừa sức hay rủi ro.",
    href: "/scoring",
    cta: "Dùng Scoring",
    icon: BarChart3,
    accent: "bg-accent/10 text-accent",
    bullets: [
      "Tính điểm theo từng phương thức xét tuyển được hỗ trợ.",
      "So sánh với dữ liệu điểm chuẩn 2025 trong ZPATH.",
      "Hiển thị chênh lệch để lập danh sách nguyện vọng thực tế hơn.",
    ],
  },
];

export function Homepage() {
  const { openAuthPrompt } = useAuth();
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("auth") === "required") {
        openAuthPrompt();
        // Clear the search param to avoid showing modal on reload
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, [openAuthPrompt]);

  return (
    <main className="bg-background text-foreground">
      <section className="relative overflow-hidden border-b border-border/70">
        <div className="absolute inset-0 bg-mesh" />
        <div className="absolute inset-0 grid-dots opacity-30" />

        <div className="container-page relative grid gap-10 pt-14 pb-12 sm:pt-20 sm:pb-18 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div>
            <div className="mb-6 inline-flex animate-fade-up items-center gap-2 rounded-full border border-foreground/10 bg-card/90 px-4 py-2 text-xs font-bold uppercase tracking-widest backdrop-blur">
              <Compass className="h-3.5 w-3.5 text-accent" />
              AI advisor + scoring engine
            </div>

            <h1
              className="animate-fade-up font-display text-4xl font-bold leading-[1.04] sm:text-5xl md:text-6xl"
              style={{ animationDelay: "90ms" }}
            >
              Chọn ngành, chọn trường bằng{" "}
              <span className="text-gradient-hero">dữ liệu và tư vấn AI</span>
            </h1>

            <p
              className="mt-6 max-w-2xl animate-fade-up text-base leading-8 text-muted-foreground sm:text-lg"
              style={{ animationDelay: "180ms" }}
            >
              ZPATH giúp học sinh đặt câu hỏi với AI chatbot tư vấn, tính điểm xét tuyển
              bằng Scoring và biến dữ liệu tuyển sinh thành một kế hoạch nguyện vọng rõ ràng hơn.
            </p>

            <div
              className="mt-9 flex animate-fade-up flex-col gap-3 sm:flex-row"
              style={{ animationDelay: "270ms" }}
            >
              <Button asChild variant="hero" size="xl" className="w-full sm:w-auto">
                <Link href="/advisor">
                  Hỏi AI chatbot <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl" className="w-full sm:w-auto">
                <Link href="/scoring">Dùng Scoring</Link>
              </Button>
            </div>

            <div
              className="mt-8 grid max-w-xl animate-fade-up gap-3 text-sm text-muted-foreground sm:grid-cols-3"
              style={{ animationDelay: "330ms" }}
            >
              {[
                ["2025", "điểm chuẩn tham chiếu"],
                ["AI", "tư vấn theo ngữ cảnh"],
                ["UniMap", "dữ liệu trường/ngành"],
              ].map(([value, label]) => (
                <div key={label} className="border-l border-border/80 pl-4">
                  <div className="font-display text-2xl font-bold text-foreground">{value}</div>
                  <div className="mt-1 leading-5">{label}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 max-w-2xl">
              <div
                onClick={() => setIsVideoOpen(true)}
                className="group relative cursor-pointer animate-fade-up overflow-hidden rounded-2xl border border-border bg-card/95 p-3 shadow-md backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
                style={{ animationDelay: "390ms" }}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  {/* Thumbnail image with play overlay */}
                  <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden rounded-xl border border-border sm:w-40 bg-muted">
                    <Image
                      src="/video-thumbnail.png"
                      alt="ZPATH giới thiệu"
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, 160px"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/40">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-primary shadow-md transition-transform duration-300 group-hover:scale-110">
                        <svg className="h-5 w-5 fill-current ml-0.5" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Text and CTA */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      Podcast
                    </div>
                    <h3 className="mt-2 font-display text-lg font-bold leading-snug">
                      Podcast chọn gì trước chọn gì sau
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                      Xem cách định hướng nghề nghiệp và tối ưu điểm xét tuyển
                    </p>
                  </div>

                  {/* Arrow indicator */}
                  <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div
              className="animate-fade-up rounded-[2rem] border border-border bg-card/95 p-4 shadow-md backdrop-blur transition-transform duration-500 hover:-translate-y-1 sm:p-5 lg:animate-float-slow"
              style={{ animationDelay: "360ms" }}
            >
              <div className="flex items-center gap-4 border-b border-border pb-5">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-border bg-background">
                  <Image
                    src="/zpath-logo.jpg"
                    alt="ZPATH"
                    fill
                    className="object-cover"
                    sizes="64px"
                    priority
                  />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-primary">ZPATH</p>
                  <p className="mt-1 font-display text-xl font-bold">Advisor workspace</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-muted/45 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-primary">
                      AI chatbot tư vấn
                    </p>
                    <p className="mt-1 text-sm font-semibold">Em nên chọn EE-E18 không?</p>
                  </div>
                  <Sparkles className="h-5 w-5 text-accent" />
                </div>
                <div className="space-y-3 text-sm leading-6">
                  <div className="ml-auto max-w-[82%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-primary-foreground">
                    Em có điểm XTTN 1.3 là 71.33, muốn xét HUST.
                  </div>
                  <div className="max-w-[88%] rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3">
                    ZPATH sẽ so sánh với điểm chuẩn 2025 và phân tích mức độ rủi ro theo ngành.
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  { title: "Scoring", desc: "Điểm chuẩn 2025", icon: DatabaseZap },
                  { title: "Advisor", desc: "Khuyến nghị hành động", icon: ShieldCheck },
                ].map(({ title, desc, icon: Icon }) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-border bg-background p-4"
                  >
                    <Icon className="mb-3 h-5 w-5 text-primary" />
                    <div className="font-display text-lg font-bold">{title}</div>
                    <div className="mt-1 text-xs leading-5 text-muted-foreground">{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="container-page">
          <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
            <div className="animate-fade-up">
              <p className="text-sm font-bold uppercase tracking-widest text-primary">
                Hai tính năng chính
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-5xl">
                Một nơi để hỏi, một nơi để tính điểm
              </h2>
              <p className="mt-5 text-base leading-8 text-muted-foreground sm:text-lg">
                ZPATH tập trung vào hai việc học sinh cần nhất trong mùa tuyển sinh:
                hiểu lựa chọn của mình và kiểm tra lựa chọn đó bằng điểm số.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {productFeatures.map((feature, index) => {
                const Icon = feature.icon;

                return (
                  <article
                    key={feature.title}
                    className="group animate-fade-up overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
                    style={{ animationDelay: `${index * 120}ms` }}
                  >
                    <div className="flex items-start justify-between gap-5">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-primary">
                          {feature.eyebrow}
                        </p>
                        <h3 className="mt-3 font-display text-2xl font-bold leading-tight">
                          {feature.title}
                        </h3>
                      </div>
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${feature.accent}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>

                    <p className="mt-5 text-sm leading-7 text-muted-foreground">
                      {feature.desc}
                    </p>

                    <div className="mt-6 space-y-3">
                      {feature.bullets.map((bullet) => (
                        <div key={bullet} className="flex gap-3 text-sm leading-6">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          <span>{bullet}</span>
                        </div>
                      ))}
                    </div>

                    <Button
                      asChild
                      variant={index === 0 ? "hero" : "coral"}
                      size="lg"
                      className="mt-7 w-full"
                    >
                      <Link href={feature.href}>
                        {feature.cta} <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* In-content ad — primary ad surface for mobile (rails are desktop-only) */}
      <InlineAd placement="homeInline1" />

      <section className="border-y border-border/70 bg-muted/30 py-16 sm:py-24">
        <div className="container-page">
          <div className="mx-auto max-w-3xl animate-fade-up text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-primary">
              Vì sao cần một lộ trình rõ ràng?
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-5xl">
              Chọn đại học không nên là cuộc chạy đua mơ hồ theo điểm số hay xu hướng
            </h2>
            <p className="mt-5 text-base leading-8 text-muted-foreground sm:text-lg">
              Giữa quá nhiều nguồn thông tin tuyển sinh, học sinh và phụ huynh cần một cách
              nhìn có hệ thống để biết nên chọn ngành theo sở thích, theo năng lực, theo xu
              hướng hay theo cơ hội việc làm.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {concerns.map((item, index) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="group animate-fade-up rounded-[1.5rem] border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
                  style={{ animationDelay: `${index * 110}ms` }}
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-xl font-bold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.desc}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Second in-content ad further down the page */}
      <InlineAd placement="homeInline2" />

      <section className="py-16 sm:py-24">
        <div className="container-page">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <div className="animate-fade-up">
              <p className="text-sm font-bold uppercase tracking-widest text-primary">
                ZPATH giải quyết như thế nào?
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-5xl">
                Biến lựa chọn đại học thành một kế hoạch có chiến lược
              </h2>
              <p className="mt-5 text-base leading-8 text-muted-foreground sm:text-lg">
                Chúng tôi cung cấp các giải pháp tư vấn tuyển sinh, định hướng ngành nghề,
                phân tích năng lực cá nhân và hỗ trợ xây dựng kế hoạch học tập - xét tuyển.
                Mục tiêu là giúp mỗi học sinh hiểu bản thân, hiểu ngành học, hiểu thị trường
                lao động và đưa ra lựa chọn đại học một cách tự tin.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {roadmap.map((item, index) => {
                const Icon = item.icon;

                return (
                  <article
                    key={item.title}
                    className="group animate-fade-up rounded-[1.5rem] border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground transition-transform duration-300 group-hover:rotate-3 group-hover:scale-110">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-display text-xl font-bold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.desc}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="container-page">
          <div className="relative animate-fade-up overflow-hidden rounded-[2rem] bg-gradient-hero px-6 py-12 text-center text-primary-foreground shadow-glow transition-transform duration-500 hover:-translate-y-1 sm:px-10 sm:py-16">
            <UsersRound className="mx-auto mb-5 h-11 w-11 animate-pulse-glow rounded-full opacity-90" />
            <h2 className="mx-auto max-w-3xl font-display text-3xl font-bold leading-tight sm:text-5xl">
              Tìm con đường phù hợp nhất với năng lực, đam mê và tương lai của bạn
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 opacity-90 sm:text-lg">
              Với ZPATH, hành trình vào đại học trở thành một kế hoạch có định hướng,
              có chiến lược và có sự đồng hành cùng chuyên gia.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild variant="lime" size="xl" className="w-full sm:w-auto">
                <Link href="/advisor">Zpath AI</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="xl"
                className="w-full border-white/40 bg-white/10 text-white hover:bg-white/20 sm:w-auto"
              >
                <Link href="/unimap">So sánh trường</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Lightbox Modal Video Facebook Reel */}
      {isVideoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          onMouseDown={() => setIsVideoOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsVideoOpen(false)}
            className="absolute top-4 right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white transition-colors hover:bg-black/60 hover:text-white"
            aria-label="Đóng video"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div
            className="relative w-full max-w-[560px] overflow-hidden rounded-[2rem] border border-border bg-card shadow-2xl animate-fade-up"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="relative w-full" style={{ aspectRatio: "560 / 429" }}>
              <iframe
                src="https://www.facebook.com/plugins/video.php?height=314&href=https%3A%2F%2Fwww.facebook.com%2Freel%2F989278203893051%2F&show_text=true&width=560&t=0"
                title="ZPATH giới thiệu"
                className="absolute inset-0 h-full w-full border-none"
                style={{ overflow: "hidden" }}
                scrolling="no"
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
