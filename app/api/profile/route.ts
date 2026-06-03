import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/zpath-auth";
import { supabaseServer } from "@/src/lib/db/supabaseServer";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const { data: existingProfile, error } = await supabaseServer
      .from("profiles")
      .select("*")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (error) throw error;

    let profile = existingProfile;

    // If profile doesn't exist for legacy users, create one on the fly
    if (!profile) {
      const { data: newProfile, error: createError } = await supabaseServer
        .from("profiles")
        .insert({
          id: auth.user.id,
          display_name: auth.user.username,
        })
        .select("*")
        .single();

      if (createError) throw createError;
      profile = newProfile;
    }

    return NextResponse.json({
      ...profile,
      role: auth.user.role,
      email: auth.user.email,
      username: auth.user.username,
      phone: auth.user.phone,
    });
  } catch (error) {
    console.error("GET /api/profile error:", error);
    return NextResponse.json(
      { error: "Không thể lấy thông tin cá nhân." },
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

    const body = await request.json();
    const {
      display_name,
      bio,
      school,
      grade,
      target_university,
      avatar_url,
    } = body;

    const { data: updatedProfile, error } = await supabaseServer
      .from("profiles")
      .update({
        display_name: typeof display_name === "string" ? display_name.trim() : undefined,
        bio: typeof bio === "string" ? bio.trim() : undefined,
        school: typeof school === "string" ? school.trim() : undefined,
        grade: typeof grade === "string" ? grade.trim() : undefined,
        target_university: typeof target_university === "string" ? target_university.trim() : undefined,
        avatar_url: typeof avatar_url === "string" ? avatar_url.trim() : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", auth.user.id)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({
      ...updatedProfile,
      role: auth.user.role,
      email: auth.user.email,
      username: auth.user.username,
      phone: auth.user.phone,
    });
  } catch (error) {
    console.error("PUT /api/profile error:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật thông tin cá nhân." },
      { status: 500 },
    );
  }
}
