import { NextResponse } from "next/server";

import { getMentorContext } from "@/lib/auth/requireMentor";
import { supabaseServer } from "@/src/lib/db/supabaseServer";
import { mapMentorProfile, type MentorProfileRow } from "@/lib/mentor/types";

export const runtime = "nodejs";

const MENTOR_PROFILE_COLUMNS =
  "user_id, display_name, avatar_url, show_identity_default, is_active, role, bio, created_at, updated_at";

const DISPLAY_NAME_MAX = 60;
const BIO_MAX = 500;

export async function GET() {
  const mentor = await getMentorContext();
  if (!mentor) {
    return NextResponse.json({ error: "Không có quyền mentor." }, { status: 403 });
  }
  return NextResponse.json({ profile: mentor.profile });
}

export async function PUT(request: Request) {
  try {
    const mentor = await getMentorContext();
    if (!mentor) {
      return NextResponse.json({ error: "Không có quyền mentor." }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
    }

    const { display_name, avatar_url, show_identity_default, bio } = body as Record<
      string,
      unknown
    >;

    const updates: Record<string, unknown> = {};

    if (display_name !== undefined) {
      if (typeof display_name !== "string" || display_name.trim().length === 0) {
        return NextResponse.json(
          { error: "Tên hiển thị không được để trống." },
          { status: 400 },
        );
      }
      if (display_name.trim().length > DISPLAY_NAME_MAX) {
        return NextResponse.json(
          { error: `Tên hiển thị tối đa ${DISPLAY_NAME_MAX} ký tự.` },
          { status: 400 },
        );
      }
      updates.display_name = display_name.trim();
    }

    if (avatar_url !== undefined) {
      if (avatar_url === null || avatar_url === "") {
        updates.avatar_url = null;
      } else if (typeof avatar_url === "string" && /^https?:\/\//i.test(avatar_url.trim())) {
        updates.avatar_url = avatar_url.trim();
      } else {
        return NextResponse.json(
          { error: "Avatar URL phải là đường dẫn http(s) hợp lệ." },
          { status: 400 },
        );
      }
    }

    if (show_identity_default !== undefined) {
      if (typeof show_identity_default !== "boolean") {
        return NextResponse.json(
          { error: "show_identity_default phải là boolean." },
          { status: 400 },
        );
      }
      updates.show_identity_default = show_identity_default;
    }

    if (bio !== undefined) {
      if (bio === null || bio === "") {
        updates.bio = null;
      } else if (typeof bio === "string" && bio.trim().length <= BIO_MAX) {
        updates.bio = bio.trim();
      } else {
        return NextResponse.json(
          { error: `Giới thiệu tối đa ${BIO_MAX} ký tự.` },
          { status: 400 },
        );
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Không có thay đổi nào." }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from("mentor_profiles")
      .update(updates)
      .eq("user_id", mentor.user.id)
      .select(MENTOR_PROFILE_COLUMNS)
      .single();

    if (error) throw error;

    return NextResponse.json({ profile: mapMentorProfile(data as MentorProfileRow) });
  } catch (error) {
    console.error("PUT /api/mentor/profile error:", error);
    return NextResponse.json({ error: "Không thể cập nhật hồ sơ mentor." }, { status: 500 });
  }
}
