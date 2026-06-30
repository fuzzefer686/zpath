import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { getAuthContext } from "@/lib/zpath-auth";
import { supabaseServer } from "@/src/lib/db/supabaseServer";
import { FEATURES } from "@/config/features";
import { ReactPdfRenderer } from "@/lib/cv/renderer/reactPdf";
import type { CVDocument } from "@/lib/cv/types";

// react-pdf needs the Node.js runtime (not Edge). Render is server-only: the
// CVRenderer and font registration never reach the client bundle.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXPORT_BUCKET = "cv-exports";
// Signed URL TTL must not outlive the file. purge_at = now()+30min, so cap the
// URL at 30 minutes too — it expires no later than the file is hard-deleted.
const SIGNED_URL_TTL_SECONDS = 30 * 60;

// Resolve the concrete, active template the user asked for. Falls back to the
// 'basic' default (or the first active template) so a render always has a real
// template_id — never the hardcoded "default" placeholder.
async function resolveTemplateId(requested: string | null): Promise<string | null> {
  const { data, error } = await supabaseServer
    .from("cv_templates")
    .select("id, slug")
    .eq("is_active", true);
  if (error || !data?.length) return null;
  if (requested) {
    const match = data.find((t) => t.id === requested || t.slug === requested);
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
    if (!auth) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }
    const userId = auth.user.id;

    // Optional template selection from the request body (id or slug).
    const body = await req.json().catch(() => ({}));
    const requestedTemplate =
      body && typeof body.templateId === "string" ? body.templateId.trim() : null;

    // 0) Rate limit check: 10 renders / hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: renderCount, error: countError } = await supabaseServer
      .from("cv_rate_limit_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("action_type", "render")
      .gte("created_at", oneHourAgo);

    if (countError) throw countError;
    if (renderCount !== null && renderCount >= 10) {
      return NextResponse.json(
        { error: "Bạn đã vượt quá giới hạn xuất bản CV (10 lượt/giờ). Vui lòng thử lại sau." },
        { status: 429 }
      );
    }

    // 1) Load the normalized CVDocument from the single-source-of-truth RPC.
    const { data: doc, error: docError } = await supabaseServer.rpc(
      "get_cv_document",
      { p_user_id: userId },
    );
    if (docError) throw docError;
    if (!doc) {
      return NextResponse.json(
        { error: "Chưa có dữ liệu CV để xuất bản." },
        { status: 400 },
      );
    }
    const cvDocument = doc as CVDocument;

    // 2) Render server-side via the default deterministic engine, using the
    //    template the user selected (drives colours/font/spacing via layout_config).
    const templateId = await resolveTemplateId(requestedTemplate);
    const renderer = new ReactPdfRenderer();
    const pdfBytes = await renderer.render(cvDocument, templateId ?? "default");

    // 3) Build the owner-scoped storage path. First segment is the trusted
    //    userId, so it satisfies public.cv_storage_owns_path() by construction
    //    (mirrors that guard — see 20260622100200_cv_storage.sql).
    const cvId = randomUUID();
    const storagePath = `${userId}/${cvId}/cv.pdf`;
    if (storagePath.split("/")[0] !== userId) {
      // Should be unreachable; defensive guard mirroring cv_storage_owns_path.
      return NextResponse.json({ error: "Đường dẫn lưu trữ không hợp lệ." }, { status: 500 });
    }

    // 4) Upload the rendered PDF to the private cv-exports bucket.
    const { error: uploadError } = await supabaseServer.storage
      .from(EXPORT_BUCKET)
      .upload(storagePath, Buffer.from(pdfBytes), {
        contentType: "application/pdf",
        cacheControl: "0",
        upsert: true,
      });
    if (uploadError) {
      console.error("CV render upload error:", uploadError);
      throw uploadError;
    }

    // 5) Record the export with a full snapshot + ephemeral deadlines.
    //    purge_at = now()+30min drives the T12 hard-delete job.
    const servedAt = new Date();
    const purgeAt = new Date(servedAt.getTime() + 30 * 60 * 1000);
    const { error: insertError } = await supabaseServer
      .from("generated_cvs")
      .insert({
        id: cvId,
        user_id: userId,
        template_id: templateId,
        storage_path: storagePath,
        format: "pdf",
        data_snapshot: cvDocument,
        served_at: servedAt.toISOString(),
        purge_at: purgeAt.toISOString(),
        expires_at: purgeAt.toISOString(),
      });
    if (insertError) {
      // Roll back the orphaned Storage object so nothing lingers past purge.
      await supabaseServer.storage.from(EXPORT_BUCKET).remove([storagePath]).catch(() => {});
      console.error("CV render insert error:", insertError);
      throw insertError;
    }

    // 6) Issue a short-TTL signed URL (never a public URL). The bucket is
    //    private; this is the only way the client gets the file.
    const { data: signed, error: signError } = await supabaseServer.storage
      .from(EXPORT_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
    if (signError || !signed) {
      console.error("CV render sign error:", signError);
      throw signError || new Error("Failed to sign URL");
    }

    // Log the successful render for rate limiting
    const { error: logError } = await supabaseServer
      .from("cv_rate_limit_logs")
      .insert({ user_id: userId, action_type: "render" });
    if (logError) {
      console.error("Failed to log rate limit entry for render:", logError);
    }

    return NextResponse.json({
      success: true,
      url: signed.signedUrl,
      cvId,
      servedAt: servedAt.toISOString(),
      purgeAt: purgeAt.toISOString(),
      expiresInSeconds: SIGNED_URL_TTL_SECONDS,
    });
  } catch (error) {
    console.error("POST /api/cv/render error:", error);
    return NextResponse.json(
      { error: "Không thể xuất bản CV. Vui lòng thử lại." },
      { status: 500 },
    );
  }
}
