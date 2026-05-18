import { NextResponse } from "next/server";

import { supabaseServer } from "@/src/lib/db/supabaseServer";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const EVALUATION_WARNING =
  "Kết quả chỉ mang tính tham khảo, không thay thế tư vấn hướng nghiệp chuyên sâu.";

export const runtime = "nodejs";

function notFoundResponse() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "EVALUATION_NOT_FOUND",
      },
    },
    { status: 404 },
  );
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const { data, error } = await supabaseServer
    .from("career_evaluations")
    .select("id, career_rankings, student_summary, next_steps_30_days")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Evaluation result API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "EVALUATION_NOT_FOUND",
        },
      },
      { status: 404 },
    );
  }

  if (!data) {
    return notFoundResponse();
  }

  return NextResponse.json({
    success: true,
    evaluation: {
      id: data.id,
      ranking: data.career_rankings,
      student_summary: data.student_summary,
      next_steps_30_days: data.next_steps_30_days,
      warning: EVALUATION_WARNING,
    },
  });
}
