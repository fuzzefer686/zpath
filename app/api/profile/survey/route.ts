import { NextResponse } from "next/server";

import { getAuthContext } from "@/lib/zpath-auth";
import { supabaseServer } from "@/src/lib/db/supabaseServer";
import { sanitizeNormalizedSurveyProfile } from "@/src/lib/forms/surveyProfile";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = await getAuthContext();

    if (!auth) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const { data, error } = await supabaseServer
      .from("user_survey_profiles")
      .select("normalized_profile, session_id, updated_at")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { error: "Chưa có hồ sơ khảo sát." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      profile: sanitizeNormalizedSurveyProfile(data.normalized_profile),
      session_id: data.session_id,
      updated_at: data.updated_at,
    });
  } catch (error) {
    console.error("Profile survey GET error:", error);
    return NextResponse.json(
      { error: "Không thể tải hồ sơ khảo sát." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await getAuthContext();

    if (!auth) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const body = (await request.json()) as { profile?: unknown };
    const profile = sanitizeNormalizedSurveyProfile(body.profile);

    const { data: existing, error: lookupError } = await supabaseServer
      .from("user_survey_profiles")
      .select("user_id")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (lookupError) throw lookupError;

    if (!existing) {
      return NextResponse.json(
        { error: "Bạn cần hoàn thành khảo sát trước khi chỉnh sửa hồ sơ." },
        { status: 404 },
      );
    }

    const { error } = await supabaseServer
      .from("user_survey_profiles")
      .update({ normalized_profile: profile })
      .eq("user_id", auth.user.id);

    if (error) throw error;

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Profile survey PUT error:", error);
    return NextResponse.json(
      { error: "Không thể lưu hồ sơ khảo sát." },
      { status: 500 },
    );
  }
}
