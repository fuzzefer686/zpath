import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/zpath-auth";
import { supabaseServer } from "@/src/lib/db/supabaseServer";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const userId = auth.user.id;
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const itemId = formData.get("itemId") as string | null;
    const type = formData.get("type") as "certificate" | "award" | null;

    if (!file || !itemId || !type) {
      return NextResponse.json(
        { error: "Thiếu thông tin file, ID bản ghi hoặc loại minh chứng." },
        { status: 400 },
      );
    }

    if (type !== "certificate" && type !== "award") {
      return NextResponse.json(
        { error: "Loại minh chứng không hợp lệ." },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Kích thước file không được vượt quá 10MB." },
        { status: 400 },
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Chỉ hỗ trợ định dạng ảnh (JPEG, PNG, WebP) hoặc file PDF." },
        { status: 400 },
      );
    }

    // Check ownership of the certificate/award record first to prevent user B from uploading files for user A
    const targetTable = type === "certificate" ? "cv_certificates" : "cv_awards";
    const { data: record, error: recordError } = await supabaseServer
      .from(targetTable)
      .select("user_id, evidence_url")
      .eq("id", itemId)
      .eq("user_id", userId)
      .maybeSingle();

    if (recordError || !record) {
      return NextResponse.json(
        { error: "Không tìm thấy bản ghi cần tải lên minh chứng hoặc bạn không có quyền sở hữu." },
        { status: 403 },
      );
    }

    // Read file buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Sanitize and construct file name
    const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${Date.now()}-${sanitizedOriginalName}`;
    const storagePath = `${userId}/${itemId}/${fileName}`;

    // If an old evidence file exists, remove it first to keep the bucket clean
    if (record.evidence_url && record.evidence_url.startsWith(`${userId}/`)) {
      try {
        await supabaseServer.storage.from("cv-evidence").remove([record.evidence_url]);
      } catch (err) {
        console.error("Failed to delete old evidence file:", err);
      }
    }

    // Upload new file to Supabase Storage cv-evidence bucket
    const { error: uploadError } = await supabaseServer.storage
      .from("cv-evidence")
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw uploadError;
    }

    // Update database record with the relative storage path
    const { error: dbError } = await supabaseServer
      .from(targetTable)
      .update({
        evidence_url: storagePath,
      })
      .eq("id", itemId)
      .eq("user_id", userId);

    if (dbError) {
      console.error("Database update error:", dbError);
      throw dbError;
    }

    // Generate short-lived signed URL for display (30 minutes TTL)
    const { data: signedData, error: signedError } = await supabaseServer.storage
      .from("cv-evidence")
      .createSignedUrl(storagePath, 1800);

    if (signedError || !signedData) {
      console.error("Failed to generate signed URL:", signedError);
      throw signedError || new Error("Failed to generate signed URL");
    }

    return NextResponse.json({
      success: true,
      evidence_url: signedData.signedUrl, // Return the signed URL to the client for instant viewing
    });
  } catch (error) {
    console.error("CV evidence upload error:", error);
    return NextResponse.json(
      { error: "Không thể tải lên file minh chứng." },
      { status: 500 },
    );
  }
}
