import Link from "next/link";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Database,
  ExternalLink,
  FlaskConical,
  GraduationCap,
  History,
  Info,
  MapPinOff,
  Ruler,
  Settings2,
  ShieldCheck,
  Target,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  FTU_ROWS,
  NEU_ROWS,
  type ConfidenceTag,
} from "@/lib/score-prediction-2026";
import {
  HUST_ROWS_V2,
  SCORE_2026_V2_UPDATED_AT,
  TQ_CANDIDATES_REMOVED,
} from "@/lib/score-prediction-2026-v2";

/**
 * UPDATED edition of the /du-doan-2026 article (v2, 2026-07-04).
 *
 * Same structure as the original (now archived at /du-doan-2026-2) with new
 * data: the HUST table covers ALL 60 predictable programs (benchmark extended
 * + 2023 scores ingested), and two new sections document the 2023 backtest
 * validation and the Tuyen Quang exclusion check. FTU/NEU tables are carried
 * over unchanged — no new data for those schools.
 */

/** Maps a confidence tag to a colour-coded badge class. */
const confidenceBadgeClass = (tag: ConfidenceTag): string => {
  switch (tag) {
    case "Rất cao":
    case "Cao":
      return "bg-secondary/15 text-secondary-foreground ring-1 ring-secondary/30";
    case "Khá cao":
    case "Khá":
      return "bg-primary/10 text-primary ring-1 ring-primary/20";
    case "Trung bình":
      return "bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/30 dark:text-amber-300";
    default:
      // Thấp / Thận trọng — highest uncertainty.
      return "bg-destructive/15 text-destructive ring-1 ring-destructive/30";
  }
};

const ConfidenceBadge = ({ tag }: { tag: ConfidenceTag }) => (
  <span
    className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${confidenceBadgeClass(tag)}`}
  >
    {tag}
  </span>
);

/** Shared table shell: horizontally scrollable on mobile, glassy card frame. */
const TableCard = ({ children }: { children: React.ReactNode }) => (
  <div className="overflow-hidden rounded-[1.25rem] border border-border bg-card shadow-sm">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm">{children}</table>
    </div>
  </div>
);

const thBase =
  "sticky top-0 bg-muted/80 px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground backdrop-blur";
const tdBase = "border-t border-border px-3 py-3 align-top";

const CONFIG_ITEMS = [
  {
    icon: Settings2,
    term: "Ưu tiên = none",
    plain: "Không cộng điểm ưu tiên khu vực/đối tượng. Điểm dự đoán là điểm \"gốc\", bạn tự cộng thêm phần ưu tiên của mình để so cho đúng.",
  },
  {
    icon: Settings2,
    term: "Quota = off",
    plain: "Không tách riêng phần chỉ tiêu xét tuyển sớm/ưu tiên. Mô hình coi cả ngành như một rổ chung để dự đoán mức điểm chung nhất.",
  },
  {
    icon: CalendarDays,
    term: "N neo / giữ nguyên từ 2025",
    plain: "Số chỉ tiêu (N) được lấy bằng năm 2025. Nếu trường thay đổi chỉ tiêu năm 2026, điểm thực tế có thể lệch — các ngành đổi chỉ tiêu lớn đã được ghi chú riêng trong bảng.",
  },
  {
    icon: Ruler,
    term: "Biên sai số ± (MAE ngành)",
    plain: "MAE là sai số trung bình mô hình từng mắc ở ngành đó khi kiểm chứng trên các năm đã biết. Số càng nhỏ, dự đoán càng đáng tin.",
  },
  {
    icon: Target,
    term: "Khoảng dự đoán [cận dưới – cận trên]",
    plain: "Điểm thật nhiều khả năng rơi vào khoảng này, chứ không phải đúng một con số. Ngành có khoảng hẹp thì chắc ăn hơn ngành có khoảng rộng.",
  },
  {
    icon: BarChart3,
    term: "Thang điểm 30 và 40",
    plain: "Một số ngành FTU (ví dụ Ngôn ngữ Anh, có môn nhân hệ số) chấm trên thang 40. Không so trực tiếp điểm thang 40 với thang 30.",
  },
];

export function ScorePrediction2026ArticleV2() {
  return (
    <main className="relative overflow-x-hidden bg-card text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-mesh opacity-50" />
      <div className="pointer-events-none absolute inset-0 grid-dots opacity-20" />

      <article className="container-page relative py-8 sm:py-12">
        {/* ---------- Header ---------- */}
        <header className="mx-auto max-w-3xl animate-fade-up text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/80 px-4 py-1.5 text-xs font-bold text-primary">
            <BarChart3 className="h-3.5 w-3.5" />
            Dự đoán mùa tuyển sinh 2026 — bản cập nhật
          </span>
          <h1 className="mt-5 font-display text-3xl font-bold leading-tight sm:text-5xl">
            Dự đoán điểm chuẩn 2026: Bách khoa HN, Ngoại thương &amp; Kinh tế Quốc dân
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
            Bản cập nhật lớn: bảng HUST mở rộng ra <strong>toàn bộ 60 chương trình</strong>, bổ sung
            dữ liệu điểm thi 2023 để kiểm chứng hai chiều, và kiểm tra độc lập nghi vấn điểm thi
            Tuyên Quang.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            Cập nhật {SCORE_2026_V2_UPDATED_AT}
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild variant="hero" size="lg">
              <a href="#bang-diem-hust">
                Xem điểm ngay
                <ArrowDown className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/du-doan-2026-2">
                <History className="h-4 w-4" />
                Bài dự đoán trước đó
              </Link>
            </Button>
          </div>
        </header>

        {/* ---------- Disclaimer ---------- */}
        <div className="mx-auto mt-8 max-w-3xl rounded-[1.25rem] border border-amber-500/40 bg-amber-500/10 p-5">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm leading-6 text-foreground/90">
              <strong className="font-bold">Đây là điểm DỰ ĐOÁN, không phải điểm chính thức.</strong>{" "}
              Các con số dưới đây do mô hình của ZPath ước lượng dựa trên dữ liệu quá khứ, chỉ mang
              tính tham khảo. Với ngành sát nút, hãy cộng/trừ thêm biên an toàn và theo dõi thông báo
              chính thức của từng trường.
            </p>
          </div>
        </div>

        {/* ---------- What's new ---------- */}
        <section className="mx-auto mt-12 max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/15 text-secondary-foreground">
              <FlaskConical className="h-5 w-5" />
            </span>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Có gì mới trong bản cập nhật này
            </h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.25rem] border border-border bg-background/60 p-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                <h3 className="font-display text-base font-bold">Bổ sung điểm thi 2023 (HUST)</h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Trước đây dữ liệu thiếu năm 2023 nên mô hình chỉ kiểm chứng được một chiều
                (2024→2025). Nay đã nạp hơn <strong className="text-foreground">1 triệu điểm thi
                2023</strong> cùng điểm chuẩn 60 ngành HUST, mở thêm phép kiểm chứng
                2023→2024 với sai số trung bình chỉ{" "}
                <strong className="text-foreground">0.64 điểm trên 60 ngành</strong>. Nhiều ngành
                giờ được xác nhận sai số từ <em>hai phía độc lập</em> — ví dụ IT-E10 lệch +0.63 ở
                cặp 2023→2024 và −0.64 ở cặp 2024→2025, đúng bằng biên ±0.64 công bố.
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-border bg-background/60 p-4">
              <div className="flex items-center gap-2">
                <MapPinOff className="h-4 w-4 text-primary" />
                <h3 className="font-display text-base font-bold">Kiểm chứng nghi vấn Tuyên Quang</h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Trước nghi vấn bất thường điểm thi tại Tuyên Quang, chúng tôi chạy lại toàn bộ dự
                đoán sau khi <strong className="text-foreground">loại thử toàn bộ{" "}
                {TQ_CANDIDATES_REMOVED.toLocaleString("vi-VN")} thí sinh</strong> của tỉnh khỏi phổ
                điểm 2026 (kịch bản cực đoan nhất). Kết quả: nhóm ngành điểm cao{" "}
                <strong className="text-foreground">không đổi một ngành nào</strong>; chỉ 11/61
                ngành đuôi thấp lệch tối đa 0.10 điểm — nhỏ hơn nhiều lần biên sai số. Bảng dự đoán
                vì vậy <strong className="text-foreground">không bị ảnh hưởng</strong> dù nghi vấn
                đúng hay sai.
              </p>
            </div>
          </div>
        </section>

        {/* ---------- Method ---------- */}
        <section className="mx-auto mt-12 max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Phương pháp dự đoán</h2>
          </div>
          <div className="mt-5 space-y-4 text-[15px] leading-7 text-foreground/90">
            <p>
              Cốt lõi là ý tưởng &ldquo;cùng thứ hạng thì cùng cơ hội&rdquo;. Nói đơn giản: chúng tôi lấy{" "}
              <strong>điểm chuẩn 2025</strong> của một ngành, xem mức điểm đó tương ứng với bao nhiêu
              thí sinh đủ điểm — tức nó nằm ở <strong>thứ hạng (rank)</strong> nào, quy ra{" "}
              <strong>phần trăm (%)</strong> trong toàn bộ thí sinh năm 2025. Sang 2026, phổ điểm khác
              đi, ta tìm mức điểm ứng với đúng phần trăm đó để suy ra điểm chuẩn 2026.
            </p>
            <div className="rounded-[1.25rem] border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-bold">
                Ví dụ thật — ngành IT1 (Khoa học Máy tính, HUST):
              </p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-6">
                <li>
                  Điểm chuẩn IT1 năm 2025 là <strong>29.19</strong>. Soi vào phổ điểm 2025 (tổ hợp
                  A00/A01, Toán hệ số 2): cả nước có đúng <strong>173 thí sinh</strong> đạt từ mức
                  này trở lên — tức điểm chuẩn nằm ở <strong>hạng 173</strong>, tốp ~0.04%.
                </li>
                <li>
                  Sang phổ điểm 2026, tìm mức điểm mà cũng có đúng <strong>173 thí sinh</strong> đạt
                  từ đó trở lên → ra <strong>29.25</strong>. Đó chính là điểm dự đoán IT1 trong bảng.
                </li>
                <li>
                  Khi kiểm chứng ngược trên các năm đã biết, IT1 chỉ lệch trung bình{" "}
                  <strong>0.06 điểm</strong> → khoảng dự đoán công bố là{" "}
                  <strong>29.19 – 29.31</strong>.
                </li>
              </ol>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Phương pháp này có tên khoa học là <strong>Equipercentile equating</strong> — bạn có
                thể tra cứu thêm nếu muốn tìm hiểu sâu.
              </p>
            </div>
            <p>
              Với mỗi ngành, thay vì đưa ra một con số &ldquo;cứng&rdquo;, mô hình đưa ra một{" "}
              <strong>khoảng dự đoán</strong> (cận dưới – cận trên). Độ rộng của khoảng đến từ{" "}
              <strong>biên sai số (MAE)</strong> — sai số trung bình mô hình từng mắc ở ngành đó. Để
              kiểm chứng, chúng tôi <strong>backtest</strong>: dùng dữ liệu các năm trước dự đoán điểm
              một năm đã biết rồi so với thực tế. Với dữ liệu 2023 mới bổ sung, phần lớn ngành HUST
              nay được kiểm chứng trên <strong>hai cặp năm độc lập</strong> (2023→2024 và 2024→2025).
            </p>
            <p>
              Tất cả bảng dưới đây đều chạy trên cùng một kịch bản để so sánh công bằng:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-sm">ưu tiên = none</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-sm">quota = off</code>, và số chỉ
              tiêu <code className="rounded bg-muted px-1.5 py-0.5 text-sm">N</code> neo từ 2025.
            </p>
            <p className="border-l-2 border-primary/30 pl-3 text-sm italic text-muted-foreground">
              Lưu ý: vì số lượng tuyển thực tế của một ngành có thể lệch so với chỉ tiêu được công bố,
              chúng tôi đã áp dụng sai số <strong className="not-italic">±10%</strong> cho chỉ tiêu của
              từng ngành khi ước lượng khoảng dự đoán.
            </p>
            <p className="border-l-2 border-primary/30 pl-3 text-sm italic text-muted-foreground">
              Lưu ý: điểm dự đoán là <strong className="not-italic">điểm thuần từ kỳ thi tốt nghiệp
              THPT</strong>, không bao gồm điểm quy đổi từ chứng chỉ tiếng Anh (IELTS, TOEFL…) hay các
              phương thức xét tuyển khác.
            </p>
          </div>

          {/* Data source */}
          <div className="mt-6 rounded-[1.25rem] border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <h3 className="font-display text-base font-bold">Dữ liệu sử dụng</h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Mô hình dựa trên điểm chuẩn và phổ điểm các năm{" "}
              <strong className="text-foreground">2021–2026 (nay đã đủ cả 2023)</strong>. Dữ liệu công
              khai được lấy từ kho{" "}
              <a
                href="https://github.com/ngocminhta/GraduationExamScoreProcessing"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
              >
                GraduationExamScoreProcessing
                <ExternalLink className="h-3.5 w-3.5" />
              </a>{" "}
              của tác giả <strong className="text-foreground">Tạ Ngọc Minh</strong>. Xin chân thành
              cảm ơn tác giả đã chia sẻ dữ liệu.
            </p>
          </div>
        </section>

        {/* ---------- Config glossary ---------- */}
        <section className="mx-auto mt-12 max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <Info className="h-5 w-5" />
            </span>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Hiểu các thông số trong 1 phút
            </h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {CONFIG_ITEMS.map(({ icon: Icon, term, plain }) => (
              <div
                key={term}
                className="rounded-[1.25rem] border border-border bg-background/60 p-4"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <h3 className="font-display text-base font-bold">{term}</h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{plain}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- HUST (full) ---------- */}
        <section id="bang-diem-hust" className="mx-auto mt-14 max-w-5xl scroll-mt-24">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-6 w-6 text-primary" />
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Đại học Bách khoa Hà Nội (HUST) — toàn bộ 60 chương trình
            </h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Thang 30, xếp theo điểm dự đoán giảm dần. Không gồm ngành mở mới 2026 (chưa có lịch sử
            điểm), nhóm ngôn ngữ FL và chương trình Troy (phương pháp không áp dụng được). Ngành có
            thay đổi chỉ tiêu 2026 mang thêm ghi chú <em>&ldquo;kịch bản chỉnh chỉ tiêu&rdquo;</em> — mức điểm
            nếu toàn bộ phần chỉ tiêu tăng/giảm dồn vào kênh điểm thi THPT.
          </p>
          <div className="mt-4">
            <TableCard>
              <thead>
                <tr>
                  <th className={thBase}>Ngành</th>
                  <th className={thBase}>Điểm dự đoán</th>
                  <th className={thBase}>Sai số ±</th>
                  <th className={thBase}>Khoảng dự đoán</th>
                  <th className={thBase}>Tin cậy</th>
                  <th className={thBase}>Cách nên dùng / Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {HUST_ROWS_V2.map((row) => (
                  <tr key={row.code} className="hover:bg-muted/40">
                    <td className={tdBase}>
                      <div className="font-bold">{row.code}</div>
                      <div className="text-xs text-muted-foreground">{row.name}</div>
                    </td>
                    <td className={`${tdBase} font-display text-base font-bold text-primary`}>
                      {row.predicted}
                    </td>
                    <td className={tdBase}>±{row.margin}</td>
                    <td className={`${tdBase} whitespace-nowrap tabular-nums`}>
                      {row.low} – {row.high}
                    </td>
                    <td className={tdBase}>
                      <ConfidenceBadge tag={row.confidence} />
                    </td>
                    <td className={`${tdBase} text-muted-foreground`}>
                      {row.usage}
                      {row.note && (
                        <div className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                          {row.note}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableCard>
          </div>
          <div className="mt-4 flex gap-3 rounded-[1.25rem] border border-amber-500/40 bg-amber-500/10 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm leading-6 text-foreground/90">
              <strong className="font-bold">6 ngành đổi chỉ tiêu 2026 cần thận trọng:</strong>{" "}
              IT-E10 (120→160), IT-E7 (120→160), IT-E6 (240→160), EM1 (60→80), EM2 và EM5 (80→100).
              Điểm chính trong bảng vẫn tính theo kịch bản{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">quota = off</code> (neo chỉ
              tiêu từ 2025); mỗi ngành trên đã có thêm số <em>kịch bản chỉnh chỉ tiêu</em> ngay trong
              ghi chú. Quy luật chung: chỉ tiêu <strong>tăng</strong> kéo điểm về nửa dưới khoảng dự
              đoán (IT-E10: 29.44 → ≈29.25), chỉ tiêu <strong>giảm</strong> đẩy điểm lên (IT-E6:
              28.13 → ≈28.31). Hãy dùng con số bất lợi hơn cho mình làm biên an toàn khi đặt nguyện
              vọng.
            </p>
          </div>
        </section>

        {/* ---------- FTU (carried over) ---------- */}
        <section className="mx-auto mt-14 max-w-4xl">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-6 w-6 text-primary" />
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Đại học Ngoại thương — trụ sở Hà Nội (FTU)
            </h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Giữ nguyên từ bản trước (chưa có dữ liệu mới cho FTU). Chú ý cột &ldquo;Thang&rdquo;: hai ngành
            cuối chấm trên thang 40, không so trực tiếp với thang 30.
          </p>
          <div className="mt-4">
            <TableCard>
              <thead>
                <tr>
                  <th className={thBase}>Ngành</th>
                  <th className={thBase}>Thang</th>
                  <th className={thBase}>Điểm dự kiến</th>
                  <th className={thBase}>Khoảng dự kiến</th>
                  <th className={thBase}>Độ rộng</th>
                  <th className={thBase}>Độ chắc chắn</th>
                  <th className={thBase}>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {FTU_ROWS.map((row) => (
                  <tr key={row.code} className="hover:bg-muted/40">
                    <td className={tdBase}>
                      <div className="font-bold">{row.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.code} · {row.shortName}
                      </div>
                    </td>
                    <td className={tdBase}>{row.scale}</td>
                    <td className={`${tdBase} font-display text-base font-bold text-primary`}>
                      {row.predicted}
                    </td>
                    <td className={`${tdBase} whitespace-nowrap tabular-nums`}>
                      {row.low} – {row.high}
                    </td>
                    <td className={`${tdBase} tabular-nums`}>{row.width}</td>
                    <td className={tdBase}>
                      <ConfidenceBadge tag={row.confidence} />
                    </td>
                    <td className={`${tdBase} text-muted-foreground`}>{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </TableCard>
          </div>
        </section>

        {/* ---------- NEU (carried over) ---------- */}
        <section className="mx-auto mt-14 max-w-4xl">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-6 w-6 text-primary" />
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Đại học Kinh tế Quốc dân (NEU)
            </h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Giữ nguyên từ bản trước (chưa có dữ liệu mới cho NEU). Thang 30, xếp theo điểm dự đoán từ
            cao xuống thấp.
          </p>
          <div className="mt-4">
            <TableCard>
              <thead>
                <tr>
                  <th className={thBase}>#</th>
                  <th className={thBase}>Ngành</th>
                  <th className={thBase}>Điểm dự đoán</th>
                  <th className={thBase}>Khoảng dự đoán</th>
                  <th className={thBase}>Sai số ±</th>
                  <th className={thBase}>Tin cậy</th>
                  <th className={thBase}>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {NEU_ROWS.map((row) => (
                  <tr key={`${row.rank}-${row.code}`} className="hover:bg-muted/40">
                    <td className={`${tdBase} text-muted-foreground`}>{row.rank}</td>
                    <td className={tdBase}>
                      <div className="font-bold">{row.name}</div>
                      <div className="text-xs text-muted-foreground">{row.code}</div>
                    </td>
                    <td className={`${tdBase} font-display text-base font-bold text-primary`}>
                      {row.predicted}
                    </td>
                    <td className={`${tdBase} whitespace-nowrap tabular-nums`}>
                      {row.low} – {row.high}
                    </td>
                    <td className={tdBase}>±{row.margin}</td>
                    <td className={tdBase}>
                      <div className="flex items-center gap-2">
                        <ConfidenceBadge tag={row.confidence} />
                        <span className="text-xs font-semibold text-muted-foreground">
                          {row.confidencePct}
                        </span>
                      </div>
                    </td>
                    <td className={`${tdBase} text-muted-foreground`}>{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </TableCard>
          </div>
        </section>

        {/* ---------- CTA ---------- */}
        <section className="mx-auto mt-16 max-w-3xl rounded-[1.5rem] border border-border bg-gradient-to-br from-primary/10 via-card to-accent/10 p-6 text-center sm:p-8">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Biết điểm rồi, chọn ngành nào cho đúng?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Dùng công cụ của ZPath để tính điểm xét tuyển và khám phá ngành/trường phù hợp với năng lực
            và sở thích của bạn.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild variant="hero" size="lg">
              <Link href="/scoring">
                Tính điểm xét tuyển
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/unimap">Khám phá ngành &amp; trường</Link>
            </Button>
          </div>
        </section>
      </article>
    </main>
  );
}
