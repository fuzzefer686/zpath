import majorsData from "@/data/advisor-majors.json";
import { createClient } from "@supabase/supabase-js";
import type { Major } from "@/lib/advisor-types";
import { createAdminClient } from "@/lib/supabase-admin";
import {
  ADVISOR_SCORE_WEIGHT_FIELDS,
  ADVISOR_SUBJECT_WEIGHT_FIELDS,
  ADVISOR_WEIGHT_FIELDS,
  DEFAULT_ADVISOR_SCORE_WEIGHTS,
  clampAdvisorWeight,
  emptyAdvisorWeightValues,
  type AdvisorScoreWeightKey,
  type AdvisorSubjectWeightKey,
  type AdvisorWeightValues,
} from "@/lib/advisor-weight-schema";

export type AdvisorMajorWeight = {
  id?: string;
  majorId: string;
  name: string;
  category: string;
  description: string;
  interestTags: string[];
  careerGoalTags: string[];
  personalityTags: string[];
  skillsToImprove: string[];
  careerPaths: string[];
  weights: AdvisorWeightValues;
};

type AdvisorMajorWeightRow = {
  id?: string;
  major_id: string;
  name: string;
  category: string;
  description: string;
  interest_tags: string[] | null;
  career_goal_tags: string[] | null;
  personality_tags: string[] | null;
  skills_to_improve: string[] | null;
  career_paths: string[] | null;
  [key: string]: unknown;
};

export type AdvisorWeightContributionInput = {
  majorId: string;
  weights: AdvisorWeightValues;
  contributorName?: string | null;
  contributorEmail?: string | null;
  reason?: string | null;
};

export type AdvisorWeightContribution = {
  id: string;
  majorId: string;
  majorName: string;
  category: string;
  contributorName: string | null;
  contributorEmail: string | null;
  reason: string | null;
  status: string;
  createdAt: string;
  weights: AdvisorWeightValues;
};

const ADVISOR_WEIGHT_SELECT_COLUMNS = [
  "id",
  "major_id",
  "name",
  "category",
  "description",
  "interest_tags",
  "career_goal_tags",
  "personality_tags",
  "skills_to_improve",
  "career_paths",
  ...ADVISOR_WEIGHT_FIELDS.map((field) => field.dbColumn),
].join(", ");

const ADVISOR_CONTRIBUTION_SELECT_COLUMNS = [
  "id",
  "major_id",
  "contributor_name",
  "contributor_email",
  "reason",
  "status",
  "created_at",
  ...ADVISOR_WEIGHT_FIELDS.map((field) => field.dbColumn),
].join(", ");

type AdvisorWeightContributionRow = {
  id: string;
  major_id: string;
  contributor_name: string | null;
  contributor_email: string | null;
  reason: string | null;
  status: string;
  created_at: string;
  [key: string]: unknown;
};

function hasSupabaseServerEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function hasSupabasePublicEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

function createServerSupabaseClient() {
  if (hasSupabaseServerEnv()) {
    return createAdminClient();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables",
    );
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function mapMajorToWeightRecord(major: Major): AdvisorMajorWeight {
  const weights = emptyAdvisorWeightValues();

  ADVISOR_SUBJECT_WEIGHT_FIELDS.forEach((field) => {
    weights[field.key] = clampAdvisorWeight(
      major.recommendedSubjects[field.key as AdvisorSubjectWeightKey],
    );
  });

  ADVISOR_SCORE_WEIGHT_FIELDS.forEach((field) => {
    weights[field.key] = DEFAULT_ADVISOR_SCORE_WEIGHTS[field.key];
  });

  return {
    majorId: major.id,
    name: major.name,
    category: major.category,
    description: major.description,
    interestTags: major.interestTags,
    careerGoalTags: major.careerGoalTags,
    personalityTags: major.personalityTags,
    skillsToImprove: major.skillsToImprove,
    careerPaths: major.careerPaths,
    weights,
  };
}

function mapRowToWeightRecord(row: AdvisorMajorWeightRow): AdvisorMajorWeight {
  const weights = emptyAdvisorWeightValues();

  ADVISOR_WEIGHT_FIELDS.forEach((field) => {
    weights[field.key] = clampAdvisorWeight(row[field.dbColumn]);
  });

  return {
    id: row.id,
    majorId: row.major_id,
    name: row.name,
    category: row.category,
    description: row.description,
    interestTags: row.interest_tags ?? [],
    careerGoalTags: row.career_goal_tags ?? [],
    personalityTags: row.personality_tags ?? [],
    skillsToImprove: row.skills_to_improve ?? [],
    careerPaths: row.career_paths ?? [],
    weights,
  };
}

function mapRowToContribution(
  row: AdvisorWeightContributionRow,
  majorById: Map<string, AdvisorMajorWeight>,
): AdvisorWeightContribution {
  const weights = emptyAdvisorWeightValues();

  ADVISOR_WEIGHT_FIELDS.forEach((field) => {
    weights[field.key] = clampAdvisorWeight(row[field.dbColumn]);
  });

  const major = majorById.get(row.major_id);

  return {
    id: row.id,
    majorId: row.major_id,
    majorName: major?.name ?? row.major_id,
    category: major?.category ?? "Chưa phân loại",
    contributorName: row.contributor_name,
    contributorEmail: row.contributor_email,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    weights,
  };
}

export function mapAdvisorWeightToMajor(record: AdvisorMajorWeight): Major {
  const recommendedSubjects = ADVISOR_SUBJECT_WEIGHT_FIELDS.reduce(
    (subjects, field) => {
      const weight = clampAdvisorWeight(record.weights[field.key]);
      if (weight > 0) {
        subjects[field.key as AdvisorSubjectWeightKey] = weight;
      }
      return subjects;
    },
    {} as Major["recommendedSubjects"],
  );

  const scoreWeights = ADVISOR_SCORE_WEIGHT_FIELDS.reduce((weights, field) => {
    weights[field.key as AdvisorScoreWeightKey] = clampAdvisorWeight(
      record.weights[field.key],
    );
    return weights;
  }, {} as NonNullable<Major["scoreWeights"]>);

  return {
    id: record.majorId,
    name: record.name,
    category: record.category,
    description: record.description,
    recommendedSubjects,
    scoreWeights,
    interestTags: record.interestTags,
    careerGoalTags: record.careerGoalTags,
    personalityTags: record.personalityTags,
    skillsToImprove: record.skillsToImprove,
    careerPaths: record.careerPaths,
  };
}

export function getFallbackAdvisorWeights(): AdvisorMajorWeight[] {
  return (majorsData as Major[]).map(mapMajorToWeightRecord);
}

export async function getAdvisorMajorWeights(): Promise<AdvisorMajorWeight[]> {
  if (!hasSupabaseServerEnv() && !hasSupabasePublicEnv()) {
    return getFallbackAdvisorWeights();
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("advisor_major_weights")
      .select(ADVISOR_WEIGHT_SELECT_COLUMNS)
      .eq("is_active", true)
      .order("name");

    if (error) throw error;
    if (!data?.length) return getFallbackAdvisorWeights();

    return (data as unknown as AdvisorMajorWeightRow[]).map(mapRowToWeightRecord);
  } catch (error) {
    console.error("Advisor weights DB fallback:", error);
    return getFallbackAdvisorWeights();
  }
}

export async function getAdvisorMajorsForRecommendation(): Promise<Major[]> {
  const weights = await getAdvisorMajorWeights();
  return weights.map(mapAdvisorWeightToMajor);
}

export async function insertAdvisorWeightContribution(
  input: AdvisorWeightContributionInput,
) {
  if (!hasSupabaseServerEnv() && !hasSupabasePublicEnv()) {
    throw new Error("Supabase environment is not configured.");
  }

  const payload = ADVISOR_WEIGHT_FIELDS.reduce(
    (next, field) => {
      next[field.dbColumn] = clampAdvisorWeight(input.weights[field.key]);
      return next;
    },
    {
      major_id: input.majorId,
      contributor_name: input.contributorName?.trim() || null,
      contributor_email: input.contributorEmail?.trim() || null,
      reason: input.reason?.trim() || null,
    } as Record<string, unknown>,
  );

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("advisor_weight_contributions")
    .insert(payload);

  if (error) throw error;
}

export async function getPendingAdvisorWeightContributions(): Promise<
  AdvisorWeightContribution[]
> {
  if (!hasSupabaseServerEnv()) {
    throw new Error("Supabase service role is not configured.");
  }

  const supabase = createAdminClient();
  const [{ data, error }, majors] = await Promise.all([
    supabase
      .from("advisor_weight_contributions")
      .select(ADVISOR_CONTRIBUTION_SELECT_COLUMNS)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    getAdvisorMajorWeights(),
  ]);

  if (error) throw error;

  const majorById = new Map(majors.map((major) => [major.majorId, major]));
  return ((data ?? []) as unknown as AdvisorWeightContributionRow[]).map((row) =>
    mapRowToContribution(row, majorById),
  );
}

export async function applyAdvisorWeightContributions(contributionIds: string[]) {
  if (!hasSupabaseServerEnv()) {
    throw new Error("Supabase service role is not configured.");
  }

  const uniqueIds = Array.from(new Set(contributionIds.map((id) => id.trim()).filter(Boolean)));
  if (!uniqueIds.length) {
    return { appliedCount: 0, updatedMajorCount: 0 };
  }

  const supabase = createAdminClient();
  const { data: contributions, error: contributionError } = await supabase
    .from("advisor_weight_contributions")
    .select(ADVISOR_CONTRIBUTION_SELECT_COLUMNS)
    .in("id", uniqueIds)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (contributionError) throw contributionError;

  const contributionRows = (contributions ?? []) as unknown as AdvisorWeightContributionRow[];
  if (!contributionRows.length) {
    return { appliedCount: 0, updatedMajorCount: 0 };
  }

  const majorIds = Array.from(new Set(contributionRows.map((row) => row.major_id)));
  const { data: currentWeights, error: currentWeightsError } = await supabase
    .from("advisor_major_weights")
    .select(["major_id", ...ADVISOR_WEIGHT_FIELDS.map((field) => field.dbColumn)].join(", "))
    .in("major_id", majorIds)
    .eq("is_active", true);

  if (currentWeightsError) throw currentWeightsError;

  const nextWeightsByMajor = new Map<string, Record<string, number>>();
  for (const row of (currentWeights ?? []) as unknown as Record<string, unknown>[]) {
    const majorId = String(row.major_id);
    const weights = ADVISOR_WEIGHT_FIELDS.reduce(
      (next, field) => {
        next[field.dbColumn] = clampAdvisorWeight(row[field.dbColumn]);
        return next;
      },
      {} as Record<string, number>,
    );
    nextWeightsByMajor.set(majorId, weights);
  }

  for (const contribution of contributionRows) {
    const current = nextWeightsByMajor.get(contribution.major_id);
    if (!current) continue;

    for (const field of ADVISOR_WEIGHT_FIELDS) {
      const currentValue = current[field.dbColumn];
      const contributionValue = clampAdvisorWeight(contribution[field.dbColumn]);
      current[field.dbColumn] =
        currentValue + (contributionValue - currentValue) * 0.01;
    }
  }

  let updatedMajorCount = 0;
  for (const [majorId, weights] of nextWeightsByMajor.entries()) {
    const { error } = await supabase
      .from("advisor_major_weights")
      .update({
        ...weights,
        updated_at: new Date().toISOString(),
      })
      .eq("major_id", majorId);

    if (error) throw error;
    updatedMajorCount += 1;
  }

  const acceptedIds = contributionRows.map((row) => row.id);
  const { error: statusError } = await supabase
    .from("advisor_weight_contributions")
    .update({ status: "accepted" })
    .in("id", acceptedIds);

  if (statusError) throw statusError;

  return {
    appliedCount: acceptedIds.length,
    updatedMajorCount,
  };
}
