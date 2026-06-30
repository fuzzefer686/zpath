import { supabaseServer } from "@/src/lib/db/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Public, read-only CV view reached by share token (§10, §13).
// Reads LIVE data via get_shared_cv (contact PII already redacted server-side).
// No auth — the token is the capability. Expired/revoked → friendly notice.
// ---------------------------------------------------------------------------

interface SharedCvDocument {
  basic?: { fullName?: string | null; avatarUrl?: string | null };
  summary?: {
    headline?: string | null;
    objective?: string | null;
    targetCareer?: string | null;
  };
  education?: Array<{
    id: string;
    level?: string | null;
    schoolName?: string | null;
    gpa?: number | null;
    startYear?: number | null;
    endYear?: number | null;
  }>;
  skills?: Array<{ id: string; name?: string | null; category?: string | null }>;
  certificates?: Array<{ id: string; displayName?: string | null; score?: string | null }>;
  awards?: Array<{ id: string; title?: string | null; level?: string | null; awardYear?: number | null }>;
  activities?: Array<{ id: string; title?: string | null; role?: string | null; organization?: string | null }>;
  personality?: Array<{ id: string; resultCode?: string | null; summary?: string | null }>;
}

async function fetchSharedCv(token: string): Promise<SharedCvDocument | null> {
  if (!token || token.length < 32) return null;
  const { data, error } = await supabaseServer.rpc("get_shared_cv", { p_token: token });
  if (error || !data) return null;
  return data as SharedCvDocument;
}

function ExpiredNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="max-w-md rounded-2xl border border-border bg-background p-8 text-center shadow-sm">
        <h1 className="font-display text-xl font-bold text-foreground">Liên kết không khả dụng</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Liên kết chia sẻ CV này đã hết hạn hoặc đã được thu hồi. Vui lòng liên hệ chủ hồ sơ để
          nhận liên kết mới.
        </p>
        <a
          href="/"
          className="mt-5 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Về ZPath
        </a>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-bold uppercase tracking-wide text-primary">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export default async function SharedCvPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const doc = await fetchSharedCv(token);

  if (!doc) return <ExpiredNotice />;

  const name = doc.basic?.fullName ?? "Hồ sơ ẩn danh";
  const { education = [], skills = [], certificates = [], awards = [], activities = [], personality = [] } = doc;

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <article className="relative mx-auto max-w-2xl overflow-hidden rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-8">
        {/* Watermark */}
        <span className="pointer-events-none absolute right-4 top-4 select-none text-[11px] font-bold uppercase tracking-widest text-muted-foreground/40">
          ZPath
        </span>

        {/* Header */}
        <header className="space-y-1 border-b border-border pb-4">
          <h1 className="font-display text-2xl font-bold text-foreground">{name}</h1>
          {doc.summary?.headline && (
            <p className="text-sm font-medium text-primary">{doc.summary.headline}</p>
          )}
          {doc.summary?.targetCareer && (
            <p className="text-xs text-muted-foreground">Định hướng: {doc.summary.targetCareer}</p>
          )}
        </header>

        <div className="mt-5 space-y-6">
          {doc.summary?.objective && (
            <Section title="Giới thiệu">
              <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                {doc.summary.objective}
              </p>
            </Section>
          )}

          {education.length > 0 && (
            <Section title="Học vấn">
              {education.map((e) => (
                <div key={e.id} className="text-sm">
                  <span className="font-semibold text-foreground">{e.schoolName ?? e.level ?? "—"}</span>
                  {(e.startYear || e.endYear) && (
                    <span className="text-muted-foreground">
                      {" "}· {e.startYear ?? "?"}–{e.endYear ?? "nay"}
                    </span>
                  )}
                  {typeof e.gpa === "number" && (
                    <span className="text-muted-foreground"> · GPA {e.gpa}</span>
                  )}
                </div>
              ))}
            </Section>
          )}

          {skills.length > 0 && (
            <Section title="Kỹ năng">
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <span
                    key={s.id}
                    className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {certificates.length > 0 && (
            <Section title="Chứng chỉ">
              {certificates.map((c) => (
                <div key={c.id} className="text-sm text-foreground/90">
                  {c.displayName}
                  {c.score && <span className="text-muted-foreground"> · {c.score}</span>}
                </div>
              ))}
            </Section>
          )}

          {awards.length > 0 && (
            <Section title="Giải thưởng">
              {awards.map((a) => (
                <div key={a.id} className="text-sm text-foreground/90">
                  {a.title}
                  {a.level && <span className="text-muted-foreground"> · {a.level}</span>}
                  {a.awardYear && <span className="text-muted-foreground"> · {a.awardYear}</span>}
                </div>
              ))}
            </Section>
          )}

          {activities.length > 0 && (
            <Section title="Hoạt động">
              {activities.map((a) => (
                <div key={a.id} className="text-sm text-foreground/90">
                  <span className="font-medium">{a.title}</span>
                  {a.role && <span className="text-muted-foreground"> · {a.role}</span>}
                  {a.organization && <span className="text-muted-foreground"> · {a.organization}</span>}
                </div>
              ))}
            </Section>
          )}

          {personality.length > 0 && personality[0]?.resultCode && (
            <Section title="Tính cách">
              <p className="text-sm text-foreground/90">
                <span className="font-semibold">{personality[0].resultCode}</span>
                {personality[0].summary && (
                  <span className="text-muted-foreground"> — {personality[0].summary}</span>
                )}
              </p>
            </Section>
          )}
        </div>

        {/* PII / compliance footer */}
        <footer className="mt-8 border-t border-border pt-4 text-center text-[11px] text-muted-foreground">
          Thông tin liên hệ (số điện thoại, email, địa chỉ) đã được ẩn để bảo vệ dữ liệu cá nhân.
          <br />
          CV được chia sẻ qua liên kết tạm thời trên nền tảng ZPath.
        </footer>
      </article>
    </div>
  );
}
