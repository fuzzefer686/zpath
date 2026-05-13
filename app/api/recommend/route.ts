import { NextRequest, NextResponse } from "next/server";
import { getAdvisorMajorsForRecommendation } from "@/lib/advisor-data";
import { recommendMajors } from "@/lib/scoring";
import {
  ADVISOR_SUBJECT_OPTIONS,
  type AdvisorElectiveScore,
  type AdvisorUserProfile,
} from "@/lib/advisor-types";

const advisorSubjectValues = new Set(ADVISOR_SUBJECT_OPTIONS.map((subject) => subject.value));

function isValidScore(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value) && value >= 0 && value <= 10;
}

function isValidElective(value: unknown): value is AdvisorElectiveScore {
  if (!value || typeof value !== "object") return false;

  const elective = value as AdvisorElectiveScore;
  return advisorSubjectValues.has(elective.subject) && isValidScore(elective.score);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userProfile = body as AdvisorUserProfile;

    // Validate cơ bản
    if (
      !isValidScore(userProfile.math) ||
      !isValidScore(userProfile.literature) ||
      !Array.isArray(userProfile.electives) ||
      userProfile.electives.length !== 2 ||
      !userProfile.electives.every(isValidElective) ||
      userProfile.electives[0].subject === userProfile.electives[1].subject ||
      !Array.isArray(userProfile.interests) ||
      !Array.isArray(userProfile.careerGoals)
    ) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại." },
        { status: 400 }
      );
    }

    const majors = await getAdvisorMajorsForRecommendation();
    const recommendations = recommendMajors(userProfile, majors, 5);

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("Recommend API error:", error);
    return NextResponse.json(
      { error: "Không thể tạo gợi ý. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
