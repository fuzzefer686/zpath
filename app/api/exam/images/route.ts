import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { getAuthContext } from "@/lib/zpath-auth";
import { getStaticExamAnswerRoute } from "@/lib/static-news-routes";
import { supabaseServer } from "@/src/lib/db/supabaseServer";

export const runtime = "nodejs";

const EXAM_IMAGE_BUCKET = "exam-images";
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const EXAM_IMAGE_SELECT = "id, route_slug, subject, document_type, exam_code, storage_path, public_url, mime_type, file_size, created_at";
const EXAM_IMAGE_LEGACY_SELECT = "id, route_slug, subject, document_type, storage_path, public_url, mime_type, file_size, created_at";
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
const EXAM_CODE_OPTIONS = Array.from({ length: 48 }, (_, index) => String(101 + index));
const EXAM_CODE_SET = new Set(EXAM_CODE_OPTIONS);

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
  if (file.type === "application/pdf") return "pdf";

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

function subjectUsesExamCode(subject: string) {
  const normalizedSubject = subject
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLocaleLowerCase("vi-VN")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  return !normalizedSubject.includes("ngu van");
}

function getExamCode(value: FormDataEntryValue | null) {
  const examCode = String(value ?? "").trim();
  return EXAM_CODE_SET.has(examCode) ? examCode : "";
}

function isMissingExamCodeColumn(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const errorRecord = error as Record<string, unknown>;
  const errorText = [
    errorRecord.code,
    errorRecord.message,
    errorRecord.details,
    errorRecord.hint,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLocaleLowerCase("en-US");

  return errorText.includes("exam_code") || errorText.includes("pgrst204");
}

function inferExamCodeFromStoragePath(storagePath: unknown) {
  if (typeof storagePath !== "string") return null;

  return storagePath.split("/").find((pathPart) => EXAM_CODE_SET.has(pathPart)) ?? null;
}

function withDefaultExamCode<T extends object>(images: T[] | null) {
  return (images ?? []).map((image) => {
    const imageWithMetadata = image as T & {
      exam_code?: string | null;
      storage_path?: string | null;
    };

    return {
      ...image,
      exam_code: imageWithMetadata.exam_code ?? inferExamCodeFromStoragePath(imageWithMetadata.storage_path),
    };
  });
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth || auth.user.role !== "admin") {
      return NextResponse.json(
        { error: "Chỉ admin mới được tải file đề." },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    const routeSlug = sanitizePathPart(String(formData.get("routeSlug") ?? "de-thi"));
    const subjectName = String(formData.get("subject") ?? "").trim();
    const subject = sanitizePathPart(subjectName || "mon-thi");
    const documentType = getDocumentType(formData.get("documentType"));
    const examCode = getExamCode(formData.get("examCode"));
    const route = getStaticExamAnswerRoute(routeSlug);

    if (!file) {
      return NextResponse.json({ error: "Không tìm thấy file đề." }, { status: 400 });
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

    if (subjectUsesExamCode(subjectName) && !examCode) {
      return NextResponse.json({ error: "Hãy chọn mã đề từ 101 đến 148." }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Chỉ hỗ trợ ảnh PNG, JPEG, WebP hoặc PDF." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File đề không được vượt quá 20MB." }, { status: 400 });
    }

    const codePathPart = subjectUsesExamCode(subjectName) ? `${examCode}/` : "";
    const path = `${routeSlug || "de-thi"}/${documentType}/${subject || "mon-thi"}/${codePathPart}${randomUUID()}.${getExtension(file)}`;
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

    const insertPayload = {
      route_slug: routeSlug || "de-thi",
      subject: subjectName,
      document_type: documentType,
      exam_code: subjectUsesExamCode(subjectName) ? examCode : null,
      storage_path: path,
      public_url: publicUrl,
      mime_type: file.type,
      file_size: file.size,
      uploaded_by: auth.user.id,
    };

    const { data: image, error: insertError } = await supabaseServer
      .from("exam_images")
      .insert(insertPayload)
      .select(EXAM_IMAGE_SELECT)
      .single();

    if (insertError) {
      if (!isMissingExamCodeColumn(insertError)) throw insertError;

      const legacyInsertPayload = {
        route_slug: insertPayload.route_slug,
        subject: insertPayload.subject,
        document_type: insertPayload.document_type,
        storage_path: insertPayload.storage_path,
        public_url: insertPayload.public_url,
        mime_type: insertPayload.mime_type,
        file_size: insertPayload.file_size,
        uploaded_by: insertPayload.uploaded_by,
      };
      const { data: legacyImage, error: legacyInsertError } = await supabaseServer
        .from("exam_images")
        .insert(legacyInsertPayload)
        .select(EXAM_IMAGE_LEGACY_SELECT)
        .single();

      if (legacyInsertError) throw legacyInsertError;
      return NextResponse.json({
        image: {
          ...legacyImage,
          exam_code: inferExamCodeFromStoragePath(legacyImage?.storage_path),
        },
      });
    }

    return NextResponse.json({ image });
  } catch (error) {
    console.error("Không thể tải file đề.", error);
    return NextResponse.json({ error: "Không thể tải file đề." }, { status: 500 });
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

    if (error) {
      if (!isMissingExamCodeColumn(error)) throw error;

      const { data: legacyData, error: legacyError } = await supabaseServer
        .from("exam_images")
        .select(EXAM_IMAGE_LEGACY_SELECT)
        .eq("route_slug", routeSlug)
        .order("created_at", { ascending: false });

      if (legacyError) throw legacyError;
      return NextResponse.json({ images: withDefaultExamCode(legacyData) });
    }

    return NextResponse.json({ images: withDefaultExamCode(data) });
  } catch (error) {
    console.warn("Không thể tải danh sách ảnh đề, trả về danh sách rỗng.", error);
    return NextResponse.json({ images: [] });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth || auth.user.role !== "admin") {
      return NextResponse.json(
        { error: "Chỉ admin mới được xóa file đề." },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => null)) as { id?: unknown; ids?: unknown } | null;
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    const ids = Array.isArray(body?.ids)
      ? body.ids.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      : [];
    const imageIds = Array.from(new Set(id ? [id, ...ids] : ids));

    if (!imageIds.length) {
      return NextResponse.json({ error: "Thiếu id file cần xóa." }, { status: 400 });
    }

    const { data: images, error: selectError } = await supabaseServer
      .from("exam_images")
      .select("id, storage_path")
      .in("id", imageIds);

    if (selectError) throw selectError;
    if (!images?.length) {
      return NextResponse.json({ error: "Không tìm thấy file đề." }, { status: 404 });
    }

    const storagePaths = images
      .map((image) => String(image.storage_path ?? ""))
      .filter(Boolean);

    if (!storagePaths.length) {
      return NextResponse.json({ error: "Không tìm thấy đường dẫn file đề." }, { status: 404 });
    }

    const { error: removeError } = await supabaseServer.storage
      .from(EXAM_IMAGE_BUCKET)
      .remove(storagePaths);

    if (removeError) throw removeError;

    const { error: deleteError } = await supabaseServer
      .from("exam_images")
      .delete()
      .in("id", images.map((image) => image.id));

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true, deletedCount: images.length });
  } catch (error) {
    console.error("Không thể xóa file đề.", error);
    return NextResponse.json({ error: "Không thể xóa file đề." }, { status: 500 });
  }
}
