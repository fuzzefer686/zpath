// GET /api/cv/templates — returns the list of active CV templates for the
// TemplatePicker UI. Auth required (templates are public config, but only
// logged-in users can select one for rendering).
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/zpath-auth";
import { supabaseServer } from "@/src/lib/db/supabaseServer";
import { FEATURES } from "@/config/features";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!FEATURES.cvBuilder.enabled) {
      return NextResponse.json({ error: "Tính năng CV chưa được bật." }, { status: 403 });
    }
    const auth = await getAuthContext();
    if (!auth) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

    const { data, error } = await supabaseServer
      .from("cv_templates")
      .select("id, slug, name, layout_config, preview_image_url")
      .eq("is_active", true)
      .order("created_at");

    if (error) throw error;
    return NextResponse.json({ templates: data ?? [] });
  } catch (err) {
    console.error("GET /api/cv/templates error:", err);
    return NextResponse.json({ error: "Không thể tải danh sách mẫu CV." }, { status: 500 });
  }
}
