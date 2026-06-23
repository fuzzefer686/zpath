import assert from "node:assert/strict";

import { buildSourceBundle } from "@/src/lib/admission-config/sources/buildSourceBundle";
import { fetchAdmissionSources } from "@/src/lib/admission-config/sources/fetchAdmissionSources";
import type { AdmissionSourceInput } from "@/src/lib/admission-config/sources/types";

async function run() {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("admission-page")) {
        return new Response(
          `
          <html>
            <body>
              <h1>Phương thức tuyển sinh</h1>
              <p>THPT và DGNL</p>
              <script>console.log("ignore");</script>
            </body>
          </html>
          `,
          { status: 200, headers: { "content-type": "text/html" } },
        );
      }

      if (url.includes("de-an.pdf")) {
        const bytes = new Uint8Array([37, 80, 68, 70, 45]); // %PDF-
        return new Response(bytes, {
          status: 200,
          headers: { "content-type": "application/pdf" },
        });
      }

      return new Response("Not found", { status: 404 });
    }) as typeof fetch;

    const inputs: AdmissionSourceInput[] = [
      {
        type: "url",
        value: "https://example.edu.vn/admission-page",
        role: "primary",
        label: "Trang tuyển sinh",
      },
      {
        type: "file_url",
        value: "https://example.edu.vn/de-an.pdf",
        role: "primary",
        label: "Đề án PDF",
      },
      {
        type: "text",
        value: "Lưu ý: yêu cầu IELTS >= 6.0",
        role: "supplement",
      },
      {
        type: "file_url",
        value: "https://example.edu.vn/de-an.docx",
        role: "supplement",
      },
      {
        type: "url",
        value: "http://127.0.0.1/private",
        role: "supplement",
      },
    ];

    const result = await fetchAdmissionSources(inputs);
    assert.equal(result.fetched.length, 3, "Should fetch html/pdf/text sources");
    assert.ok(
      result.report.some(
        (item) =>
          item.url?.includes("de-an.docx") &&
          item.status === "failed" &&
          item.error?.includes("DOC/DOCX"),
      ),
      "DOCX should be marked as unsupported",
    );
    assert.ok(
      result.report.some(
        (item) =>
          item.url?.includes("127.0.0.1") &&
          item.status === "failed" &&
          item.error?.includes("private"),
      ),
      "Private URL should be blocked",
    );

    const htmlSource = result.fetched.find(
      (item) => item.kind === "text" && item.url?.includes("admission-page"),
    );
    assert.ok(htmlSource, "HTML source should be fetched");
    assert.ok(
      htmlSource?.kind === "text" && htmlSource.text.includes("Phương thức tuyển sinh"),
      "HTML text should be normalized and preserved",
    );

    const pdfSource = result.fetched.find((item) => item.kind === "pdf");
    assert.ok(pdfSource, "PDF source should be fetched");
    assert.ok(pdfSource?.kind === "pdf" && pdfSource.pdfBase64.length > 0);

    const bundle = buildSourceBundle(result.fetched);
    assert.ok(bundle.promptContext.includes("[PRIMARY]"), "Prompt bundle should include role tags");
    assert.ok(bundle.primaryPdf, "Bundle should pick primary PDF");
    assert.ok(
      bundle.sourceUrl?.startsWith("https://"),
      "Bundle should expose first available source URL",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}

void run()
  .then(() => {
    console.log("admissionSourcePipeline.test.ts: all assertions passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
