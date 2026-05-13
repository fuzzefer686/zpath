import { NextResponse } from "next/server";

import { getAdvisorMajorWeights } from "@/lib/advisor-data";

export async function GET() {
  try {
    const majors = await getAdvisorMajorWeights();
    return NextResponse.json({ majors });
  } catch (error) {
    console.error("Advisor weights API error:", error);
    return NextResponse.json(
      { error: "Không thể tải dữ liệu trọng số." },
      { status: 500 },
    );
  }
}
