import {
  type AdmissionFetchedPdfSource,
  type AdmissionFetchedSource,
  type AdmissionSourceInput,
  type AdmissionSourceRole,
  type FetchAdmissionSourcesResult,
  type SourceReportItem,
} from "./types";

const SOURCE_TIMEOUT_MS = 15_000;
const MAX_REMOTE_BYTES = 20 * 1024 * 1024;
const MAX_TEXT_CHARS = 120_000;

function normalizeSourceRole(role: unknown): AdmissionSourceRole {
  return role === "primary" ? "primary" : "supplement";
}

function sanitizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripHtml(value: string): string {
  return sanitizeText(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<\/?(br|p|div|li|h[1-6]|tr|table|section|article|main|header|footer)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  );
}

function parseHostnameAsIpv4(hostname: string): number[] | null {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) return null;
  const octets = hostname.split(".").map((segment) => Number(segment));
  if (octets.some((segment) => segment < 0 || segment > 255)) return null;
  return octets;
}

function isPrivateHostname(hostname: string): boolean {
  const lowered = hostname.toLowerCase();
  if (
    lowered === "localhost" ||
    lowered.endsWith(".localhost") ||
    lowered.endsWith(".local")
  ) {
    return true;
  }

  const ipv4 = parseHostnameAsIpv4(lowered);
  if (ipv4) {
    const [a, b] = ipv4;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }

  const ipv6 = lowered.replace(/^\[|\]$/g, "");
  if (
    ipv6 === "::1" ||
    ipv6.startsWith("fc") ||
    ipv6.startsWith("fd") ||
    ipv6.startsWith("fe80") ||
    ipv6.startsWith("::ffff:127.")
  ) {
    return true;
  }

  return false;
}

function assertSafeSourceUrl(value: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("URL không hợp lệ.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Chỉ hỗ trợ URL http/https.");
  }

  if (isPrivateHostname(parsed.hostname)) {
    throw new Error("URL nội bộ/private không được phép.");
  }

  return parsed;
}

function looksLikePdfUrl(url: URL): boolean {
  return /\.pdf(?:$|\?)/i.test(url.pathname + url.search);
}

function looksLikeDocUrl(url: URL): boolean {
  return /\.(doc|docx)(?:$|\?)/i.test(url.pathname + url.search);
}

function truncate(value: string, maxChars = MAX_TEXT_CHARS): string {
  return value.length <= maxChars ? value : value.slice(0, maxChars);
}

function resolveFileName(url: URL): string {
  const tail = url.pathname.split("/").filter(Boolean).at(-1);
  if (!tail) return "source.pdf";
  return tail.toLowerCase().endsWith(".pdf") ? tail : `${tail}.pdf`;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
}

function asPdfSource(args: {
  input: AdmissionSourceInput;
  role: AdmissionSourceRole;
  parsedUrl: URL;
  bytes: Buffer;
}): AdmissionFetchedPdfSource {
  return {
    kind: "pdf",
    type: args.input.type,
    role: args.role,
    label: args.input.label,
    url: args.parsedUrl.toString(),
    pdfBase64: args.bytes.toString("base64"),
    bytes: args.bytes,
    originalName: resolveFileName(args.parsedUrl),
  };
}

export async function fetchAdmissionSources(
  rawInputs: AdmissionSourceInput[],
): Promise<FetchAdmissionSourcesResult> {
  const fetched: AdmissionFetchedSource[] = [];
  const report: SourceReportItem[] = [];
  const warnings: string[] = [];

  for (const rawInput of rawInputs) {
    const role = normalizeSourceRole(rawInput.role);
    const input: AdmissionSourceInput = {
      ...rawInput,
      role,
      label: rawInput.label?.trim() || undefined,
      value: String(rawInput.value ?? "").trim(),
    };

    if (!input.value) {
      report.push({
        type: input.type,
        role,
        label: input.label,
        status: "skipped",
        error: "Nguồn rỗng.",
      });
      continue;
    }

    if (input.type === "text") {
      const text = truncate(sanitizeText(input.value));
      if (!text) {
        report.push({
          type: input.type,
          role,
          label: input.label,
          status: "skipped",
          error: "Nội dung text rỗng sau khi chuẩn hóa.",
        });
        continue;
      }

      fetched.push({
        kind: "text",
        type: "text",
        role,
        label: input.label,
        text,
      });
      report.push({
        type: "text",
        role,
        label: input.label,
        status: "fetched",
        charCount: text.length,
      });
      continue;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = assertSafeSourceUrl(input.value);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "URL nguồn không hợp lệ.";
      report.push({
        type: input.type,
        role,
        label: input.label,
        url: input.value,
        status: "failed",
        error: message,
      });
      warnings.push(`Nguồn "${input.value}" bị bỏ qua: ${message}`);
      continue;
    }

    if (looksLikeDocUrl(parsedUrl)) {
      const message = "DOC/DOCX chưa được hỗ trợ ở Phase 1–2.";
      report.push({
        type: input.type,
        role,
        label: input.label,
        url: parsedUrl.toString(),
        status: "failed",
        error: message,
      });
      warnings.push(`Nguồn "${parsedUrl}" bị bỏ qua: ${message}`);
      continue;
    }

    try {
      const response = await fetchWithTimeout(parsedUrl.toString());
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      const isPdf =
        contentType.includes("application/pdf") || looksLikePdfUrl(parsedUrl);
      const isDoc =
        contentType.includes("application/msword") ||
        contentType.includes(
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        );

      if (isDoc) {
        throw new Error("DOC/DOCX chưa được hỗ trợ ở Phase 1–2.");
      }

      if (isPdf) {
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length === 0) {
          throw new Error("PDF rỗng.");
        }
        if (bytes.length > MAX_REMOTE_BYTES) {
          throw new Error("PDF vượt quá giới hạn 20MB.");
        }

        fetched.push(
          asPdfSource({
            input,
            role,
            parsedUrl,
            bytes,
          }),
        );

        report.push({
          type: input.type,
          role,
          label: input.label,
          url: parsedUrl.toString(),
          status: "fetched",
        });
        continue;
      }

      const rawText = await response.text();
      const normalizedText = truncate(
        contentType.includes("text/html") ? stripHtml(rawText) : sanitizeText(rawText),
      );

      if (!normalizedText) {
        throw new Error("Không đọc được nội dung text từ URL.");
      }

      fetched.push({
        kind: "text",
        type: input.type,
        role,
        label: input.label,
        url: parsedUrl.toString(),
        text: normalizedText,
      });

      report.push({
        type: input.type,
        role,
        label: input.label,
        url: parsedUrl.toString(),
        status: "fetched",
        charCount: normalizedText.length,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể tải nguồn.";
      report.push({
        type: input.type,
        role,
        label: input.label,
        url: parsedUrl.toString(),
        status: "failed",
        error: message,
      });
      warnings.push(`Nguồn "${parsedUrl}" thất bại: ${message}`);
    }
  }

  return { fetched, report, warnings };
}
