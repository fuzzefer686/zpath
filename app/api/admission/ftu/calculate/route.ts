import { NextResponse } from "next/server";

import { getAuthContext } from "@/lib/zpath-auth";
import {
  calculateFTUAdmissionScore,
  type FTUScoringInput,
} from "@/src/lib/admission";

type FTUCalculateRequest = {
  payload: FTUScoringInput;
};

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseRequestBody(body: unknown): FTUCalculateRequest {
  if (!isRecord(body)) {
    throw new Error("Request body must be a JSON object.");
  }

  if (!isRecord(body.payload)) {
    throw new Error("payload must be a JSON object.");
  }

  if (body.payload.schoolCode !== "FTU") {
    throw new Error("payload.schoolCode must be FTU.");
  }

  if (body.payload.admissionYear !== 2025 && body.payload.admissionYear !== 2026) {
    throw new Error("payload.admissionYear must be 2025 or 2026.");
  }

  return {
    payload: body.payload as FTUScoringInput,
  };
}

export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json(
      {
        ok: false,
        error: "Bạn cần đăng nhập để dùng Scoring.",
      },
      { status: 401 },
    );
  }

  if (!auth.user.phone) {
    return NextResponse.json(
      {
        ok: false,
        error: "Bạn cần bổ sung số điện thoại trước khi dùng Scoring.",
      },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const parsed = parseRequestBody(body);
    const score = await calculateFTUAdmissionScore(parsed.payload);

    return NextResponse.json({
      ok: true,
      data: {
        score,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 400 },
      );
    }

    console.error("Unexpected FTU admission calculation API error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Unexpected FTU admission calculation error.",
      },
      { status: 500 },
    );
  }
}
