// POST /api/cv/preview — renders a PDF for the given template and returns the
// raw bytes. Identical to /api/cv/render but stateless: no Storage upload, no
// generated_cvs row, no rate-limit logging. Auth required.
// The client receives PDF bytes and creates a blob URL for in-browser preview.
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/zpath-auth";
import { supabaseServer } from "@/src/lib/db/supabaseServer";
import { FEATURES } from "@/config/features";
import { ReactPdfRenderer } from "@/lib/cv/renderer/reactPdf";
import type { CVDocument } from "@/lib/cv/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Resolve a template id/slug to the UUID stored in cv_templates.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function resolveTemplateId(requested: string | null): Promise<string | null> {
  const { data, error } = await supabaseServer
    .from("cv_templates").select("id, slug").eq("is_active", true);
  if (error || !data?.length) return null;
  if (requested) {
    const col = UUID_RE.test(requested) ? "id" : "slug";
    const match = data.find((t) => t[col] === requested);
    if (match) return match.id;
  }
  return (data.find((t) => t.slug === "basic") ?? data[0]).id;
}

export async function POST(req: Request) {
  try {
    if (!FEATURES.cvBuilder.enabled) {
      return NextResponse.json({ error: "Tính năng CV chưa được bật." }, { status: 403 });
    }
    const auth = await getAuthContext();
    if (!auth) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    const userId = auth.user.id;

    const body = await req.json().catch(() => ({}));
    const requestedTemplate =
      body && typeof body.templateId === "string" ? body.templateId.trim() : null;

    const { data: doc, error: docError } = await supabaseServer.rpc(
      "get_cv_document", { p_user_id: userId },
    );
    if (docError) throw docError;
    if (!doc) {
      return NextResponse.json({ error: "Chưa có dữ liệu CV để xem trước." }, { status: 400 });
    }

    const templateId = await resolveTemplateId(requestedTemplate);
    const pdfBytes = await new ReactPdfRenderer().render(doc as CVDocument, templateId ?? "default");

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="cv-preview.pdf"',
        // No caching — preview reflects the user's current profile data.
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("POST /api/cv/preview error:", err);
    return NextResponse.json({ error: "Không thể tạo bản xem trước CV." }, { status: 500 });
  }
}
