"use client";

import Link from "next/link";
import { ArrowRight, Compass, Sparkles, BookOpen, Users, Trophy, ShieldCheck, Zap, GraduationCap, Layers, Newspaper, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/zpath/SectionHeading";
import { UNIVERSITIES } from "@/data/universities";
import { UniversityCard } from "@/components/zpath/UniversityCard";
import { NEWS_ARTICLES } from "@/data/news";

const stats = [
  { label: "Học sinh đã thử", value: "10K+" },
  { label: "Trường ĐH", value: "50+" },
  { label: "Tỉ lệ chính xác", value: "92%" },
  { label: "Tư vấn miễn phí", value: "24/7" },
];

const products = [
  {
    to: "/unimap",
    icon: Compass,
    title: "UniMap — Trường ĐH",
    desc: "Khám phá thông tin, ngành mạnh và tag chuyên môn của hơn 50 trường đại học.",
    cta: "Khám phá trường",
    gradient: "from-secondary to-tier-high",
  },
  {
    to: "/majorly",
    icon: Layers,
    title: "Majorly — Ngành học",
    desc: "Tra cứu chương trình, học phí, tỉ lệ có việc — và so sánh ngành học bằng Matrix.",
    cta: "Khám phá ngành",
    gradient: "from-tier-mid to-accent",
  },
  {
    to: "/news",
    icon: Newspaper,
    title: "Bảng tin",
    desc: "Cập nhật tin tuyển sinh, học bổng, xu hướng nghề nghiệp và lời khuyên hướng nghiệp.",
    cta: "Đọc ngay",
    gradient: "from-primary to-accent",
  },
  {
    to: "/profile",
    icon: GraduationCap,
    title: "Hồ sơ cá nhân",
    desc: "Lưu điểm thi, trường mục tiêu — một chạm import vào mọi tính năng của ZPATH.",
    cta: "Tạo hồ sơ",
    gradient: "from-accent to-primary-glow",
  },
];

const latestNews = NEWS_ARTICLES.slice(0, 4);

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
              <Zap className="h-3.5 w-3.5 text-accent" /> Nền tảng hướng nghiệp #1 cho Gen-Z
            </div>
            <h1 className="font-display text-4xl font-bold leading-[1.05] sm:text-6xl md:text-7xl">
              Mở đường <span className="text-gradient-hero">tương lai</span><br />
              bắt đầu từ ZPATH
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Một nền tảng — đầy đủ công cụ tư vấn ngành, khám phá trường đại học và quản lý hồ sơ cá nhân
              để bạn tự tin chọn đúng con đường.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild variant="hero" size="xl" className="w-full sm:w-auto">
                <Link href="/advisor">Tư vấn ngành <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
              <Button asChild variant="outline" size="xl" className="w-full sm:w-auto">
                <Link href="/unimap">Khám phá trường</Link>
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border-2 border-border bg-card p-5 text-center shadow-sm">
                <div className="font-display text-2xl font-bold text-gradient-hero sm:text-3xl">{s.value}</div>
                <div className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="py-20 sm:py-28">
        <div className="container-page">
          <SectionHeading
            eyebrow="Hệ sinh thái ZPATH"
            title={<>Mọi thứ bạn cần <span className="text-gradient-hero">trong một nơi</span></>}
            description="Bốn sản phẩm cốt lõi giúp bạn quyết định đúng — nhanh hơn, thông minh hơn."
          />
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {products.map((p) => {
              const Icon = p.icon;
              return (
                <Link
                  key={p.title}
                  href={p.to}
                  className="group relative overflow-hidden rounded-3xl border-2 border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-glow"
                >
                  <div className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${p.gradient} text-white shadow-md`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="font-display text-xl font-bold">{p.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
                  <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
                    {p.cta} <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* TRENDING UNIVERSITIES */}
      <section className="bg-muted/30 py-20 sm:py-28">
        <div className="container-page">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Trending
              </div>
              <h2 className="font-display text-3xl font-bold sm:text-4xl">Trường được tìm kiếm nhiều</h2>
            </div>
            <Button asChild variant="ghost">
              <Link href="/unimap">Xem tất cả <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {UNIVERSITIES.slice(0, 4).map((u) => (
              <UniversityCard key={u.code} uni={u} />
            ))}
          </div>
        </div>
      </section>

      {/* WHY US */}
      <section className="py-20 sm:py-28">
        <div className="container-page">
          <SectionHeading
            eyebrow="Vì sao chọn ZPATH"
            title={<>Hơn cả một <span className="text-gradient-hero">công cụ</span></>}
            description="Chúng mình kết hợp dữ liệu, AI và sự thấu hiểu Gen-Z để hướng nghiệp đúng cách."
          />
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ShieldCheck, title: "Dữ liệu thực tế", desc: "Tỉ lệ đỗ tính theo dữ liệu thật của từng vùng & từng trường." },
              { icon: Sparkles, title: "AI cá nhân hoá", desc: "ZPath-AI tư vấn 24/7 dựa trên hồ sơ riêng của bạn." },
              { icon: BookOpen, title: "Thông tin đầy đủ", desc: "Chi tiết ngành học, học phí, môi trường, network alumni." },
              { icon: Users, title: "Cộng đồng học sinh", desc: "Trao đổi với hơn 10K Gen-Z khác đã sử dụng ZPATH." },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-2xl border-2 border-border bg-card p-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-lg font-bold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* NEWS / BLOG */}
      <section className="bg-muted/30 py-20 sm:py-28">
        <div className="container-page">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
                <Newspaper className="h-3.5 w-3.5" /> Bảng tin
              </div>
              <h2 className="font-display text-3xl font-bold sm:text-4xl">Cập nhật mới nhất từ ZPATH</h2>
            </div>
            <Button asChild variant="ghost">
              <Link href="/news">Xem tất cả <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {latestNews.map((article) => (
              <Link
                key={article.id}
                href={`/news#article-${article.slug}`}
                className="group overflow-hidden rounded-2xl border-2 border-border bg-card transition-all hover:-translate-y-1 hover:shadow-md"
              >
                <div className={`aspect-[16/10] bg-gradient-to-br ${article.imageGradient} relative`}>
                  <div className="absolute inset-0 bg-foreground/5 group-hover:bg-foreground/0 transition-colors" />
                  <div className="absolute bottom-3 left-3">
                    <span className="inline-block rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold text-foreground">
                      {article.tag}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-display text-sm font-bold leading-snug group-hover:text-primary transition-colors line-clamp-2 sm:text-base">
                    {article.title}
                  </h3>
                  <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{article.readTime}</span>
                    <span>{article.date}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28">
        <div className="container-page">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-hero p-10 text-center text-primary-foreground shadow-glow sm:p-16">
            <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 animate-blob bg-white/20 blur-2xl" />
            <div className="pointer-events-none absolute -right-10 -bottom-10 h-52 w-52 animate-blob bg-white/20 blur-2xl" style={{ animationDelay: "3s" }} />
            <Trophy className="mx-auto mb-4 h-10 w-10 opacity-90" />
            <h2 className="font-display text-3xl font-bold sm:text-5xl">Sẵn sàng cho mùa thi 2026?</h2>
            <p className="mx-auto mt-4 max-w-xl opacity-90">Bắt đầu hành trình chỉ với 30 giây — không cần đăng ký, không phí ẩn.</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild variant="lime" size="xl" className="w-full sm:w-auto">
                <Link href="/advisor">Tư vấn ngành ngay</Link>
              </Button>
              <Button asChild variant="outline" size="xl" className="w-full border-white/40 bg-white/10 text-white hover:bg-white/20 sm:w-auto">
                <Link href="/profile">Tạo hồ sơ</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
