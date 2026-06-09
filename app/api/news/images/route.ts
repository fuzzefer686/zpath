import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { getAuthContext } from "@/lib/zpath-auth";
import { isNewsSchemaMissingError } from "@/lib/news-server";
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

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

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

    const path = `${auth.user.id}/${randomUUID()}.${getExtension(file.type)}`;
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
