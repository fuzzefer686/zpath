import { UNIVERSITIES, type University } from "@/data/universities";
import { createSchoolSlug } from "@/lib/school-slug";

export const UNIMAP_VISIBLE_CODES = ["HUST", "FTU", "VINUNI", "NEU"] as const;

export type UnimapVisibleCode = (typeof UNIMAP_VISIBLE_CODES)[number];

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
    website: asString(record.website, fallback.website),
    heroGradient: asString(
      record.heroGradient ?? record.hero_gradient,
      fallback.heroGradient,
    ),
    heroImageUrl: asString(
      record.heroImageUrl ?? record.hero_image_url,
      fallback.heroImageUrl,
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
