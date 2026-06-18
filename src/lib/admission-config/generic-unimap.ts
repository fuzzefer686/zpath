import "server-only";

import type { School } from "@/src/types/admission-data";
import type { University } from "@/data/universities";
import { createSchoolSlug } from "@/lib/school-slug";
import type { GenericAdmissionConfig } from "@/src/lib/admission-engine/generic";

const STATIC_DEDICATED_CODES = new Set(["HUST", "FTU", "UET", "NEU", "VINUNI"]);

export function isStaticDedicatedSchool(code: string): boolean {
  return STATIC_DEDICATED_CODES.has(code.toUpperCase());
}

/**
 * Builds minimal School + University records for a published generic config school.
 */
export function buildGenericUnimapRecords(config: GenericAdmissionConfig): {
  school: School;
  university: University;
} {
  const primaryColor = config.branding?.primaryColor ?? "#6366f1";
  const school: School = {
    id: `generic-${config.schoolCode.toLowerCase()}`,
    code: config.schoolCode,
    name: config.schoolName,
    slug: createSchoolSlug(config.schoolName),
    english_name: null,
    type: "Đại học",
    city: null,
    address: null,
    website: config.sourceUrl ?? null,
    fanpage: null,
    hero_image_url: config.branding?.heroImageUrl ?? null,
    description: `Thông tin tuyển sinh ${config.schoolName} năm ${config.year}.`,
    source_url: config.sourceUrl ?? null,
    last_checked_at: null,
    created_at: null,
    updated_at: null,
  };

  const university: University = {
    code: config.schoolCode,
    name: config.schoolName,
    shortDesc: `Tuyển sinh ${config.year}`,
    tags: ["Auto-generated"],
    city: "",
    website: config.sourceUrl ?? "",
    heroGradient: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}99)`,
    heroImageUrl: config.branding?.heroImageUrl ?? "",
    unimapImageUrl: config.branding?.heroImageUrl ?? "",
    about: school.description ?? "",
    highlights: [],
    majors: (config.programs ?? []).map((program) => program.programName),
    channels: [],
    programs: [],
    avatarUrl: config.branding?.logoUrl ?? "",
  };

  return { school, university };
}

export function matchesGenericUnimapRoute(
  routeParam: string,
  config: GenericAdmissionConfig,
): boolean {
  const normalized = routeParam.toLowerCase();
  return (
    config.schoolCode.toLowerCase() === normalized ||
    createSchoolSlug(config.schoolName) === normalized
  );
}
