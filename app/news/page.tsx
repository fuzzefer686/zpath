"use client";

import Link from "next/link";
import { ArrowLeft, Clock, User, Tag, ChevronRight, Newspaper, TrendingUp, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NEWS_ARTICLES } from "@/data/news";
import { useState, useEffect } from "react";

const ALL_TAGS = Array.from(new Set(NEWS_ARTICLES.map((a) => a.tag)));

export default function NewsPage() {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = NEWS_ARTICLES.filter((a) => {
    const matchTag = !activeTag || a.tag === activeTag;
    const matchSearch =
      !searchQuery ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTag && matchSearch;
  });

  const featured = NEWS_ARTICLES.filter((a) => a.featured);
  const latest = NEWS_ARTICLES.slice(0, 6);

  // Handle hash-based scroll on load
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 300);
      }
    }
  }, []);

  return (
    <div className="bg-background min-h-screen">
      {/* HERO HEADER */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-mesh opacity-60" />
        <div className="absolute inset-0 grid-dots opacity-20" />
        <div className="container-page relative py-12 sm:py-16">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/" className="hover:text-primary transition-colors">Trang chủ</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium">Bảng tin</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border-2 border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary">
                <Newspaper className="h-3.5 w-3.5" /> Bảng tin ZPATH
              </div>
              <h1 className="font-display text-3xl font-bold sm:text-4xl md:text-5xl">
                Tin tức & <span className="text-gradient-hero">Hướng nghiệp</span>
              </h1>
              <p className="mt-3 max-w-xl text-muted-foreground">
                Cập nhật thông tin tuyển sinh, học bổng, xu hướng nghề nghiệp và lời khuyên hướng nghiệp mới nhất.
              </p>
            </div>
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Tìm kiếm bài viết..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border-2 border-border bg-card pl-10 pr-4 py-2.5 text-sm focus:border-primary focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED ARTICLES — Newspaper style hero */}
      {!searchQuery && !activeTag && featured.length > 0 && (
        <section className="border-b border-border">
          <div className="container-page py-10 sm:py-14">
            <div className="flex items-center gap-2 mb-8">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-bold">Nổi bật</h2>
              <div className="flex-1 h-px bg-border ml-4" />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Big featured */}
              <Link
                href={`/news#article-${featured[0].slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(`article-${featured[0].slug}`);
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="group relative overflow-hidden rounded-3xl border-2 border-border bg-card transition-all hover:-translate-y-1 hover:shadow-glow"
              >
                <div className={`aspect-[16/9] bg-gradient-to-br ${featured[0].imageGradient} relative`}>
                  <div className="absolute inset-0 bg-foreground/10 group-hover:bg-foreground/5 transition-colors" />
                  <div className="absolute bottom-4 left-4">
                    <span className="inline-block rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-foreground">
                      {featured[0].tag}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-display text-xl font-bold leading-snug group-hover:text-primary transition-colors sm:text-2xl">
                    {featured[0].title}
                  </h3>
                  <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{featured[0].excerpt}</p>
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><User className="h-3 w-3" />{featured[0].author}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{featured[0].readTime}</span>
                    <span>{featured[0].date}</span>
                  </div>
                </div>
              </Link>
              {/* Side featured */}
              <div className="flex flex-col gap-4">
                {featured.slice(1).map((article) => (
                  <Link
                    key={article.id}
                    href={`/news#article-${article.slug}`}
                    onClick={(e) => {
                      e.preventDefault();
                      const el = document.getElementById(`article-${article.slug}`);
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="group flex gap-4 overflow-hidden rounded-2xl border-2 border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className={`hidden sm:block w-32 h-24 flex-shrink-0 rounded-xl bg-gradient-to-br ${article.imageGradient}`} />
                    <div className="flex-1 min-w-0">
                      <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                        {article.tag}
                      </span>
                      <h3 className="mt-1.5 font-display text-sm font-bold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        {article.title}
                      </h3>
                      <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span>{article.date}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{article.readTime}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TAG FILTER */}
      <section className="sticky top-16 z-30 border-b border-border bg-background/90 backdrop-blur-lg">
        <div className="container-page">
          <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTag(null)}
              className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                !activeTag
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Tất cả
            </button>
            {ALL_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                  activeTag === tag
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <Tag className="inline h-3 w-3 mr-1" />
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ALL ARTICLES */}
      <section className="py-10 sm:py-14">
        <div className="container-page">
          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            {/* Main feed */}
            <div className="space-y-0 divide-y divide-border">
              {filtered.length === 0 && (
                <div className="text-center py-20">
                  <Newspaper className="mx-auto h-12 w-12 text-muted-foreground/40" />
                  <p className="mt-4 text-muted-foreground">Không tìm thấy bài viết phù hợp.</p>
                </div>
              )}
              {filtered.map((article, idx) => (
                <article
                  key={article.id}
                  id={`article-${article.slug}`}
                  className="scroll-mt-32 py-8 first:pt-0"
                >
                  <div className="flex flex-col sm:flex-row gap-5">
                    {/* Image */}
                    <div className={`flex-shrink-0 w-full sm:w-56 h-36 rounded-2xl bg-gradient-to-br ${article.imageGradient} relative overflow-hidden`}>
                      <div className="absolute inset-0 bg-foreground/5" />
                      <div className="absolute top-3 left-3">
                        <span className="inline-block rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold text-foreground">
                          {article.tag}
                        </span>
                      </div>
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h2 className="font-display text-lg font-bold leading-snug sm:text-xl hover:text-primary transition-colors cursor-default">
                        {article.title}
                      </h2>
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><User className="h-3 w-3" />{article.author}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{article.readTime}</span>
                        <span>{article.date}</span>
                      </div>
                      {/* Expandable content */}
                      <details className="mt-4 group">
                        <summary className="cursor-pointer inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
                          Đọc tiếp <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
                        </summary>
                        <div className="mt-4 prose prose-sm max-w-none text-foreground/80 leading-relaxed">
                          {article.content.split("\n").map((line, i) => {
                            if (line.startsWith("## ")) {
                              return <h2 key={i} className="font-display text-xl font-bold mt-6 mb-3 text-foreground">{line.replace("## ", "")}</h2>;
                            }
                            if (line.startsWith("### ")) {
                              return <h3 key={i} className="font-display text-lg font-bold mt-5 mb-2 text-foreground">{line.replace("### ", "")}</h3>;
                            }
                            if (line.startsWith("- **")) {
                              const boldMatch = line.match(/- \*\*(.+?)\*\*(.+)/);
                              if (boldMatch) {
                                return (
                                  <div key={i} className="flex items-start gap-2 ml-4 my-1">
                                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                                    <p><strong className="text-foreground">{boldMatch[1]}</strong>{boldMatch[2]}</p>
                                  </div>
                                );
                              }
                            }
                            if (line.startsWith("- ")) {
                              return (
                                <div key={i} className="flex items-start gap-2 ml-4 my-1">
                                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                                  <p>{line.replace("- ", "")}</p>
                                </div>
                              );
                            }
                            if (/^\d+\./.test(line)) {
                              return (
                                <div key={i} className="flex items-start gap-2 ml-4 my-1">
                                  <span className="mt-0.5 font-bold text-primary text-xs">{line.match(/^(\d+)\./)?.[1]}.</span>
                                  <p>{line.replace(/^\d+\.\s*/, "")}</p>
                                </div>
                              );
                            }
                            if (line.startsWith("**")) {
                              return <p key={i} className="font-semibold text-foreground my-2">{line.replace(/\*\*/g, "")}</p>;
                            }
                            if (line.trim() === "") return <div key={i} className="h-2" />;
                            return <p key={i} className="my-1.5">{line}</p>;
                          })}
                        </div>
                      </details>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Sidebar */}
            <aside className="hidden lg:block">
              <div className="sticky top-32 space-y-6">
                {/* Categories */}
                <div className="rounded-2xl border-2 border-border bg-card p-5">
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
                    Chuyên mục
                  </h3>
                  <div className="space-y-1">
                    {ALL_TAGS.map((tag) => {
                      const count = NEWS_ARTICLES.filter((a) => a.tag === tag).length;
                      return (
                        <button
                          key={tag}
                          onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                            activeTag === tag
                              ? "bg-primary/10 text-primary font-semibold"
                              : "text-foreground/70 hover:bg-muted"
                          }`}
                        >
                          <span>{tag}</span>
                          <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Newsletter signup */}
                <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-5">
                  <h3 className="font-display text-base font-bold">📬 Đăng ký nhận tin</h3>
                  <p className="mt-2 text-xs text-muted-foreground">Cập nhật tin tức tuyển sinh & hướng nghiệp mỗi tuần.</p>
                  <input
                    type="email"
                    placeholder="Email của bạn..."
                    className="mt-3 w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors"
                  />
                  <Button variant="hero" size="sm" className="mt-2 w-full">
                    Đăng ký
                  </Button>
                </div>

                {/* Quick Links */}
                <div className="rounded-2xl border-2 border-border bg-card p-5">
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
                    Khám phá thêm
                  </h3>
                  <div className="space-y-2">
                    <Link href="/unimap" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground/70 hover:bg-muted transition-colors">
                      🏫 UniMap — Trường ĐH
                    </Link>
                    <Link href="/majorly" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground/70 hover:bg-muted transition-colors">
                      📚 Majorly — Ngành học
                    </Link>
                    <Link href="/advisor" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground/70 hover:bg-muted transition-colors">
                      🤖 Tư vấn ngành AI
                    </Link>
                    <Link href="/profile" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground/70 hover:bg-muted transition-colors">
                      👤 Hồ sơ cá nhân
                    </Link>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
