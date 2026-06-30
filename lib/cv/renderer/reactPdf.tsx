// ReactPdfRenderer — default, deterministic, server-side only (Node.js runtime).
// Dispatches to 1 of 4 archetype layout components based on layout_config.archetype.
// Fonts: NotoSans + NotoSerif, BOTH with full Vietnamese diacritics.
// Run scripts/download-fonts.sh once to fetch the TTF files.
import path from "path";
import React from "react";
import { type DocumentProps, Font, renderToBuffer } from "@react-pdf/renderer";

import type { CVDocument } from "@/lib/cv/types";
import type { CVRenderer } from "./types";
import { buildPalette, resolveLayoutConfig } from "./layoutConfig";
import { ClassicDocument }   from "./archetypes/classic";
import { TwoColumnDocument } from "./archetypes/twoColumn";
import { SidebarDocument }   from "./archetypes/sidebar";
import { ModernDocument }    from "./archetypes/modern";

// ---------------------------------------------------------------------------
// Font registration (runs once per process).
// Only NotoSans and NotoSerif are registered — both cover full Vietnamese diacritics.
// Any fontFamily stored in layout_config is already normalised to one of these
// before this point (see layoutConfig.normalizeLayoutConfig).
// ---------------------------------------------------------------------------
const FONTS_DIR = path.join(process.cwd(), "public", "fonts");

Font.register({
  family: "NotoSans",
  fonts: [
    { src: path.join(FONTS_DIR, "NotoSans-Regular.ttf"),    fontWeight: 400 },
    { src: path.join(FONTS_DIR, "NotoSans-Bold.ttf"),       fontWeight: 700 },
    { src: path.join(FONTS_DIR, "NotoSans-Italic.ttf"),     fontWeight: 400, fontStyle: "italic" },
    { src: path.join(FONTS_DIR, "NotoSans-BoldItalic.ttf"), fontWeight: 700, fontStyle: "italic" },
  ],
});

Font.register({
  family: "NotoSerif",
  fonts: [
    { src: path.join(FONTS_DIR, "NotoSerif-Regular.ttf"),    fontWeight: 400 },
    { src: path.join(FONTS_DIR, "NotoSerif-Bold.ttf"),       fontWeight: 700 },
    { src: path.join(FONTS_DIR, "NotoSerif-Italic.ttf"),     fontWeight: 400, fontStyle: "italic" },
    { src: path.join(FONTS_DIR, "NotoSerif-BoldItalic.ttf"), fontWeight: 700, fontStyle: "italic" },
  ],
});

// Disable hyphenation for Vietnamese.
Font.registerHyphenationCallback((word) => [word]);

// ---------------------------------------------------------------------------
// Renderer — the single public export consumed by the API routes.
// ---------------------------------------------------------------------------
export class ReactPdfRenderer implements CVRenderer {
  async render(doc: CVDocument, templateId: string): Promise<Uint8Array> {
    const layout  = await resolveLayoutConfig(templateId);
    const palette = buildPalette(layout);

    let element: React.ReactElement<DocumentProps>;
    switch (layout.archetype) {
      case "two_column":
        element = <TwoColumnDocument doc={doc} layout={layout} palette={palette} /> as React.ReactElement<DocumentProps>;
        break;
      case "sidebar":
        element = <SidebarDocument doc={doc} layout={layout} palette={palette} /> as React.ReactElement<DocumentProps>;
        break;
      case "modern":
        element = <ModernDocument doc={doc} layout={layout} palette={palette} /> as React.ReactElement<DocumentProps>;
        break;
      default: // "classic" + unknown values
        element = <ClassicDocument doc={doc} layout={layout} palette={palette} /> as React.ReactElement<DocumentProps>;
    }

    const buffer = await renderToBuffer(element);
    return new Uint8Array(buffer);
  }
}
