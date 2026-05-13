/**
 * Scoring Engine cho module Tư vấn Chọn Ngành
 *
 * Công thức:
 *   Final Score = Academic Fit × 40% + Interest Fit × 30%
 *                + Career Goal Fit × 20% + Personality Fit × 10%
 */

import type { Major, AdvisorSubject, AdvisorUserProfile, RecommendationResult } from "./advisor-types";
import {
  DEFAULT_ADVISOR_SCORE_WEIGHTS,
  type AdvisorScoreWeightKey,
} from "./advisor-weight-schema";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Chuyển điểm thang 10 → thang 100, clamp [0, 100] */
function normalizeSubjectScore(score: number): number {
  return Math.max(0, Math.min(score * 10, 100));
}

function clampWeight(weight: number | undefined): number {
  if (typeof weight !== "number" || Number.isNaN(weight)) return 0;
  return Math.max(0, Math.min(weight, 1));
}

function getScoreWeight(
  major: Major,
  key: AdvisorScoreWeightKey,
): number {
  return clampWeight(major.scoreWeights?.[key]) || DEFAULT_ADVISOR_SCORE_WEIGHTS[key];
}

function getElectiveFallbackWeight(subject: AdvisorSubject, major: Major): number {
  const category = major.category.toLowerCase();
  const tags = [
    category,
    ...major.interestTags,
    ...major.careerGoalTags,
    major.name,
    major.description,
  ]
    .join(" ")
    .toLowerCase();

  const naturalScience = ["physics", "chemistry", "biology"].includes(subject);
  const socialScience = ["history", "geography", "civicEducation"].includes(subject);

  if (subject === "english") return clampWeight(major.recommendedSubjects.english) || 0.55;
  if (subject === "informatics") {
    if (tags.includes("công nghệ") || tags.includes("dữ liệu") || tags.includes("ai")) return 0.85;
    return 0.4;
  }
  if (subject === "technology") {
    if (tags.includes("công nghệ") || tags.includes("kỹ thuật") || tags.includes("thiết kế")) return 0.75;
    return 0.35;
  }
  if (naturalScience) {
    if (tags.includes("y tế") || tags.includes("sinh") || tags.includes("môi trường")) return 0.8;
    if (tags.includes("công nghệ") || tags.includes("dữ liệu") || tags.includes("tài chính")) return 0.65;
    return 0.35;
  }
  if (socialScience) {
    if (
      tags.includes("luật") ||
      tags.includes("giáo dục") ||
      tags.includes("du lịch") ||
      tags.includes("giao tiếp") ||
      tags.includes("ngôn ngữ")
    ) {
      return 0.75;
    }
    return 0.4;
  }

  return 0.45;
}

// ── Academic Fit (0-100) ────────────────────────────────────────────────────

function calculateAcademicFit(user: AdvisorUserProfile, major: Major): number {
  const w = major.recommendedSubjects;
  const subjectScores = [
    {
      score: normalizeSubjectScore(user.math),
      weight: clampWeight(w.math),
    },
    {
      score: normalizeSubjectScore(user.literature),
      weight: clampWeight(w.literature),
    },
    ...user.electives.map((elective) => ({
      score: normalizeSubjectScore(elective.score),
      weight:
        clampWeight(w[elective.subject]) ||
        getElectiveFallbackWeight(elective.subject, major),
    })),
  ];

  const totalWeight = subjectScores.reduce((total, item) => total + item.weight, 0);

  if (totalWeight === 0) return 60; // fallback trung lập

  const score = subjectScores.reduce(
    (total, item) => total + item.score * item.weight,
    0
  );

  return Math.round(score / totalWeight);
}

// ── Tag Fit (0-100) — dùng cho cả Interest và Career Goal ───────────────────

function calculateTagFit(userTags: string[], majorTags: string[]): number {
  if (!majorTags.length) return 60;
  if (!userTags.length) return 50;

  const normalizedUserTags = userTags.map((tag) => tag.toLowerCase().trim());
  const matched = majorTags.filter((tag) =>
    normalizedUserTags.includes(tag.toLowerCase().trim())
  );

  return Math.round((matched.length / majorTags.length) * 100);
}

// ── Personality Fit (0-100) ─────────────────────────────────────────────────

function calculatePersonalityFit(user: AdvisorUserProfile, major: Major): number {
  if (!user.personality) return 60; // không nhập → trung lập

  const personality = user.personality.toUpperCase().trim();
  const matched = major.personalityTags
    .map((tag) => tag.toUpperCase().trim())
    .includes(personality);

  return matched ? 85 : 55;
}

// ── Main function ───────────────────────────────────────────────────────────

/**
 * Chấm điểm tất cả ngành và trả về top `limit` ngành phù hợp nhất.
 *
 * @param user    - Hồ sơ người dùng
 * @param majors  - Danh sách ngành (load từ majors.json)
 * @param limit   - Số ngành trả về (default 5)
 */
export function recommendMajors(
  user: AdvisorUserProfile,
  majors: Major[],
  limit = 5
): RecommendationResult[] {
  const results = majors.map((major) => {
    const academicFit = calculateAcademicFit(user, major);
    const interestFit = calculateTagFit(user.interests, major.interestTags);
    const careerGoalFit = calculateTagFit(user.careerGoals, major.careerGoalTags);
    const personalityFit = calculatePersonalityFit(user, major);

    const finalScore = Math.round(
      academicFit * getScoreWeight(major, "academicFit") +
      interestFit * getScoreWeight(major, "interestFit") +
      careerGoalFit * getScoreWeight(major, "careerGoalFit") +
      personalityFit * getScoreWeight(major, "personalityFit")
    );

    return {
      major,
      finalScore: Math.max(0, Math.min(finalScore, 100)),
      academicFit,
      interestFit,
      careerGoalFit,
      personalityFit,
    };
  });

  return results
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, limit);
}
