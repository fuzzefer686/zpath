import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  GraduationCap,
  Link as LinkIcon,
  MapPin,
  Sparkles,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getUniversity, UNIVERSITIES } from "@/data/universities";

interface UniversityDetailPageProps {
  params: Promise<{
    code: string;
  }>;
}

export function generateStaticParams() {
  return UNIVERSITIES.map((university) => ({
    code: university.code.toLowerCase(),
  }));
}

export async function generateMetadata({ params }: UniversityDetailPageProps) {
  const { code } = await params;
  const university = getUniversity(code);

  return {
    title: university ? `${university.code} - ${university.name}` : "Không tìm thấy trường",
  };
}

export default async function UniversityDetailPage({ params }: UniversityDetailPageProps) {
  const { code } = await params;
  const university = getUniversity(code);

  if (!university) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container-page flex flex-col items-center justify-center py-24 text-center">
          <GraduationCap className="h-14 w-14 text-muted-foreground" />
          <h1 className="mt-4 font-display text-3xl font-bold">Không tìm thấy trường</h1>
          <p className="mt-2 text-muted-foreground">Trường &quot;{code}&quot; không có trong hệ thống.</p>
          <Button asChild className="mt-6" variant="hero">
            <Link href="/unimap">Quay lại danh sách</Link>
          </Button>
        </div>
      </div>
    );
  }

  const programs = university.programs ?? [];
  const channels = university.channels ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className={`relative overflow-hidden bg-gradient-to-br ${university.heroGradient} py-16 text-white md:py-24`}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/50" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_60%)]" />

        <div className="container-page relative">
          <Link
            href="/unimap"
            className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-white/25"
          >
            <ArrowLeft className="h-4 w-4" /> UniMap
          </Link>

          <div className="mt-6 grid items-center gap-8 md:grid-cols-[1fr_auto]">
            <div>
              <div className="font-display text-5xl font-extrabold drop-shadow md:text-7xl">
                {university.code}
              </div>
              <h1 className="mt-3 max-w-2xl text-xl font-semibold md:text-2xl">
                {university.name}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 backdrop-blur-sm">
                  <MapPin className="h-3.5 w-3.5" /> {university.city}
                </span>
                {university.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-white/20 px-3 py-1 font-semibold backdrop-blur-sm">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {university.website && (
                <Button asChild variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20">
                  <a href={university.website} target="_blank" rel="noreferrer">
                    Website <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              )}
              <Button asChild variant="lime">
                <Link href="/landing#try">Tính tỉ lệ đỗ</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page grid gap-10 py-12 md:grid-cols-3">
        <div className="space-y-10 md:col-span-2">
          <section>
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
              <Sparkles className="h-5 w-5 text-primary" /> Giới thiệu
            </h2>
            <p className="mt-3 leading-relaxed text-foreground/80">{university.about}</p>
          </section>

          <section>
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
              <Star className="h-5 w-5 text-primary" /> Điểm nổi bật
            </h2>
            <ul className="mt-4 space-y-3">
              {university.highlights.map((highlight) => (
                <li key={highlight} className="flex gap-3 rounded-xl border border-border bg-card p-4">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <span className="text-foreground/80">{highlight}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
              <GraduationCap className="h-5 w-5 text-primary" /> Ngành đào tạo
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Dữ liệu đang dùng để demo frontend. Phase sau có thể chuyển sang Supabase.
            </p>

            {programs.length === 0 ? (
              <div className="mt-4 rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                Chưa cập nhật danh sách ngành cho trường này.
              </div>
            ) : (
              <div className="mt-4 overflow-hidden rounded-2xl border-2 border-border bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead className="bg-muted/40 text-left">
                      <tr className="border-b border-border">
                        <th className="w-12 px-4 py-3 text-center font-semibold">STT</th>
                        <th className="px-4 py-3 font-semibold">Tên ngành</th>
                        <th className="w-28 px-4 py-3 font-semibold">Mã ngành</th>
                        <th className="w-36 px-4 py-3 text-right font-semibold">Điểm chuẩn 2025</th>
                        <th className="w-40 px-4 py-3 text-right font-semibold">Học phí 2025</th>
                      </tr>
                    </thead>
                    <tbody>
                      {programs.map((program, index) => (
                        <tr key={`${program.programCode}-${index}`} className="border-b border-border last:border-0">
                          <td className="px-4 py-3 text-center font-semibold text-muted-foreground">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 font-semibold">
                            {program.majorCode ? (
                              <Link
                                href={`/majorly/${program.majorCode.toLowerCase()}`}
                                className="text-primary underline-offset-2 hover:underline"
                              >
                                {program.name}
                              </Link>
                            ) : (
                              program.name
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                            {program.programCode}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-tier-high">
                            {program.admissionScore2025.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {program.tuitionPerSemester === 0 ? (
                              <span className="text-emerald-600">Miễn phí</span>
                            ) : (
                              <>
                                {program.tuitionPerSemester}{" "}
                                <span className="text-xs font-normal text-muted-foreground">tr/kỳ</span>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border-2 border-border bg-card p-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
              <LinkIcon className="h-3.5 w-3.5" /> Các kênh thông tin chính
            </div>
            <ul className="mt-4 space-y-2">
              {channels.length === 0 && (
                <li className="text-sm text-muted-foreground">Chưa có dữ liệu kênh thông tin.</li>
              )}
              {channels.map((channel) => (
                <li key={channel.url}>
                  <a
                    href={channel.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary/5 hover:text-primary"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <LinkIcon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 truncate">{channel.label}</span>
                    <ExternalLink className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-secondary/10 p-6">
            <div className="text-xs font-bold uppercase tracking-wider text-primary">Bạn đã biết?</div>
            <div className="mt-2 font-display text-lg font-bold">
              Dùng ZPATH để tính tỉ lệ đỗ vào {university.code}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Nhập điểm khảo sát và kết quả SBTI để xem bạn có bao nhiêu cơ hội.
            </p>
            <Button asChild variant="hero" className="mt-4 w-full">
              <Link href="/landing#try">Dùng thử ngay</Link>
            </Button>
          </div>
        </aside>
      </section>
    </div>
  );
}
