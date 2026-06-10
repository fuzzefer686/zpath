import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { getAuthContext } from "@/lib/zpath-auth";
import { getStaticExamAnswerRoute } from "@/lib/static-news-routes";
import { supabaseServer } from "@/src/lib/db/supabaseServer";

export const runtime = "nodejs";

const EXAM_IMAGE_BUCKET = "exam-images";
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const EXAM_IMAGE_SELECT = "id, route_slug, subject, document_type, storage_path, public_url, mime_type, file_size, created_at";

function sanitizePathPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function getExtension(file: File) {
  const fileNameExtension = file.name.split(".").pop()?.toLowerCase();
  if (fileNameExtension && /^[a-z0-9]{2,10}$/.test(fileNameExtension)) {
    return fileNameExtension;
  }

  const mimeExtension = file.type.split("/")[1]?.toLowerCase();
  return mimeExtension && /^[a-z0-9.+-]{2,20}$/.test(mimeExtension)
    ? mimeExtension.replace("+", "-")
    : "image";
}

function getDocumentType(value: FormDataEntryValue | null) {
  return value === "dap_an" ? "dap_an" : "de";
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth || auth.user.role !== "admin") {
      return NextResponse.json(
        { error: "Chỉ admin mới được tải ảnh đề." },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    const routeSlug = sanitizePathPart(String(formData.get("routeSlug") ?? "de-thi"));
    const subjectName = String(formData.get("subject") ?? "").trim();
    const subject = sanitizePathPart(subjectName || "mon-thi");
    const documentType = getDocumentType(formData.get("documentType"));
    const route = getStaticExamAnswerRoute(routeSlug);

    if (!file) {
      return NextResponse.json({ error: "Không tìm thấy file ảnh đề." }, { status: 400 });
    }

    if (!route) {
      return NextResponse.json({ error: "Route ngày thi không hợp lệ." }, { status: 400 });
    }

    const allowedSubjects = new Set(
      route.scheduleRows
        .filter((row) => !row.subject.includes("thủ tục"))
        .map((row) => row.subject),
    );

    if (!allowedSubjects.has(subjectName)) {
      return NextResponse.json(
        { error: "Môn thi này không thuộc ngày thi của route hiện tại." },
        { status: 400 },
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Chỉ hỗ trợ file ảnh đề. Vui lòng tải file có MIME image/*." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Ảnh đề không được vượt quá 20MB." }, { status: 400 });
    }

    const path = `${routeSlug || "de-thi"}/${documentType}/${subject || "mon-thi"}/${randomUUID()}.${getExtension(file)}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { error } = await supabaseServer.storage.from(EXAM_IMAGE_BUCKET).upload(path, fileBuffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabaseServer.storage.from(EXAM_IMAGE_BUCKET).getPublicUrl(path);

    const { data: image, error: insertError } = await supabaseServer
      .from("exam_images")
      .insert({
        route_slug: routeSlug || "de-thi",
        subject: subjectName,
        document_type: documentType,
        storage_path: path,
        public_url: publicUrl,
        mime_type: file.type,
        file_size: file.size,
        uploaded_by: auth.user.id,
      })
      .select(EXAM_IMAGE_SELECT)
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ image });
  } catch (error) {
    console.error("Không thể tải ảnh đề.", error);
    return NextResponse.json({ error: "Không thể tải ảnh đề." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const routeSlug = sanitizePathPart(url.searchParams.get("routeSlug") ?? "");

    if (!routeSlug) {
      return NextResponse.json({ images: [] });
    }

    const { data, error } = await supabaseServer
      .from("exam_images")
      .select(EXAM_IMAGE_SELECT)
      .eq("route_slug", routeSlug)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ images: data ?? [] });
  } catch (error) {
    console.warn("Không thể tải danh sách ảnh đề, trả về danh sách rỗng.", error);
    return NextResponse.json({ images: [] });
  }
}
