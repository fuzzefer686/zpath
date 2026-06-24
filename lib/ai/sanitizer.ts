// Server-only guard (matches src/lib/db/supabaseServer.ts convention): the
// sanitizer and its in-memory placeholder map must never reach the client bundle.
if (typeof window !== "undefined") {
  throw new Error("lib/ai/sanitizer must only be imported from server-side code.");
}

/**
 * ZPath CV Builder — T13: AI de-identify / sanitizer (plan §13.7, layer 1).
 *
 * This is the SINGLE gate before any Vertex AI call. Data sent abroad must be
 * NON-identifiable so the cross-border transfer is no longer personal data
 * (Luật 91/2025 + NĐ 356/2025). A call that would bypass this must not run.
 *
 * Defense in depth (hardened after an adversarial PII-leak audit):
 *   1. Allow-list: only specific fields are ever considered.
 *   2. Every free-text field — incl. all structured strings (skill name,
 *      cert score, award rank, activity role, subject keys) — is routed through
 *      cleanText(): known entities are tokenized + regex PII is redacted.
 *   3. Regex scrubbing tolerates real-world formats: phones with spaces/dots,
 *      international numbers, schemeless URLs/shorteners, dates in prose,
 *      honorific-triggered third-party names, and address phrases.
 *   4. Masking is diacritic/case/whitespace-insensitive (Vietnamese users type
 *      names without diacritics), with Unicode word boundaries.
 *   5. Fail closed: a folded substring/word-boundary assert throws if any
 *      registered entity or hard-PII value survives into the payload.
 *
 * Known residual (documented, not silently ignored): a bare 1–3 character
 * third-party given name with no honorific trigger ("...cùng An làm dự án") is
 * indistinguishable from common Vietnamese words and is NOT auto-redacted —
 * doing so would corrupt ordinary text. This residual is bounded by §13.7
 * layer 4 (zero-retention at the model) + overall data minimization, and the
 * caller may skip AI entirely (skipAiRecommended / rule-based fallback).
 */

// ---------------------------------------------------------------------------
// Public types (stable API)
// ---------------------------------------------------------------------------
export type AiTask =
  | "enrich_summary"
  | "suggest_skills"
  | "analyze_skill_gap"
  | "analyze_cert_gap"
  | "recommend_courses"
  | "suggest_career_direction";

export interface FullProfileEducation {
  level: string | null;
  gpa: number | null;
  grade10: number | null;
  grade11: number | null;
  grade12: number | null;
  subjects: Record<string, number> | null;
  schoolName: string | null; // PII — never sent; used to scrub free text
  startYear?: number | null;
  endYear?: number | null;
}

export interface FullProfileSkill {
  name: string;
  category: string;
  proficiency: number | null;
}

export interface FullProfileCertificate {
  certTypeCode: string;
  score: string | null;
  evidenceUrl?: string | null; // PII-ish (path) — dropped
}

export interface FullProfileAward {
  title: string | null;
  level: string | null;
  rank: string | null;
  year: number | null;
  issuer?: string | null; // may be a person's name — dropped + masked
}

export interface FullProfileExperience {
  type?: string | null;
  title: string | null;
  description: string | null;
  organization?: string | null; // PII — sent only as [ORG_n] placeholder
  role?: string | null;
  hours?: number | null;
}

export interface FullProfileActivity {
  type?: string | null;
  role: string | null;
  hours: number | null;
  title: string | null;
  description: string | null;
  organization?: string | null; // PII — sent only as [ORG_n] placeholder
}

export interface FullProfile {
  // Hard PII — never sent.
  fullName: string | null;
  dateOfBirth: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  avatarUrl: string | null;
  // Intent.
  targetMajorCode: string | null;
  targetCareer: string | null;
  // Profile-level free text.
  headline?: string | null;
  objective?: string | null;
  // Blocks.
  education: FullProfileEducation[];
  skills: FullProfileSkill[];
  certificates: FullProfileCertificate[];
  awards: FullProfileAward[];
  experiences?: FullProfileExperience[];
  activities: FullProfileActivity[];
  /** MBTI/SBTI code (e.g. 'INTJ') when user opted in via include_in_cv. Not PII. */
  personalityType?: string | null;
}

export interface SanitizeOptions {
  isUnder16: boolean;
  /** Optional sink for the SANITIZED payload only. Raw profile is never logged. */
  logger?: (event: string, data: unknown) => void;
}

export interface SanitizeResult {
  payload: Record<string, unknown>;
  restore: (text: string) => string;
  skipAiRecommended: boolean;
}

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Lowercase + strip diacritics + collapse whitespace. For matching/asserting. */
function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

// Vietnamese diacritic equivalence classes — lets masking match "Lê" and "le".
const FOLD_CLASS: Record<string, string> = {
  a: "aàáảãạăằắẳẵặâầấẩẫậ",
  e: "eèéẻẽẹêềếểễệ",
  i: "iìíỉĩị",
  o: "oòóỏõọôồốổỗộơờớởỡợ",
  u: "uùúủũụưừứửữự",
  y: "yỳýỷỹỵ",
  d: "dđ",
};

/** Build a diacritic/case/whitespace-insensitive pattern for a known value. */
function tolerantPattern(value: string): string {
  const base = value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  let out = "";
  for (const ch of base) {
    if (/\s/.test(ch)) { out += "\\s+"; continue; }
    const cls = FOLD_CLASS[ch];
    if (cls) out += `[${cls}${cls.toUpperCase()}]`;
    else if (/[a-z]/.test(ch)) out += `[${ch}${ch.toUpperCase()}]`;
    else out += escapeRegExp(ch);
  }
  return out;
}

/** Match a known value as a whole word, ignoring case/diacritics/spacing. */
function tokenRegex(value: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])${tolerantPattern(value)}(?![\\p{L}\\p{N}])`, "gu");
}

// ---------------------------------------------------------------------------
// Free-text scrubbing (regex layer)
// ---------------------------------------------------------------------------
// Order matters: URLs (may contain @ / digits) → email → dates → digit runs →
// honorific names → address phrases.
const RE_URL =
  /(?:https?:\/\/|www\.)\S+|\b[a-z0-9][a-z0-9.-]*\.(?:com|net|org|me|ly|io|vn|info|link|gg|edu|gov|co|app|dev|xyz|tk|biz|page|site)\b(?:\/\S*)?/gi;
const RE_EMAIL = /(?<![\w.+-])[\w.+-]+@[\w-]+\.[\w.-]+/gi;
const RE_DATE_NUM = /(?<!\d)\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}(?!\d)/g;
const RE_DATE_VN = /ngày\s+\d{1,2}\s+tháng\s+\d{1,2}(?:\s+năm\s+\d{2,4})?/gi;
// Any digit run (with optional +/separators) that contains ≥9 digits → phone/ID.
const RE_DIGIT_RUN = /\+?\d[\d\s.\-()]{7,}\d/g;
const RE_PERSON =
  /(?<!\p{L})(thầy|cô|bạn|anh|chị|ông|bà|chú|bác|dì|cậu|mợ|gs|ts|pgs|mr|mrs|ms|dr)\.?\s+(\p{Lu}[\p{L}]*(?:\s+\p{Lu}[\p{L}]*){0,3})/giu;
const RE_ADDRESS =
  /(?<!\p{L})(?:số|ngõ|ngách|hẻm|phố|đường|quận|phường|tổ|thôn|xã|huyện)\s+[\p{L}\p{N}]+(?:\s+[\p{L}\p{N}]+){0,3}/giu;

const REDACTED = "[REDACTED]";

function scrubFreeText(text: string): string {
  let t = text;
  t = t.replace(RE_URL, REDACTED);
  t = t.replace(RE_EMAIL, REDACTED);
  t = t.replace(RE_DATE_NUM, REDACTED);
  t = t.replace(RE_DATE_VN, REDACTED);
  t = t.replace(RE_DIGIT_RUN, (m) => (m.replace(/\D/g, "").length >= 9 ? REDACTED : m));
  t = t.replace(RE_PERSON, (_m, honorific) => `${honorific} [PERSON]`);
  t = t.replace(RE_ADDRESS, REDACTED);
  return t;
}

// ---------------------------------------------------------------------------
// Placeholder registry (per-request, in-memory only)
// ---------------------------------------------------------------------------
class PlaceholderMap {
  private token2real = new Map<string, string>();
  private dedupe = new Map<string, string>(); // `${kind}:${fold(real)}` -> token
  private masks: { value: string; token: string }[] = [];
  private fullValues: string[] = []; // full registered entities (for the assert)
  private schoolN = 0;
  private orgN = 0;

  student(real: string | null | undefined): void {
    const v = (real ?? "").trim();
    if (!v) return;
    this.token2real.set("[STUDENT]", v);
    this.fullValues.push(v);
    this.masks.push({ value: v, token: "[STUDENT]" });
    // Sub-tokens (given/family names) help mask partial-name references. Only
    // length ≥4 to avoid corrupting common short Vietnamese words; masking is
    // over-redaction-safe so this is a net win, not a leak risk.
    for (const part of v.split(/\s+/)) {
      if (fold(part).length >= 4) this.masks.push({ value: part, token: "[STUDENT]" });
    }
  }

  school(real: string | null | undefined): string | null {
    return this.register(real, "SCHOOL", () => ++this.schoolN);
  }

  org(real: string | null | undefined): string | null {
    return this.register(real, "ORG", () => ++this.orgN);
  }

  /** Register a value to be masked but NOT to occupy a SCHOOL/ORG slot (e.g. issuer). */
  alias(real: string | null | undefined, token = "[REDACTED]"): void {
    const v = (real ?? "").trim();
    if (!v) return;
    this.fullValues.push(v);
    this.masks.push({ value: v, token });
  }

  private register(
    real: string | null | undefined,
    prefix: "SCHOOL" | "ORG",
    next: () => number,
  ): string | null {
    const v = (real ?? "").trim();
    if (!v) return null;
    // Namespace dedupe by kind so a school named the same as an org gets a
    // DISTINCT token (fixes the [SCHOOL_n]/[ORG_n] collision that broke restore).
    const key = `${prefix}:${fold(v)}`;
    const existing = this.dedupe.get(key);
    if (existing) return existing;
    const token = `[${prefix}_${next()}]`;
    this.dedupe.set(key, token);
    this.token2real.set(token, v);
    this.fullValues.push(v);
    this.masks.push({ value: v, token });
    return token;
  }

  maskKnownValues(text: string): string {
    let out = text;
    // Longest first so a substring value can't pre-empt a longer one.
    for (const { value, token } of [...this.masks].sort((a, b) => b.value.length - a.value.length)) {
      if (fold(value).length < 2) continue;
      out = out.replace(tokenRegex(value), token);
    }
    return out;
  }

  restore(text: string): string {
    return text.replace(/\[(?:STUDENT|SCHOOL_\d+|ORG_\d+)\]/g, (m) => this.token2real.get(m) ?? m);
  }

  /** Full entity values for the fail-closed assert (not the short sub-tokens). */
  assertValues(): string[] {
    return this.fullValues;
  }
}

// ---------------------------------------------------------------------------
// Field cleaning
// ---------------------------------------------------------------------------
/** Mask known entities then regex-scrub one untrusted free-text value. */
function cleanText(raw: string | null | undefined, pm: PlaceholderMap): string {
  const v = (raw ?? "").trim();
  if (!v) return "";
  return scrubFreeText(pm.maskKnownValues(v)).trim();
}

/** Rebuild a subjects record with cleaned keys; drop keys that scrub to empty. */
function cleanSubjects(
  subjects: Record<string, number> | null,
  pm: PlaceholderMap,
): Record<string, number> | null {
  if (!subjects) return null;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(subjects)) {
    const ck = cleanText(k, pm);
    if (ck && !ck.includes("[REDACTED]") && !ck.includes("[PERSON]")) out[ck] = v;
  }
  return out;
}

const TASK_FIELDS: Record<AiTask, { edu: boolean; skills: boolean; certs: boolean; awards: boolean; acts: boolean; objective: boolean }> = {
  enrich_summary:           { edu: true,  skills: true,  certs: true,  awards: true,  acts: true,  objective: true },
  suggest_skills:           { edu: true,  skills: true,  certs: false, awards: false, acts: true,  objective: false },
  analyze_skill_gap:        { edu: false, skills: true,  certs: false, awards: false, acts: false, objective: false },
  analyze_cert_gap:         { edu: false, skills: false, certs: true,  awards: false, acts: false, objective: false },
  recommend_courses:        { edu: false, skills: true,  certs: true,  awards: false, acts: false, objective: false },
  suggest_career_direction: { edu: true,  skills: true,  certs: true,  awards: false, acts: true,  objective: false },
};

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
export function sanitizeForAI(
  profile: FullProfile,
  task: AiTask,
  opts: SanitizeOptions,
): SanitizeResult {
  const pm = new PlaceholderMap();

  // Register PII entities up-front so free-text masking can see them.
  // Register in the SAME order blocks are emitted (experiences before
  // activities) so [ORG_n] numbering matches the payload order.
  pm.student(profile.fullName);
  for (const e of profile.education) pm.school(e.schoolName);
  for (const x of profile.experiences ?? []) pm.org(x.organization);
  for (const a of profile.activities) pm.org(a.organization);
  for (const a of profile.awards) pm.alias(a.issuer); // dropped, but mask if it recurs in titles

  const restore = (text: string) => pm.restore(text);

  // -------------------------------------------------------------------------
  // Under-16: strictest. Minimal structured signal, zero free text, no age band.
  // Skill names are still user free-form → must be scrubbed even here.
  // -------------------------------------------------------------------------
  if (opts.isUnder16) {
    const payload: Record<string, unknown> = {
      task,
      targetMajorCode: profile.targetMajorCode ?? null,
      certificateTypes: profile.certificates.map((c) => c.certTypeCode),
      skills: profile.skills.map((s) => ({ name: cleanText(s.name, pm), level: s.proficiency })),
    };
    assertNoPII(payload, pm, profile);
    opts.logger?.("sanitized_payload", payload);
    return { payload, restore, skipAiRecommended: true };
  }

  // -------------------------------------------------------------------------
  // 16+: full allow-list, task-minimized. EVERY string field is cleaned.
  // -------------------------------------------------------------------------
  const inc = TASK_FIELDS[task];
  const payload: Record<string, unknown> = {
    task,
    targetMajorCode: profile.targetMajorCode ?? null,
    targetCareer: profile.targetCareer ? cleanText(profile.targetCareer, pm) : null,
  };

  if (inc.objective && profile.objective) {
    payload.objective = cleanText(profile.objective, pm);
  }

  if (inc.edu) {
    payload.education = profile.education.map((e) => ({
      level: cleanText(e.level, pm) || null,
      gpa: e.gpa,
      grade10: e.grade10,
      grade11: e.grade11,
      grade12: e.grade12,
      subjects: cleanSubjects(e.subjects, pm),
    }));
  }

  if (inc.skills) {
    payload.skills = profile.skills.map((s) => ({
      name: cleanText(s.name, pm),
      category: cleanText(s.category, pm) || null,
      proficiency: s.proficiency,
    }));
  }

  if (inc.certs) {
    payload.certificates = profile.certificates.map((c) => ({
      certTypeCode: c.certTypeCode, // controlled catalog code
      score: c.score ? cleanText(c.score, pm) : null,
    }));
  }

  if (inc.awards) {
    payload.awards = profile.awards.map((a) => ({
      title: cleanText(a.title, pm),
      level: cleanText(a.level, pm) || null,
      rank: cleanText(a.rank, pm) || null,
      year: a.year,
      // issuer intentionally dropped — may be a person's name.
    }));
  }

  if (inc.acts) {
    const mapEntry = (a: FullProfileExperience | FullProfileActivity) => ({
      type: cleanText(a.type ?? null, pm) || null,
      role: cleanText(a.role ?? null, pm) || null,
      hours: a.hours ?? null,
      title: cleanText(a.title, pm),
      description: cleanText(a.description, pm),
      organization: pm.org(a.organization), // placeholder token, never the real name
    });
    payload.activities = [
      ...(profile.experiences ?? []).map(mapEntry),
      ...profile.activities.map(mapEntry),
    ];
  }

  // Personality type is a controlled code (e.g. 'INTJ') — not PII, safe to include.
  if (task === "suggest_career_direction" && profile.personalityType) {
    payload.personalityType = profile.personalityType;
  }

  assertNoPII(payload, pm, profile);
  opts.logger?.("sanitized_payload", payload);
  return { payload, restore, skipAiRecommended: false };
}

// ---------------------------------------------------------------------------
// Fail-closed leak guard
// ---------------------------------------------------------------------------
/**
 * Last line of defense. Throws if any hard-PII or registered entity value
 * survives into the payload. Comparison is FOLDED (case/diacritic/whitespace
 * insensitive) and word-boundary anchored, so "Lê Quý Đôn" leaking as
 * "le quy don" is still caught, while short common words don't false-positive.
 * Runs ALWAYS — a leak must abort the request, not just fail a test.
 */
function assertNoPII(payload: unknown, pm: PlaceholderMap, profile: FullProfile): void {
  const haystack = fold(JSON.stringify(payload));
  const denied = [
    profile.fullName ?? "",
    profile.dateOfBirth ?? "",
    profile.phone ?? "",
    profile.email ?? "",
    profile.address ?? "",
    profile.avatarUrl ?? "",
    ...profile.certificates.map((c) => c.evidenceUrl ?? ""),
    ...pm.assertValues(), // student full name, schools, orgs, issuers
  ];
  for (const value of denied) {
    const fv = fold(value);
    if (fv.length < 4) continue; // 1–3 char folded values are masking-only (see residual note)
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(fv)}(?![\\p{L}\\p{N}])`, "u");
    if (re.test(haystack)) {
      throw new Error(
        "[sanitizer] PII leak blocked: a deny-list value reached the AI payload. Aborting AI call.",
      );
    }
  }
}
