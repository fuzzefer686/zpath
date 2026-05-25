import { NextResponse } from "next/server";

import { supabaseServer } from "@/src/lib/db/supabaseServer";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams
    .get("session_id")
    ?.trim();

  if (!sessionId) {
    return NextResponse.json(
      { status: "error", message: "Missing session_id" },
      { status: 400 },
    );
  }

  const { data: surveyProfile, error: surveyProfileError } = await supabaseServer
    .from("user_survey_profiles")
    .select("user_id")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (surveyProfileError) {
    console.error("Survey profile by session API error:", surveyProfileError);
  }

  const { data, error } = await supabaseServer
    .from("career_evaluations")
    .select("id")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Evaluation by session API error:", error);
    return NextResponse.json({ status: "processing" });
  }

  if (!data) {
    if (surveyProfile) {
      return NextResponse.json({
        status: "completed",
        survey_completed: true,
      });
    }

    return NextResponse.json({ status: "processing" });
  }

  return NextResponse.json({
    status: "completed",
    evaluation_id: data.id,
    survey_completed: Boolean(surveyProfile),
  });
}
