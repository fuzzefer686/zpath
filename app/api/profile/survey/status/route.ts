import { NextResponse } from "next/server";

import { getAuthContext } from "@/lib/zpath-auth";

export const runtime = "nodejs";

export async function GET() {
  const auth = await getAuthContext();

  if (!auth) {
    return NextResponse.json({ surveyCompleted: false }, { status: 401 });
  }

  return NextResponse.json({ surveyCompleted: auth.surveyCompleted });
}
