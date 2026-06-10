import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { isNewsSchemaMissingError } from "@/lib/news-server";
import { getAuthContext } from "@/lib/zpath-auth";
import { supabaseServer } from "@/src/lib/db/supabaseServer";

export const runtime = "nodejs";

const NEWS_IMAGE_BUCKET = "news-images";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];

function getExtension(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function normalizeStoragePath(value: unknown) {
  if (typeof value !== "string") return "";

  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    const marker = `/storage/v1/object/public/${NEWS_IMAGE_BUCKET}/`;
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex >= 0) {
      return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
    }
  } catch {
    // Value is already expected to be a storage path.
  }

  return trimmed.replace(/^\/+/, "");
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Không tìm thấy file ảnh." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Ảnh bài viết không được vượt quá 5MB." }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Chỉ hỗ trợ ảnh PNG, JPEG hoặc WebP." },
        { status: 400 },
      );
    }

    const path = `public/${randomUUID()}.${getExtension(file.type)}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { error } = await supabaseServer.storage.from(NEWS_IMAGE_BUCKET).upload(path, fileBuffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabaseServer.storage.from(NEWS_IMAGE_BUCKET).getPublicUrl(path);

    return NextResponse.json({ path, publicUrl });
  } catch (error) {
    if (isNewsSchemaMissingError(error)) {
      return NextResponse.json(
        {
          error:
            "Storage bucket news-images chưa được tạo. Hãy chạy migration news_markdown_crud trước khi upload ảnh bài viết.",
        },
        { status: 503 },
      );
    }

    console.error("Không thể tải ảnh bài viết.", error);
    return NextResponse.json({ error: "Không thể tải ảnh bài viết." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth || auth.user.role !== "admin") {
      return NextResponse.json(
        { error: "Chỉ admin mới được xóa ảnh bài viết." },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => null)) as
      | { path?: unknown; publicUrl?: unknown }
      | null;
    const path = normalizeStoragePath(body?.path ?? body?.publicUrl);

    if (!path) {
      return NextResponse.json({ error: "Thiếu path ảnh cần xóa." }, { status: 400 });
    }

    const { error } = await supabaseServer.storage.from(NEWS_IMAGE_BUCKET).remove([path]);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isNewsSchemaMissingError(error)) {
      return NextResponse.json(
        {
          error:
            "Storage bucket news-images chưa được tạo. Hãy chạy migration news_markdown_crud trước khi xóa ảnh bài viết.",
        },
        { status: 503 },
      );
    }

    console.error("Không thể xóa ảnh bài viết.", error);
    return NextResponse.json({ error: "Không thể xóa ảnh bài viết." }, { status: 500 });
  }
}
