import JSZip from "jszip";
import { NextResponse } from "next/server";

import type { ExamDocumentType } from "@/lib/static-news-routes";
import { supabaseServer } from "@/src/lib/db/supabaseServer";

export const runtime = "nodejs";

const EXAM_IMAGE_BUCKET = "exam-images";
const MAX_DOWNLOAD_FILES = 80;
const EXAM_IMAGE_SELECT = "id, subject, document_type, exam_code, storage_path, mime_type, created_at";

type ExamImageDownloadRow = {
  id: string;
  subject: string;
  document_type: ExamDocumentType;
  exam_code: string | null;
  storage_path: string;
  mime_type: string;
  created_at: string;
};

function sanitizeFileNamePart(value: string) {
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

function getExtension(image: ExamImageDownloadRow) {
  const pathExtension = image.storage_path.split(".").pop()?.toLowerCase();
  if (pathExtension && /^[a-z0-9]{2,10}$/.test(pathExtension)) return pathExtension;
  if (image.mime_type === "application/pdf") return "pdf";

  const mimeExtension = image.mime_type.split("/")[1]?.toLowerCase();
  return mimeExtension && /^[a-z0-9.+-]{2,20}$/.test(mimeExtension)
    ? mimeExtension.replace("+", "-")
    : "file";
}

function createZipEntryName(image: ExamImageDownloadRow, index: number) {
  const documentType = image.document_type === "dap_an" ? "dap-an" : "de";
  const subject = sanitizeFileNamePart(image.subject || "mon-thi") || "mon-thi";
  const examCode = image.exam_code ? `-ma-${image.exam_code}` : "";
  const pageNumber = String(index + 1).padStart(2, "0");

  return `${pageNumber}-${documentType}-${subject}${examCode}.${getExtension(image)}`;
}

function createDownloadFileName(images: ExamImageDownloadRow[]) {
  const firstImage = images[0];
  if (!firstImage) return "de-thi.zip";

  const documentType = firstImage.document_type === "dap_an" ? "dap-an" : "de";
  const subject = sanitizeFileNamePart(firstImage.subject || "mon-thi") || "mon-thi";
  const examCode = firstImage.exam_code ? `-ma-${firstImage.exam_code}` : "";

  return `${documentType}-${subject}${examCode}.zip`;
}

function encodeContentDispositionFileName(fileName: string) {
  return `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { ids?: unknown } | null;
    const ids = Array.isArray(body?.ids)
      ? body.ids.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      : [];
    const imageIds = Array.from(new Set(ids)).slice(0, MAX_DOWNLOAD_FILES);

    if (!imageIds.length) {
      return NextResponse.json({ error: "Thiếu danh sách file cần tải." }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from("exam_images")
      .select(EXAM_IMAGE_SELECT)
      .in("id", imageIds)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const images = (data ?? []).filter((image): image is ExamImageDownloadRow => Boolean(image.storage_path));
    if (!images.length) {
      return NextResponse.json({ error: "Không tìm thấy file đề để tải." }, { status: 404 });
    }

    const zip = new JSZip();
    let addedFileCount = 0;

    for (const [index, image] of images.entries()) {
      const { data: fileBlob, error: downloadError } = await supabaseServer.storage
        .from(EXAM_IMAGE_BUCKET)
        .download(image.storage_path);

      if (downloadError || !fileBlob) {
        console.warn("Không thể thêm file vào ZIP.", { id: image.id, storagePath: image.storage_path, downloadError });
        continue;
      }

      zip.file(createZipEntryName(image, index), Buffer.from(await fileBlob.arrayBuffer()));
      addedFileCount += 1;
    }

    if (addedFileCount === 0) {
      return NextResponse.json({ error: "Không thể tải bất kỳ file đề nào." }, { status: 404 });
    }

    const zipBytes = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
    const fileName = createDownloadFileName(images);

    return new NextResponse(zipBytes, {
      headers: {
        "content-type": "application/zip",
        "content-disposition": encodeContentDispositionFileName(fileName),
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("Không thể tạo file ZIP đề thi.", error);
    return NextResponse.json({ error: "Không thể tạo file tải xuống." }, { status: 500 });
  }
}
