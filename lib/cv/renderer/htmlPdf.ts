// Playwright HTML→PDF renderer (optional, not activated by default).
// Activate when complex CSS templates are needed and Playwright is available.
import type { CVRenderer } from "./types";
import type { CVDocument } from "@/lib/cv/types";

export class HtmlPdfRenderer implements CVRenderer {
  async render(_doc: CVDocument, _templateId: string): Promise<Uint8Array> {
    throw new Error(
      "HtmlPdfRenderer is not enabled. Install Playwright and implement this adapter.",
    );
  }
}
