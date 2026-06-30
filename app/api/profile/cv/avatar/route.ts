// POST /api/profile/cv/avatar — upload the photo shown on the user's CV.
//
// The CV avatar is stored in cv_profiles.avatar_url (read by get_cv_document as
// basic.avatarUrl), which is a SEPARATE column from the account avatar in
// profiles.avatar_url (/api/profile/avatar). Keeping them apart lets a user use
// a different photo on their CV than on their account.
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/zpath-auth";
import { supabaseServer } from "@/src/lib/db/supabaseServer";
import { FEATURES } from "@/config/features";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const AVATAR_BUCKET = "avatars"; // public bucket — react-pdf fetches the URL when rendering

export async function POST(request: Request) {
  try {
    if (!FEATURES.cvBuilder.enabled) {
      return NextResponse.json({ error: "Tính năng CV chưa được bật." }, { status: 403 });
    }

    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }
    const userId = auth.user.id;

    const formData = await request.formData();
    const file = formData.get("avatar") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Không tìm thấy file ảnh tải lên." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Ảnh đại diện không được vượt quá 2MB." }, { status: 400 });
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Chỉ hỗ trợ định dạng ảnh PNG, JPEG, hoặc WebP." }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    // cv- prefix keeps CV photos separate from account avatars in the same bucket.
    const fileName = `cv-${userId}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabaseServer.storage
      .from(AVATAR_BUCKET)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: true,
      });
    if (uploadError) {
      console.error("CV avatar upload error:", uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabaseServer.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(fileName);

    // cv_profiles row is created on first GET /api/profile/cv, so it exists by
    // the time the user can reach the CV builder.
    const { error: dbError } = await supabaseServer
      .from("cv_profiles")
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    if (dbError) {
      console.error("CV avatar db update error:", dbError);
      throw dbError;
    }

    return NextResponse.json({ success: true, avatar_url: publicUrl });
  } catch (error) {
    console.error("POST /api/profile/cv/avatar error:", error);
    return NextResponse.json({ error: "Không thể tải lên ảnh đại diện CV." }, { status: 500 });
  }
}
