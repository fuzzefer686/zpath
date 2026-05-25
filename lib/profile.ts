import type { DiscoverFormData, UserProfile } from "@/lib/types";
import type { NormalizedSurveyProfile } from "@/src/types/zpath";

type AuthMeResponse = {
  user?: {
    id: string;
    username: string;
  } | null;
};

function toNumber(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function surveyToLegacyProfile(
  username: string,
  profile: NormalizedSurveyProfile,
): UserProfile {
  const math = profile.academic_ability.math_logic ?? 0;
  const physics = profile.academic_ability.self_learning ?? 0;
  const third = profile.academic_ability.english ?? 0;

  return {
    email: username,
    personality: "ZPath",
    scores: {
      math,
      physics,
      third,
      total: math + physics + third,
    },
  };
}

export const getCurrentSessionUser = async () => {
  const response = await fetch("/api/auth/me", { cache: "no-store" });
  if (!response.ok) return null;

  const data = (await response.json()) as AuthMeResponse;
  return data.user ?? null;
};

export const getCurrentUserProfile = async () => {
  const user = await getCurrentSessionUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const response = await fetch("/api/profile/survey", { cache: "no-store" });
  if (response.status === 404) return { user, profile: null };
  if (!response.ok) throw new Error("Không thể tải hồ sơ khảo sát.");

  const data = (await response.json()) as { profile: NormalizedSurveyProfile };

  return {
    user,
    profile: surveyToLegacyProfile(user.username, data.profile),
  };
};

export const saveCurrentUserProfile = async (formData: DiscoverFormData) => {
  const user = await getCurrentSessionUser();

  if (!user) {
    throw new Error("Bạn cần đăng nhập trước khi lưu hồ sơ.");
  }

  const math = toNumber(formData.mathScore);
  const physics = toNumber(formData.physicsScore);
  const third = toNumber(formData.thirdScore);
  const profile: NormalizedSurveyProfile = {
    interests: {
      technology: physics,
      business: null,
      design_media: null,
      healthcare: null,
    },
    academic_ability: {
      math_logic: math,
      english: third,
      self_learning: physics,
    },
    personality: {
      problem_solving: null,
      communication_teamwork: null,
      persistence: null,
    },
    personal_context: {
      has_laptop: null,
      self_study_hours_per_day: null,
    },
    career_goals: {
      income_priority: null,
      stability_priority: null,
    },
    experience: {
      action_readiness: null,
    },
  };

  const response = await fetch("/api/profile/survey", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ profile }),
  });

  if (!response.ok) {
    throw new Error("Bạn cần hoàn thành khảo sát trước khi chỉnh sửa hồ sơ.");
  }

  return {
    user,
    profile: surveyToLegacyProfile(user.username, profile),
  };
};
