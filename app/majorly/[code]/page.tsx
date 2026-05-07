import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  GraduationCap,
  Layers,
  TrendingUp,
  Trophy,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatVND } from "@/lib/utils";
import { supabase } from "@/app/lib/supabase";
import type { Major, Program } from "@/types/majorly";

interface MajorDetailPageProps {
  params: Promise<{
    code: string;
  }>;
}

export async function generateStaticParams() {
  const { data } = await supabase.from("majors").select("code");
  if (!data) return [];
  return data.map((major) => ({
    code: major.code.toLowerCase(),
  }));
}

export async function generateMetadata({ params }: MajorDetailPageProps) {
  const { code } = await params;
  const { data: major } = await supabase.from("majors").select("name").eq("code", code).maybeSingle();

  return {
    title: major ? `${major.name} - Majorly` : "Không tìm thấy ngành",
  };
}

export default async function MajorDetailPage({ params }: MajorDetailPageProps) {
  const { code } = await params;
  
  const { data: majorData } = await supabase.from("majors").select("*").eq("code", code).maybeSingle();
  const major = majorData as Major | null;

  if (!major) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container-page py-20 text-center">
          <h1 className="font-display text-3xl font-bold">Không tìm thấy ngành</h1>
          <Button asChild variant="hero" className="mt-6">
            <Link href="/majorly">Về Majorly</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { data: programsData } = await supabase.from("programs").select("*").eq("major_id", major.id);
  const programs = (programsData ?? []) as Program[];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden bg-gradient-to-br from-accent/15 via-background to-primary/10 py-14">
        <div className="container-page">
          <Link
            href="/majorly"
            className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại Majorly
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent">
            {major.category}
          </div>
          <h1 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">{major.name}</h1>
          <p className="mt-3 max-w-3xl text-base text-muted-foreground">{major.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(major.tags ?? []).map((tag) => (
              <span key={tag} className="rounded-full border-2 border-border bg-background px-3 py-1 text-xs font-bold">
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-6">
            <Button asChild variant="hero">
              <Link href="/majorly/compare">
                <Layers className="h-4 w-4" /> So sánh với ngành khác
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              {programs.length} trường đào tạo {major.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              Học phí, tỉ lệ có việc, lương khởi điểm và chương trình đào tạo.
            </p>
          </div>
        </div>

        {programs.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border bg-muted/30 py-16 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Chưa có trường nào trong dữ liệu cho ngành này.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {programs.map((program) => (
              <article
                key={program.id}
                className="overflow-hidden rounded-3xl border-2 border-border bg-card p-6 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-primary">
                      {program.university_code}
                    </div>
                    <h3 className="mt-1 font-display text-xl font-bold">{program.university_name}</h3>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/unimap/${program.university_code?.toLowerCase()}`}>Xem trường</Link>
                  </Button>
                </div>

                <p className="mt-2 text-sm text-muted-foreground">{program.description}</p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Stat icon={Wallet} label="Học phí/năm" value={formatVND(program.tuition_per_year)} />
                  <Stat icon={Clock} label="Thời gian" value={`${program.duration_years} năm`} />
                  <Stat icon={TrendingUp} label="Tỉ lệ có việc" value={`${program.employment_rate}%`} highlight />
                  <Stat icon={Trophy} label="Lương khởi điểm" value={formatVND(program.avg_starting_salary)} />
                  <Stat
                    icon={GraduationCap}
                    label="Điểm chuẩn"
                    value={program.admission_score?.toFixed(2)}
                    className="col-span-2"
                  />
                </div>

                {program.curriculum_highlights && program.curriculum_highlights.length > 0 && (
                  <div className="mt-5">
                    <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Môn học nổi bật
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {program.curriculum_highlights.map((highlight) => (
                        <span key={highlight} className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
                          {highlight}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  highlight,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-background p-3 ${className ?? ""}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className={`mt-1 font-display text-lg font-bold ${highlight ? "text-tier-high" : ""}`}>{value}</div>
    </div>
  );
}
