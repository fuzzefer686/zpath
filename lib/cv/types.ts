// CVDocument — normalized contract returned by the get_cv_document(user_id) RPC.
// See plan §6.2. This is the single shape consumed by the renderer (T10) and the
// builder/preview UI. Field names match the RPC's jsonb keys exactly.

export type ExperienceType =
  | "work"
  | "volunteer"
  | "project"
  | "internship"
  | "competition"
  | "other";

export type SkillCategory = "technical" | "soft" | "language" | "tool" | "other";

export type AwardLevel =
  | "school"
  | "district"
  | "province"
  | "national"
  | "international";

export interface CVBasic {
  fullName: string | null;
  dob: string | null; // ISO date
  gender: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  avatarUrl: string | null;
}

export interface CVSummary {
  headline: string | null;
  objective: string | null;
  targetMajorCode: string | null;
  targetCareer: string | null;
}

export interface EducationItem {
  id: string;
  level: string;
  schoolName: string;
  schoolCode: string | null;
  gpa: number | null;
  grade10: number | null;
  grade11: number | null;
  grade12: number | null;
  subjects: Record<string, number> | null;
  startYear: number | null;
  endYear: number | null;
  isCurrent: boolean;
  linkedTranscriptId: string | null;
}

export interface ExperienceItem {
  id: string;
  type: ExperienceType;
  title: string;
  organization: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
}

export interface SkillItem {
  id: string;
  name: string;
  category: SkillCategory;
  proficiency: number | null;
  source: string;
  isConfirmed: boolean;
}

export interface CertItem {
  id: string;
  code: string; // raw cert_type_code
  displayName: string; // resolved from the cert catalog (fallback = code)
  inCatalog: boolean; // true iff code matches a real catalog certificate_type
  score: string | null;
  issuedDate: string | null;
  expiryDate: string | null;
  isVerified: boolean;
}

export interface AwardItem {
  id: string;
  title: string;
  level: AwardLevel;
  rank: string | null;
  issuer: string | null;
  awardYear: number | null;
}

export interface ActivityItem {
  id: string;
  title: string;
  role: string | null;
  organization: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  hours: number | null;
}

export interface PersonalityItem {
  id: string;
  testSlug: string;
  resultCode: string | null;
  scores: Record<string, unknown> | null;
  summary: string | null;
}

export interface SectionsConfig {
  order: string[];
  visibility: Record<string, boolean>;
}

export interface CVDocument {
  basic: CVBasic;
  summary: CVSummary;
  education: EducationItem[];
  experiences: ExperienceItem[];
  skills: SkillItem[];
  certificates: CertItem[];
  awards: AwardItem[];
  activities: ActivityItem[];
  personality: PersonalityItem[]; // only entries the user opted into (include_in_cv)
  sectionsConfig: SectionsConfig | Record<string, never>;
  completeness: number; // 0–100, config-driven (cv_section_weights)
  meta: { locale: string; generatedAt: string };
}
