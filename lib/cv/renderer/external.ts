// External CV API renderer — OFF by default (FEATURES.externalRenderer = false).
// Blocked until DPA review + cross-border transfer assessment + user consent flow
// are complete (§13.7 / Luật 91/2025). Do NOT enable without legal clearance.
import type { CVRenderer } from "./types";
import type { CVDocument } from "@/lib/cv/types";

export class ExternalApiRenderer implements CVRenderer {
  async render(_doc: CVDocument, _templateId: string): Promise<Uint8Array> {
    throw new Error(
      "ExternalApiRenderer is permanently disabled. Set FEATURES.externalRenderer = true only after DPA review.",
    );
  }
}
