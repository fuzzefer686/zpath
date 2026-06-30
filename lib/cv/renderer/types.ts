import type { CVDocument } from "@/lib/cv/types";

// Adapter contract for swapping PDF engines without touching business logic.
// Only ReactPdfRenderer is enabled by default (FEATURES.externalRenderer = false).
export interface CVRenderer {
  render(doc: CVDocument, templateId: string): Promise<Uint8Array>;
}
