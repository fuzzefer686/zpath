import { NextRequest, NextResponse } from "next/server";

import { insertAdvisorWeightContribution } from "@/lib/advisor-data";
import {
  ADVISOR_WEIGHT_FIELDS,
  clampAdvisorWeight,
  emptyAdvisorWeightValues,
  type AdvisorWeightValues,
} from "@/lib/advisor-weight-schema";

function parseWeights(value: unknown): AdvisorWeightValues | null {
  if (!value || typeof value !== "object") return null;

  const source = value as Partial<Record<keyof AdvisorWeightValues, unknown>>;
  const weights = emptyAdvisorWeightValues();

  for (const field of ADVISOR_WEIGHT_FIELDS) {
    const raw = source[field.key];
    const numeric = typeof raw === "number" ? raw : Number(raw);

    if (Number.isNaN(numeric) || numeric < 0 || numeric > 1) {
      return null;
    }

    weights[field.key] = clampAdvisorWeight(numeric);
  }

  return weights;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      majorId?: unknown;
      weights?: unknown;
      contributorName?: unknown;
      contributorEmail?: unknown;
      reason?: unknown;
    };

    const majorId = typeof body.majorId === "string" ? body.majorId.trim() : "";
    const weights = parseWeights(body.weights);

    if (!majorId || !weights) {
      return NextResponse.json(
        { error: "Dữ liệu đóng góp không hợp lệ." },
        { status: 400 },
      );
    }

    await insertAdvisorWeightContribution({
      majorId,
      weights,
      contributorName:
        typeof body.contributorName === "string" ? body.contributorName : null,
      contributorEmail:
        typeof body.contributorEmail === "string" ? body.contributorEmail : null,
      reason: typeof body.reason === "string" ? body.reason : null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Advisor contribution API error:", error);
    const detail =
      process.env.NODE_ENV === "production" || !(error instanceof Error)
        ? undefined
        : error.message;

    return NextResponse.json(
      { error: "Không thể lưu đóng góp. Vui lòng thử lại.", detail },
      { status: 500 },
    );
  }
}
