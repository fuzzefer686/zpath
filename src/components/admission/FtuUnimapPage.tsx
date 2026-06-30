import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowUpRight,
  BookOpenCheck,
  Building2,
  CircleDollarSign,
  ClipboardList,
  ExternalLink,
  GraduationCap,
  Landmark,
  MapPin,
  Route,
  Search,
  ShieldCheck,
} from "lucide-react";

import { formatVND } from "@/lib/utils";
import { Ad } from "@/components/zpath/Ad";
import { BrandedAdmissionSectionNav } from "./BrandedAdmissionSectionNav";
import type {
  AdmissionInfo,
  AdmissionMethodRecord,
  AdmissionProgram,
  Benchmark,
  School,
  TuitionFee,
} from "@/src/types/admission-data";
import { AdmissionYearSelect } from "./AdmissionYearSelect";
import {
  BenchmarkPanel,
  TuitionPanel,
  type BenchmarkRow,
  type BenchmarkHighlight,
  type TuitionRow,
} from "./AdmissionTables";

// Current admission cycle. Benchmarks for this year are only published ~August,
// so earlier years are shown as last-year reference until then.
const CURRENT_ADMISSION_YEAR = 2026;

// Human labels for admission_method codes (the DB stores codes).
const METHOD_LABELS: Record<string, string> = {
  diem_thi_thpt: "Điểm thi THPT",
  thpt: "Điểm thi THPT",
  hoc_ba: "Xét học bạ",
  hocba: "Xét học bạ",
  dgnl_hn: "ĐGNL ĐHQG HN",
  dgnl_hcm: "ĐGNL ĐHQG HCM",
  dgnl: "Đánh giá năng lực",
  hsa: "ĐGNL ĐHQG HN",
  dg_tu_duy: "Đánh giá tư duy",
  tsa: "Đánh giá tư duy",
  ket_hop: "Kết hợp",
  xt_rieng: "Xét tuyển riêng",
  xttn: "Xét tuyển tài năng",
};

const methodLabel = (code: string) =>
  METHOD_LABELS[(code ?? "").toLowerCase()] ?? code;

type FtuUnimapPageProps = {
  school: School;
  programs: AdmissionProgram[];
  methods: AdmissionMethodRecord[];
  benchmarks: Benchmark[];
  benchmarkPrograms: AdmissionProgram[];
  tuitionFees: TuitionFee[];
  tuitionPrograms: AdmissionProgram[];
  admissionInfo: AdmissionInfo | null;
  selectedProgramYear: number;
  selectedBenchmarkYear: number;
  selectedTuitionYear: number;
  availableYears: readonly number[];
  brand?: BrandedUnimapTheme;
};

export type BrandedUnimapTheme = {
  code: string;
  background: string;
  stickyBackground: string;
  heroFade: string;
  accentText: string;
  accentBg: string;
  accentBorder: string;
  accentSoftBg: string;
  accentTintBg: string;
  accentHoverBg: string;
  navHover: string;
  navActive: string;
  heroOverlay: string;
  badge: string;
  eyebrow: string;
  overviewTitle: string;
  overviewDescription: string;
  descriptionFallback: string;
  emptyFallback: string;
};

export const BRANDED_UNIMAP_THEMES: Record<string, BrandedUnimapTheme> = {
  FTU: {
    code: "FTU",
    background: "bg-[#f7f8fb]",
    stickyBackground: "bg-[#f7f8fb]/90",
    heroFade: "from-[#f7f8fb]",
    accentText: "text-[#b91c1c]",
    accentBg: "bg-[#b91c1c]",
    accentBorder: "border-[#b91c1c]/20",
    accentSoftBg: "bg-[#fff7f7]",
    accentTintBg: "bg-[#b91c1c]/10",
    accentHoverBg: "hover:bg-[#b91c1c]/[0.03]",
    navHover: "hover:border-[#b91c1c]/30 hover:bg-[#b91c1c]/5 hover:text-[#b91c1c]",
    navActive: "border-[#b91c1c] bg-[#b91c1c] text-white",
    heroOverlay:
      "bg-[linear-gradient(115deg,rgba(15,23,42,0.98)_0%,rgba(15,23,42,0.9)_42%,rgba(127,29,29,0.74)_100%)]",
    badge: "border-red-200/20 bg-red-500/15 text-red-100",
    eyebrow: "FTU at a glance",
    overviewTitle: "Nhìn nhanh trước khi chọn nguyện vọng",
    overviewDescription:
      "Các thông tin nhận diện trường và quy mô dữ liệu đang có trong UniMap.",
    descriptionFallback:
      "Thông tin tuyển sinh FTU được tổng hợp thành một trang dễ quét: phương thức, chương trình, điểm chuẩn và học phí.",
    emptyFallback: "UniMap đang cập nhật mô tả chi tiết cho FTU.",
  },
  HUST: {
    code: "HUST",
    background: "bg-[#f8f7f4]",
    stickyBackground: "bg-[#f8f7f4]/90",
    heroFade: "from-[#f8f7f4]",
    accentText: "text-[#c2410c]",
    accentBg: "bg-[#c2410c]",
    accentBorder: "border-[#c2410c]/20",
    accentSoftBg: "bg-[#fff3ed]",
    accentTintBg: "bg-[#c2410c]/10",
    accentHoverBg: "hover:bg-[#c2410c]/[0.035]",
    navHover: "hover:border-[#c2410c]/30 hover:bg-[#c2410c]/5 hover:text-[#c2410c]",
    navActive: "border-[#c2410c] bg-[#c2410c] text-white",
    heroOverlay:
      "bg-[linear-gradient(115deg,rgba(24,24,27,0.98)_0%,rgba(63,23,13,0.88)_46%,rgba(194,65,12,0.72)_100%)]",
    badge: "border-orange-200/20 bg-orange-500/15 text-orange-100",
    eyebrow: "HUST engineering brief",
    overviewTitle: "Đọc nhanh bức tranh kỹ thuật trước khi chọn ngành",
    overviewDescription:
      "Tập trung vào quy mô chương trình, phương thức xét tuyển và các mốc cạnh tranh của Bách Khoa.",
    descriptionFallback:
      "Thông tin tuyển sinh HUST được gom thành một trang dễ quét cho học sinh khối kỹ thuật: phương thức, chương trình, điểm chuẩn và học phí.",
    emptyFallback: "UniMap đang cập nhật mô tả chi tiết cho HUST.",
  },
  NEU: {
    code: "NEU",
    background: "bg-[#f5f8f6]",
    stickyBackground: "bg-[#f5f8f6]/90",
    heroFade: "from-[#f5f8f6]",
    accentText: "text-[#047857]",
    accentBg: "bg-[#047857]",
    accentBorder: "border-[#047857]/20",
    accentSoftBg: "bg-[#ecfdf5]",
    accentTintBg: "bg-[#047857]/10",
    accentHoverBg: "hover:bg-[#047857]/[0.035]",
    navHover: "hover:border-[#047857]/30 hover:bg-[#047857]/5 hover:text-[#047857]",
    navActive: "border-[#047857] bg-[#047857] text-white",
    heroOverlay:
      "bg-[linear-gradient(115deg,rgba(15,23,42,0.98)_0%,rgba(6,78,59,0.9)_48%,rgba(4,120,87,0.72)_100%)]",
    badge: "border-emerald-200/20 bg-emerald-500/15 text-emerald-100",
    eyebrow: "NEU business brief",
    overviewTitle: "Nhìn nhanh hệ sinh thái kinh tế trước khi chọn ngành",
    overviewDescription:
      "Ưu tiên các thông tin giúp so sánh ngành kinh doanh, tài chính, marketing và logistics.",
    descriptionFallback:
      "Thông tin tuyển sinh NEU được gom thành một trang dễ quét cho nhóm ngành kinh tế: phương thức, chương trình, điểm chuẩn và học phí.",
    emptyFallback: "UniMap đang cập nhật mô tả chi tiết cho NEU.",
  },
  UET: {
    code: "UET",
    background: "bg-[#f0f4f8]",
    stickyBackground: "bg-[#f0f4f8]/90",
    heroFade: "from-[#f0f4f8]",
    accentText: "text-[#1d4ed8]",
    accentBg: "bg-[#1d4ed8]",
    accentBorder: "border-[#1d4ed8]/20",
    accentSoftBg: "bg-[#eff6ff]",
    accentTintBg: "bg-[#1d4ed8]/10",
    accentHoverBg: "hover:bg-[#1d4ed8]/[0.035]",
    navHover: "hover:border-[#1d4ed8]/30 hover:bg-[#1d4ed8]/5 hover:text-[#1d4ed8]",
    navActive: "border-[#1d4ed8] bg-[#1d4ed8] text-white",
    heroOverlay:
      "bg-[linear-gradient(115deg,rgba(15,23,42,0.98)_0%,rgba(30,58,138,0.9)_48%,rgba(29,78,216,0.72)_100%)]",
    badge: "border-blue-200/20 bg-blue-500/15 text-blue-100",
    eyebrow: "UET tech brief",
    overviewTitle: "Nhìn nhanh bức tranh công nghệ trước khi chọn ngành",
    overviewDescription:
      "Quy mô chương trình, phương thức xét tuyển và xu hướng điểm tuyển sinh của Đại học Công nghệ.",
    descriptionFallback:
      "Thông tin tuyển sinh UET được tổng hợp thành một trang trực quan cho nhóm ngành kỹ thuật, công nghệ thông tin và điện tử viễn thông: phương thức, chương trình, điểm chuẩn và học phí.",
    emptyFallback: "UniMap đang cập nhật mô tả chi tiết cho UET.",
  },
};

// Neutral theme for every school without a curated identity. Single indigo
// accent, slate base — keeps the HUST layout/structure with brand-agnostic color.
export const DEFAULT_UNIMAP_THEME: BrandedUnimapTheme = {
  code: "DEFAULT",
  background: "bg-[#f6f7f9]",
  stickyBackground: "bg-[#f6f7f9]/90",
  heroFade: "from-[#f6f7f9]",
  accentText: "text-[#4f46e5]",
  accentBg: "bg-[#4f46e5]",
  accentBorder: "border-[#4f46e5]/20",
  accentSoftBg: "bg-[#eef2ff]",
  accentTintBg: "bg-[#4f46e5]/10",
  accentHoverBg: "hover:bg-[#4f46e5]/[0.03]",
  navHover: "hover:border-[#4f46e5]/30 hover:bg-[#4f46e5]/5 hover:text-[#4f46e5]",
  navActive: "border-[#4f46e5] bg-[#4f46e5] text-white",
  heroOverlay:
    "bg-[linear-gradient(115deg,rgba(15,23,42,0.98)_0%,rgba(30,27,75,0.9)_48%,rgba(79,70,229,0.7)_100%)]",
  badge: "border-indigo-200/20 bg-indigo-500/15 text-indigo-100",
  eyebrow: "Tổng quan tuyển sinh",
  overviewTitle: "Nhìn nhanh trước khi chọn nguyện vọng",
  overviewDescription:
    "Thông tin nhận diện trường và quy mô dữ liệu tuyển sinh đang có trong UniMap.",
  descriptionFallback:
    "Thông tin tuyển sinh được tổng hợp thành một trang dễ quét: phương thức, chương trình, điểm chuẩn và học phí.",
  emptyFallback: "UniMap đang cập nhật mô tả chi tiết cho trường này.",
};

// Resolve the theme for any school: curated brands keep their identity, the
// rest use the neutral default.
export function getUnimapTheme(code: string): BrandedUnimapTheme {
  return BRANDED_UNIMAP_THEMES[(code ?? "").toUpperCase()] ?? DEFAULT_UNIMAP_THEME;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatNullableNumber(value: number | null | undefined) {
  return value === null || value === undefined ? "Đang cập nhật" : formatNumber(value);
}

function formatScore(score: number, scale: number | null) {
  if (score === 0) return "Đang cập nhật";
  return `${score.toFixed(2).replace(/\.00$/, "")}/${scale ?? 30}`;
}

// Tuition is stored in mixed units: pipeline rows are in MILLIONS of VND with
// unit "triệu/năm"; curated/fallback rows are raw VND. Format by the unit so we
// never render "35₫" for a 35-million-VND fee.
function feeIsMillions(unit: string | null | undefined) {
  const u = (unit ?? "").toLowerCase();
  return u.includes("triệu") || u.includes("trieu");
}

function feePeriod(unit: string | null | undefined) {
  const u = (unit ?? "").toLowerCase();
  if (u.includes("năm") || u.includes("nam")) return "/năm";
  if (u.includes("kỳ") || u.includes("ky")) return "/học kỳ";
  if (u.includes("tháng") || u.includes("thang")) return "/tháng";
  if (u.includes("tín") || u.includes("tin")) return "/tín chỉ";
  return "";
}

function feeValue(value: number, unit: string | null | undefined) {
  return feeIsMillions(unit) ? `${formatNumber(value)} triệu` : formatVND(value);
}

// Money only (no period suffix) — for the summary strips.
function formatFeeRange(fee: TuitionFee) {
  if (fee.currency && fee.currency !== "VND") {
    const min = fee.min_fee ?? 0;
    const max = fee.max_fee ?? min;
    return min === max ? `${min} ${fee.currency}` : `${min} - ${max} ${fee.currency}`;
  }

  if (fee.min_fee === null && fee.max_fee === null) return "Chưa công bố";
  if (fee.min_fee !== null && fee.max_fee !== null && fee.min_fee !== fee.max_fee) {
    return `${feeValue(fee.min_fee, fee.unit)} - ${feeValue(fee.max_fee, fee.unit)}`;
  }
  return feeValue(fee.min_fee ?? fee.max_fee ?? 0, fee.unit);
}

function getTuitionBounds(tuitionFees: TuitionFee[]) {
  const values = tuitionFees
    .flatMap((fee) => [fee.min_fee, fee.max_fee])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (!values.length) return null;

  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function createProgramMap(programs: AdmissionProgram[]) {
  return new Map(programs.map((program) => [program.id, program]));
}

function getProgramLabel(
  programById: Map<string, AdmissionProgram>,
  programId: string | null,
) {
  if (!programId) return "Thông tin chung";
  const program = programById.get(programId);
  if (!program) return "Thông tin chung";

  return program.program_code
    ? `${program.program_code} - ${program.program_name}`
    : program.program_name;
}

function StatTile({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-white shadow-[0_20px_80px_-40px_rgba(0,0,0,0.65)] backdrop-blur">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
        {label}
      </div>
      <div className="mt-2 font-display text-3xl font-extrabold leading-none">{value}</div>
      <div className="mt-2 text-xs leading-5 text-white/70">{note}</div>
    </div>
  );
}

function SectionShell({
  id,
  eyebrow,
  title,
  description,
  action,
  accentText,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  accentText: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-slate-200 py-10">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className={`text-xs font-bold uppercase tracking-[0.18em] ${accentText}`}>
            {eyebrow}
          </div>
          <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-slate-950 md:text-3xl">
            {title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function InfoStrip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          {label}
        </div>
        <div className="mt-1 text-sm font-semibold leading-5 text-slate-900">{value}</div>
      </div>
    </div>
  );
}

export function FtuUnimapPage({
  school,
  programs,
  methods,
  benchmarks,
  benchmarkPrograms,
  tuitionFees,
  tuitionPrograms,
  admissionInfo,
  selectedProgramYear,
  selectedBenchmarkYear,
  selectedTuitionYear,
  availableYears,
  brand,
}: FtuUnimapPageProps) {
  const theme = brand ?? BRANDED_UNIMAP_THEMES.FTU;
  const benchmarkProgramById = createProgramMap(benchmarkPrograms);
  const tuitionProgramById = createProgramMap(tuitionPrograms);
  const tuitionBounds = getTuitionBounds(tuitionFees);
  const totalQuota = programs.reduce((sum, program) => sum + (program.quota ?? 0), 0);
  const activeMethods = methods.filter((method) => method.is_active !== false);

  // Serializable rows for the searchable client tables (formatting done here so
  // no internal fields — notes, data_confidence — reach the user).
  const benchmarkRows: BenchmarkRow[] = benchmarks.map((b) => {
    const program = getProgramLabel(benchmarkProgramById, b.program_id);
    const method = methodLabel(b.method_code);
    const combo = b.combination_code ?? "-";
    const scoreText = formatScore(b.score, b.scale);
    return {
      id: b.id,
      program,
      method,
      combo,
      scoreText,
      searchText: `${program} ${method} ${combo} ${scoreText}`.toLowerCase(),
    };
  });

  const topThpt = benchmarks
    .filter((b) => b.method_code === "diem_thi_thpt" && b.score > 0)
    .sort((a, b) => b.score - a.score)[0];
  const benchmarkHighlight: BenchmarkHighlight | null = topThpt
    ? {
        scoreText: formatScore(topThpt.score, topThpt.scale),
        program: getProgramLabel(benchmarkProgramById, topThpt.program_id),
        combo: topThpt.combination_code,
      }
    : null;

  const tuitionRows: TuitionRow[] = tuitionFees.map((f) => {
    const program = getProgramLabel(tuitionProgramById, f.program_id);
    const feeText = formatFeeRange(f);
    return {
      id: f.id,
      program,
      feeText,
      period: feePeriod(f.unit),
      searchText: `${program} ${feeText}`.toLowerCase(),
    };
  });

  const benchmarkReferenceNote =
    selectedBenchmarkYear < CURRENT_ADMISSION_YEAR
      ? `Điểm chuẩn ${selectedBenchmarkYear} dùng để tham khảo. Điểm chuẩn ${CURRENT_ADMISSION_YEAR} thường công bố vào tháng 8.`
      : null;

  return (
    <main className={`min-h-screen ${theme.background} text-slate-950`}>
      <section className="relative overflow-hidden bg-slate-950">
        {school.hero_image_url ? (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-35"
            style={{ backgroundImage: `url(${school.hero_image_url})` }}
          />
        ) : null}
        <div className={`absolute inset-0 ${theme.heroOverlay}`} />
        <div className={`absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t ${theme.heroFade} to-transparent`} />

        <div className="container-page relative py-12 md:py-16">
          <Link
            href="/unimap"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/80 backdrop-blur transition-colors hover:bg-white/15 hover:text-white"
          >
            <ArrowUpRight className="h-4 w-4 rotate-180" />
            UniMap
          </Link>

          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
            <div>
              {school.logo_url ? (
                <div className="mb-5 inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white p-2.5 shadow-lg ring-1 ring-white/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={school.logo_url}
                    alt={`Logo ${school.short_name ?? school.name}`}
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : null}
              <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] ${theme.badge}`}>
                <Landmark className="h-4 w-4" />
                {school.short_name ?? school.code}
              </div>
              <h1 className="mt-5 max-w-4xl font-display text-4xl font-extrabold leading-[1.04] tracking-tight text-white md:text-6xl">
                {school.name}
              </h1>
              {school.english_name ? (
                <p className="mt-3 text-lg font-medium text-white/70">{school.english_name}</p>
              ) : null}
              <p className="mt-5 max-w-3xl text-base leading-7 text-white/75 md:text-lg">
                {school.description ?? theme.descriptionFallback}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {school.website ? (
                  <a
                    href={school.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-bold text-slate-950 transition-transform hover:-translate-y-0.5"
                  >
                    Website tuyển sinh
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}
                <a
                  href="#programs"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-white/15"
                >
                  Xem chương trình
                  <Route className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <StatTile
                label="Chương trình"
                value={formatNumber(programs.length)}
                note={`Dữ liệu năm ${selectedProgramYear}`}
              />
              <StatTile
                label="Điểm chuẩn"
                value={formatNumber(benchmarks.length)}
                note={`Bản ghi năm ${selectedBenchmarkYear}`}
              />
              <StatTile
                label="Học phí"
                value={formatNumber(tuitionFees.length)}
                note={`Dòng dữ liệu năm ${selectedTuitionYear}`}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="container-page pt-6">
        <Ad placement="unimapDetail" className="mx-auto max-w-3xl" />
      </div>

      <div className="container-page grid gap-8 pb-16 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
        <aside className="sticky top-4 z-20 pt-6 lg:pt-10">
          <BrandedAdmissionSectionNav
            hoverClass={theme.navHover}
            activeClass={theme.navActive}
            items={[
              { href: "#overview", label: "Tổng quan" },
              { href: "#admission-info", label: "Tuyển sinh" },
              { href: "#programs", label: "Chương trình" },
              { href: "#benchmarks", label: "Điểm chuẩn" },
              { href: "#tuition", label: "Học phí" },
            ]}
          />
        </aside>

        <div className="min-w-0">
          <SectionShell
            id="overview"
            eyebrow={theme.eyebrow}
            title={theme.overviewTitle}
            description={theme.overviewDescription}
            accentText={theme.accentText}
          >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoStrip icon={Building2} label="Loại hình" value={school.type ?? "Đang cập nhật"} />
            <InfoStrip icon={MapPin} label="Khu vực" value={school.city ?? "Đang cập nhật"} />
            <InfoStrip
              icon={GraduationCap}
              label="Tổng chỉ tiêu"
              value={formatNullableNumber(admissionInfo?.total_quota ?? (totalQuota || null))}
            />
            <InfoStrip
              icon={ShieldCheck}
              label="Phạm vi tuyển sinh"
              value={admissionInfo?.admission_scope ?? "Đang cập nhật"}
            />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <h3 className="font-display text-xl font-extrabold text-slate-950">
                Mô tả tuyển sinh
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {admissionInfo?.notes ??
                  school.description ??
                  theme.emptyFallback}
              </p>
              {school.address || school.source_url ? (
                <div className="mt-5 grid gap-3 text-sm text-slate-600">
                  {school.address ? <p>Địa chỉ: {school.address}</p> : null}
                  {school.source_url ? (
                    <a
                      href={school.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className={`inline-flex items-center gap-2 font-semibold ${theme.accentText}`}
                    >
                      Nguồn dữ liệu
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className={`rounded-3xl border ${theme.accentBorder} ${theme.accentSoftBg} p-6`}>
              <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${theme.accentBg} text-white`}>
                <ClipboardList className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-xl font-extrabold text-slate-950">
                Cách đọc trang này
              </h3>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                <li>Chọn năm ở từng section nếu muốn xem dữ liệu khác nhau theo chương trình, điểm chuẩn hoặc học phí.</li>
                <li>Điểm chuẩn được ghép với mã chương trình khi dữ liệu có `program_id` tương ứng.</li>
                <li>Học phí hiển thị theo khoảng min-max nếu trường công bố nhiều mức.</li>
              </ul>
            </div>
          </div>
          </SectionShell>

          <SectionShell
            id="admission-info"
            eyebrow="Admission brief"
            title="Phương thức và mốc tuyển sinh"
            description="Tách phần phương thức khỏi bảng chương trình để dễ hiểu hơn khi đọc đề án tuyển sinh."
            accentText={theme.accentText}
            action={
              <AdmissionYearSelect
                selectedYear={selectedProgramYear}
                years={availableYears}
                paramName="programYear"
              />
            }
          >
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Năm {selectedProgramYear}
              </div>
              <div className="mt-4 space-y-4">
                <BriefRow label="Tổng chỉ tiêu" value={formatNullableNumber(admissionInfo?.total_quota)} />
                <BriefRow label="Phạm vi" value={admissionInfo?.admission_scope ?? "Đang cập nhật"} />
                <BriefRow label="Thời gian đăng ký" value={admissionInfo?.application_timeline ?? "Đang cập nhật"} />
                <BriefRow label="Điều kiện" value={admissionInfo?.eligibility ?? "Đang cập nhật"} />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {activeMethods.length ? (
                activeMethods.map((method) => (
                  <div key={method.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className={`inline-flex rounded-full ${theme.accentTintBg} px-3 py-1 text-xs font-bold ${theme.accentText}`}>
                      {method.method_code}
                    </div>
                    <h3 className="mt-3 text-base font-extrabold leading-6 text-slate-950">
                      {method.method_name}
                    </h3>
                    {method.description ? (
                      <p className="mt-2 text-sm leading-6 text-slate-600">{method.description}</p>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
                  Chưa có phương thức tuyển sinh cho năm {selectedProgramYear}.
                </div>
              )}
            </div>
          </div>
          </SectionShell>

          <SectionShell
            id="programs"
            eyebrow="Programs"
            title="Chương trình tuyển sinh"
            description="Danh sách chương trình được làm thoáng hơn, ưu tiên mã xét tuyển, tên chương trình và chỉ tiêu."
            accentText={theme.accentText}
            action={
              <AdmissionYearSelect
                selectedYear={selectedProgramYear}
                years={availableYears}
                paramName="programYear"
              />
            }
          >
          {programs.length ? (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
              <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
                <Search className="h-4 w-4 text-slate-400" />
                <p className="text-sm font-medium text-slate-500">
                  {formatNumber(programs.length)} chương trình năm {selectedProgramYear}
                </p>
              </div>
              <div className="max-h-[760px] overflow-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="sticky top-0 z-10 border-b border-slate-200 bg-white text-xs uppercase tracking-[0.14em] text-slate-400">
                    <tr>
                      <th className="w-36 px-5 py-4">Mã</th>
                      <th className="px-5 py-4">Chương trình</th>
                      <th className="w-56 px-5 py-4">Ngành</th>
                      <th className="w-28 px-5 py-4 text-right">Chỉ tiêu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {programs.map((program) => (
                      <tr key={program.id} className={`align-top transition-colors ${theme.accentHoverBg}`}>
                        <td className="px-5 py-4 font-display text-base font-extrabold text-slate-950">
                          {program.program_code ?? "-"}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold leading-6 text-slate-950">
                            {program.program_name}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {program.degree_level ?? "Đại học"} · {program.training_type ?? "Chính quy"}
                          </div>
                        </td>
                        <td className="px-5 py-4 leading-6 text-slate-600">
                          {program.major_name ?? program.major_code ?? "-"}
                        </td>
                        <td className="px-5 py-4 text-right font-bold tabular-nums text-slate-950">
                          {program.quota ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyPanel text={`Chưa có dữ liệu chương trình cho năm ${selectedProgramYear}.`} />
          )}
          </SectionShell>

          <SectionShell
            id="benchmarks"
            eyebrow="Benchmarks"
            title="Điểm chuẩn tham khảo"
            description="Phần điểm chuẩn tách riêng top điểm cao và bảng đầy đủ để học sinh nhanh chóng xác định mức cạnh tranh."
            accentText={theme.accentText}
            action={
              <AdmissionYearSelect
                selectedYear={selectedBenchmarkYear}
                years={availableYears}
                paramName="benchmarkYear"
              />
            }
          >
          {benchmarks.length ? (
            <BenchmarkPanel
              highlight={benchmarkHighlight}
              highlightLabel={`Điểm THPT cao nhất ${selectedBenchmarkYear}`}
              rows={benchmarkRows}
              accentText={theme.accentText}
              accentTintBg={theme.accentTintBg}
              accentHoverBg={theme.accentHoverBg}
              referenceNote={benchmarkReferenceNote}
            />
          ) : (
            <div className="space-y-4">
              {benchmarkReferenceNote ? (
                <p className="rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800">
                  {benchmarkReferenceNote}
                </p>
              ) : null}
              <EmptyPanel
                text={
                  selectedBenchmarkYear >= CURRENT_ADMISSION_YEAR
                    ? `Điểm chuẩn ${selectedBenchmarkYear} chưa công bố. Chọn năm trước để xem điểm chuẩn tham khảo.`
                    : `Chưa có dữ liệu điểm chuẩn cho năm ${selectedBenchmarkYear}.`
                }
              />
            </div>
          )}
          </SectionShell>

          <SectionShell
            id="tuition"
            eyebrow="Tuition"
            title="Học phí theo chương trình"
            description="Hiển thị khoảng học phí theo chương trình để phụ huynh và học sinh dễ so sánh trước khi chốt nguyện vọng."
            accentText={theme.accentText}
            action={
              <AdmissionYearSelect
                selectedYear={selectedTuitionYear}
                years={availableYears}
                paramName="tuitionYear"
              />
            }
          >
          <div className="mb-5 grid gap-4 md:grid-cols-3">
            <InfoStrip
              icon={CircleDollarSign}
              label="Thấp nhất"
              value={tuitionBounds ? feeValue(tuitionBounds.min, tuitionFees[0]?.unit) : "Đang cập nhật"}
            />
            <InfoStrip
              icon={CircleDollarSign}
              label="Cao nhất"
              value={tuitionBounds ? feeValue(tuitionBounds.max, tuitionFees[0]?.unit) : "Đang cập nhật"}
            />
            <InfoStrip
              icon={BookOpenCheck}
              label="Số chương trình"
              value={`${formatNumber(tuitionFees.length)} chương trình`}
            />
          </div>

          {tuitionFees.length ? (
            <TuitionPanel
              rows={tuitionRows}
              accentText={theme.accentText}
              accentHoverBg={theme.accentHoverBg}
            />
          ) : (
            <EmptyPanel text={`Chưa có dữ liệu học phí cho năm ${selectedTuitionYear}.`} />
          )}
          </SectionShell>
        </div>
      </div>
    </main>
  );
}

function BriefRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-slate-100 pt-4 first:border-t-0 first:pt-0">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold leading-6 text-slate-900">{value}</div>
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-medium text-slate-500">
      {text}
    </div>
  );
}
