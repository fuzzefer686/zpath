import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/zpath-auth";
import { supabaseServer } from "@/src/lib/db/supabaseServer";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("avatar") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Không tìm thấy file ảnh tải lên." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Ảnh đại diện không được vượt quá 2MB." },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Chỉ hỗ trợ định dạng ảnh PNG, JPEG, hoặc WebP." },
        { status: 400 },
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    let extension = "jpg";
    if (file.type === "image/png") extension = "png";
    if (file.type === "image/webp") extension = "webp";

    const fileName = `${auth.user.id}-${Date.now()}.${extension}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseServer
      .storage
      .from("avatars")
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw uploadError;
    }

    // Get Public URL
    const { data: { publicUrl } } = supabaseServer
      .storage
      .from("avatars")
      .getPublicUrl(fileName);

    // Optional: Get old avatar URL to delete it from storage later if needed, but not strictly required

    // Update profiles table
    const { error: dbError } = await supabaseServer
      .from("profiles")
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", auth.user.id);

    if (dbError) {
      console.error("Database update error:", dbError);
      throw dbError;
    }

    return NextResponse.json({
      success: true,
      avatar_url: publicUrl,
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { error: "Không thể tải lên ảnh đại diện." },
      { status: 500 },
    );
  }
}
