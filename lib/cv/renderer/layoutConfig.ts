// Template layout config — the bridge that makes cv_templates.layout_config
// actually drive the rendered PDF (colours, font, sizing, spacing, section order).
//
// Pure module: schema + normalisation + colour derivation only. The DB lookup
// (resolveLayoutConfig) lazily imports supabaseServer so this file can be loaded
// in environments without server env vars (e.g. the eval harness using only the
// built-in "default" template).
import { z } from "zod";

// ---------------------------------------------------------------------------
// Fonts — ONLY families registered with full Vietnamese diacritics may appear
// here. Both Noto families ship complete Vietnamese coverage. Any other family
// name in a stored template is mapped onto one of these (see LEGACY_FONT_MAP)
// so a CV can NEVER lose its diacritics, regardless of what is in the DB.
// ---------------------------------------------------------------------------
export const FONT_FAMILIES = ["NotoSans", "NotoSerif"] as const;
export type CvFontFamily = (typeof FONT_FAMILIES)[number];

// Legacy / non-VN family names → a safe Vietnamese-capable substitute.
const LEGACY_FONT_MAP: Record<string, CvFontFamily> = {
  inter: "NotoSans",
  outfit: "NotoSerif",
  roboto: "NotoSans",
  "open sans": "NotoSans",
  lato: "NotoSans",
  poppins: "NotoSans",
  montserrat: "NotoSerif",
  merriweather: "NotoSerif",
  georgia: "NotoSerif",
  "times new roman": "NotoSerif",
  serif: "NotoSerif",
  "sans-serif": "NotoSans",
};

function coerceFontFamily(raw: unknown): CvFontFamily | undefined {
  if (typeof raw !== "string") return undefined;
  const exact = FONT_FAMILIES.find((f) => f.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;
  return LEGACY_FONT_MAP[raw.trim().toLowerCase()];
}

// ---------------------------------------------------------------------------
// Schema — every field defaults + .catch() so a malformed/partial layout_config
// degrades gracefully to the default look instead of throwing at render time.
// ---------------------------------------------------------------------------
const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const hexColor = (fallback: string) =>
  z.string().regex(HEX).catch(fallback);

export const SPACING_OPTIONS = ["compact", "comfortable", "spacious"] as const;
export const DENSITY_OPTIONS = ["compact", "normal", "relaxed"] as const;
export const ARCHETYPE_OPTIONS = ["classic", "two_column", "sidebar", "modern"] as const;
export type CvArchetype = (typeof ARCHETYPE_OPTIONS)[number];

const DEFAULT_SECTIONS_ORDER = [
  "basic",
  "summary",
  "education",
  "experience_skills",
  "certs_awards",
  "activities",
  "personality",
];

export const layoutConfigSchema = z.object({
  themeColor: hexColor("#4F46E5"),
  accentColor: hexColor("#4F46E5"),
  fontFamily: z.enum(FONT_FAMILIES).catch("NotoSans"),
  fontScale: z.coerce.number().min(0.8).max(1.4).catch(1),
  spacing: z.enum(SPACING_OPTIONS).catch("comfortable"),
  density: z.enum(DENSITY_OPTIONS).catch("normal"),
  showPhoto: z.coerce.boolean().catch(true),
  sectionsOrder: z.array(z.string()).nonempty().catch(DEFAULT_SECTIONS_ORDER),
  // Bố cục trang: classic=1 cột, two_column=2 cột, sidebar=dải màu, modern=header accent
  archetype: z.enum(ARCHETYPE_OPTIONS).catch("classic"),
});

export type LayoutConfig = z.infer<typeof layoutConfigSchema>;

export const DEFAULT_LAYOUT: LayoutConfig = layoutConfigSchema.parse({});

// Normalise an arbitrary stored layout_config into a safe LayoutConfig. Maps
// legacy font names onto a VN-capable family BEFORE validation, so old rows
// (e.g. fontFamily "Inter"/"Outfit") render with proper diacritics.
export function normalizeLayoutConfig(raw: unknown): LayoutConfig {
  const obj = raw && typeof raw === "object" ? { ...(raw as Record<string, unknown>) } : {};
  const mappedFont = coerceFontFamily(obj.fontFamily);
  if (mappedFont) obj.fontFamily = mappedFont;
  else delete obj.fontFamily; // let schema apply the default

  const parsed = layoutConfigSchema.safeParse(obj);
  return parsed.success ? parsed.data : DEFAULT_LAYOUT;
}

// ---------------------------------------------------------------------------
// Colour derivation (pure) — turn the 2 configured colours into the full
// palette the stylesheet needs. No clock / RNG (keeps the renderer a pure fn).
// ---------------------------------------------------------------------------
function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function parseHexRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const int = parseInt(h, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function toHex(r: number, g: number, b: number): string {
  const h = (n: number) => clampByte(n).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

// Mix a colour toward white. ratio 0 = original, 1 = white. Used for tints.
export function tint(hex: string, ratio: number): string {
  const { r, g, b } = parseHexRgb(hex);
  return toHex(r + (255 - r) * ratio, g + (255 - g) * ratio, b + (255 - b) * ratio);
}

// Darken a colour toward black. ratio 0 = original, 1 = black.
export function shade(hex: string, ratio: number): string {
  const { r, g, b } = parseHexRgb(hex);
  return toHex(r * (1 - ratio), g * (1 - ratio), b * (1 - ratio));
}

export interface Palette {
  primary: string;
  accent: string;
  text: string;
  muted: string;
  border: string;
  bg: string;
  white: string;
  badge: string;
  badgeText: string;
  summaryBg: string;
}

export function buildPalette(layout: LayoutConfig): Palette {
  return {
    primary: layout.themeColor,
    accent: layout.accentColor,
    text: "#1F2937",
    muted: "#6B7280",
    border: "#E5E7EB",
    white: "#FFFFFF",
    bg: tint(layout.themeColor, 0.96),
    badge: tint(layout.accentColor, 0.9),
    badgeText: shade(layout.accentColor, 0.15),
    summaryBg: tint(layout.themeColor, 0.94),
  };
}

// ---------------------------------------------------------------------------
// Spacing / density tokens — the numbers the stylesheet reads.
// ---------------------------------------------------------------------------
export const SPACING_TOKENS: Record<
  (typeof SPACING_OPTIONS)[number],
  { pagePadding: string; sectionTop: number; headerBottom: number; twoColGap: number }
> = {
  compact: { pagePadding: "20px 28px", sectionTop: 8, headerBottom: 10, twoColGap: 10 },
  comfortable: { pagePadding: "28px 36px", sectionTop: 12, headerBottom: 16, twoColGap: 12 },
  spacious: { pagePadding: "38px 46px", sectionTop: 18, headerBottom: 22, twoColGap: 16 },
};

export const DENSITY_TOKENS: Record<
  (typeof DENSITY_OPTIONS)[number],
  { lineHeight: number; entryBottom: number }
> = {
  compact: { lineHeight: 1.35, entryBottom: 5 },
  normal: { lineHeight: 1.5, entryBottom: 7 },
  relaxed: { lineHeight: 1.7, entryBottom: 10 },
};

// ---------------------------------------------------------------------------
// DB lookup — lazily imports supabaseServer so this module stays usable in
// envs without server credentials (the built-in "default" never touches the DB).
// Resilient: any failure falls back to DEFAULT_LAYOUT rather than breaking export.
// ---------------------------------------------------------------------------
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function resolveLayoutConfig(templateId?: string | null): Promise<LayoutConfig> {
  if (!templateId || templateId === "default") return DEFAULT_LAYOUT;
  try {
    const { supabaseServer } = await import("@/src/lib/db/supabaseServer");
    const column = UUID_RE.test(templateId) ? "id" : "slug";
    const { data, error } = await supabaseServer
      .from("cv_templates")
      .select("layout_config")
      .eq(column, templateId)
      .eq("is_active", true)
      .maybeSingle();
    if (error || !data) return DEFAULT_LAYOUT;
    return normalizeLayoutConfig(data.layout_config);
  } catch {
    return DEFAULT_LAYOUT;
  }
}
