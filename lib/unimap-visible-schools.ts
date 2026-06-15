import { UNIVERSITIES, type University } from "@/data/universities";
import { createSchoolSlug } from "@/lib/school-slug";

export const UNIMAP_VISIBLE_CODES = ["HUST", "FTU", "NEU", "UET", "VINUNI"] as const;

export type UnimapVisibleCode = (typeof UNIMAP_VISIBLE_CODES)[number];

// Codes in UNIMAP_VISIBLE_CODES are "curated": they have rich local data
// (logos, gradients, static program fallbacks, branded detail themes). Every
// other school surfaced from the database renders with this default gradient.
const DEFAULT_HERO_GRADIENT = "from-sky-500 via-indigo-500 to-purple-600";

const VISIBLE_CODE_SET = new Set<string>(UNIMAP_VISIBLE_CODES);
const LOCAL_UNIVERSITY_BY_CODE = new Map(
  UNIVERSITIES.map((university) => [university.code.toUpperCase(), university]),
);

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asStringArray(value: unknown, fallback: string[]) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : fallback;
}

export function isVisibleUnimapCode(code: string): code is UnimapVisibleCode {
  return VISIBLE_CODE_SET.has(code.toUpperCase());
}

export function normalizeUniversityRecord(value: unknown): University | null {
  if (typeof value !== "object" || value === null) return null;

  const record = value as Record<string, unknown>;
  const code = asString(record.code).toUpperCase();
  if (!isVisibleUnimapCode(code)) return null;

  const fallback = LOCAL_UNIVERSITY_BY_CODE.get(code);
  if (!fallback) return null;

  return {
    ...fallback,
    code,
    name: asString(record.name, fallback.name),
    shortDesc: asString(record.shortDesc ?? record.short_desc, fallback.shortDesc),
    tags: asStringArray(record.tags, fallback.tags),
    city: asString(record.city, fallback.city),
    type: asString(record.type ?? record.university_type, fallback.type ?? ""),
    website: asString(record.website, fallback.website),
    heroGradient: asString(
      record.heroGradient ?? record.hero_gradient,
      fallback.heroGradient,
    ),
    heroImageUrl: asString(
      record.heroImageUrl ?? record.hero_image_url,
      fallback.heroImageUrl,
    ),
    unimapImageUrl: asString(
      record.unimapImageUrl ?? record.unimap_image_url,
      fallback.unimapImageUrl,
    ),
    about: asString(record.about, fallback.about),
    highlights: asStringArray(record.highlights, fallback.highlights),
    majors: asStringArray(record.majors, fallback.majors),
    channels: fallback.channels,
    programs: fallback.programs,
    avatarUrl: asString(record.avatarUrl ?? record.avatar_url, fallback.avatarUrl),
  };
}

export function getVisibleUnimapUniversities(records: unknown[] = []) {
  const universityByCode = new Map<UnimapVisibleCode, University>();

  for (const record of records) {
    const university = normalizeUniversityRecord(record);
    if (university) {
      universityByCode.set(university.code as UnimapVisibleCode, university);
    }
  }

  for (const code of UNIMAP_VISIBLE_CODES) {
    if (!universityByCode.has(code)) {
      const fallback = LOCAL_UNIVERSITY_BY_CODE.get(code);
      if (fallback) universityByCode.set(code, fallback);
    }
  }

  return UNIMAP_VISIBLE_CODES.map((code) => universityByCode.get(code)).filter(
    (university): university is University => Boolean(university),
  );
}

/**
 * Build a University from any DB record (a `schools` or `universities` row),
 * without requiring a local entry. Curated codes are enriched with their local
 * data (logo, gradient, static programs); every other school falls back to the
 * record's own fields plus sensible defaults so it can still be listed and
 * opened. Returns null only when the record has no usable code/name.
 */
export function mapRecordToUniversity(value: unknown): University | null {
  if (typeof value !== "object" || value === null) return null;

  const record = value as Record<string, unknown>;
  const code = asString(record.code).toUpperCase();
  if (!code) return null;

  const local = LOCAL_UNIVERSITY_BY_CODE.get(code);
  const name = asString(record.name, local?.name ?? code);
  if (!name) return null;

  const type = asString(record.type ?? record.university_type);
  const optional = (value: string) => (value ? value : undefined);

  return {
    code,
    name,
    shortDesc: asString(record.shortDesc ?? record.short_desc, local?.shortDesc ?? type),
    tags: asStringArray(record.tags, local?.tags ?? (type ? [type] : [])),
    city: asString(record.city ?? record.province, local?.city ?? ""),
    type: type || local?.type || undefined,
    website: optional(asString(record.website, local?.website ?? "")),
    heroGradient: asString(
      record.heroGradient ?? record.hero_gradient,
      local?.heroGradient ?? DEFAULT_HERO_GRADIENT,
    ),
    heroImageUrl: optional(
      asString(record.heroImageUrl ?? record.hero_image_url, local?.heroImageUrl ?? ""),
    ),
    unimapImageUrl: optional(
      asString(record.unimapImageUrl ?? record.unimap_image_url, local?.unimapImageUrl ?? ""),
    ),
    about: asString(record.about ?? record.description, local?.about ?? ""),
    highlights: asStringArray(record.highlights, local?.highlights ?? []),
    majors: asStringArray(record.majors, local?.majors ?? []),
    programs: local?.programs,
    channels: local?.channels,
    avatarUrl: optional(asString(record.avatarUrl ?? record.avatar_url, local?.avatarUrl ?? "")),
  };
}

/**
 * Map every DB record to a University (curated first, then the rest A→Z). Used
 * by the UniMap listing so all schools with data show up, not just the curated
 * five. Falls back to the local curated list when no records are provided.
 */
export function getAllUnimapUniversities(records: unknown[] = []): University[] {
  const byCode = new Map<string, University>();

  for (const record of records) {
    const university = mapRecordToUniversity(record);
    if (university) byCode.set(university.code, university);
  }

  if (byCode.size === 0) {
    for (const code of UNIMAP_VISIBLE_CODES) {
      const fallback = LOCAL_UNIVERSITY_BY_CODE.get(code);
      if (fallback) byCode.set(code, fallback);
    }
  }

  const curated = UNIMAP_VISIBLE_CODES.filter((code) => byCode.has(code)).map(
    (code) => byCode.get(code) as University,
  );
  const rest = [...byCode.values()]
    .filter((university) => !VISIBLE_CODE_SET.has(university.code))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  return [...curated, ...rest];
}

export function findVisibleUnimapUniversityByRouteParam(
  routeParam: string,
  universities = getVisibleUnimapUniversities(),
) {
  const normalizedRouteParam = routeParam.toLowerCase();

  return universities.find(
    (university) =>
      university.code.toLowerCase() === normalizedRouteParam ||
      createSchoolSlug(university.name) === normalizedRouteParam,
  ) ?? null;
}
