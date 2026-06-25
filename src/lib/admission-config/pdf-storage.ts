import "server-only";

import { supabaseServer } from "@/src/lib/db/supabaseServer";

const BUCKET = "admission-pdfs";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

function sanitizeSegment(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .toLowerCase();
}

export type UploadAdmissionPdfInput = {
  schoolCode: string;
  year: number;
  bytes: Buffer;
  originalName?: string;
};

export type UploadAdmissionPdfResult = {
  path: string;
  signedUrl: string | null;
};

/**
 * Uploads a source admission PDF to the private `admission-pdfs` bucket and
 * returns its storage path plus a short-lived signed URL for admin preview.
 */
export async function uploadAdmissionPdf(
  input: UploadAdmissionPdfInput,
): Promise<UploadAdmissionPdfResult> {
  const safeName = sanitizeSegment(input.originalName ?? "source.pdf") || "source.pdf";
  const fileName = safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`;
  const path = `${sanitizeSegment(input.schoolCode)}/${input.year}/${Date.now()}-${fileName}`;

  const { error: uploadError } = await supabaseServer.storage
    .from(BUCKET)
    .upload(path, input.bytes, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Không thể tải PDF lên storage: ${uploadError.message}`);
  }

  const { data: signed } = await supabaseServer.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  return { path, signedUrl: signed?.signedUrl ?? null };
}

/** Re-issues a signed URL for an existing stored PDF (admin preview). */
export async function getAdmissionPdfSignedUrl(
  path: string,
): Promise<string | null> {
  const { data } = await supabaseServer.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  return data?.signedUrl ?? null;
}
