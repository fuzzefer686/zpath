import { NextResponse } from "next/server";

import {
  calculateAdmissionScore,
  evaluateAdmissionChance,
  hasStaticAdmissionModule,
  type AdmissionInput,
  type AdmissionMethod,
  type SchoolCode,
} from "@/src/lib/admission-engine";
import { interpretAdmission } from "@/src/lib/admission-engine/generic";
import { getPublishedAdmissionConfig } from "@/src/lib/admission-config/store";
import { getAuthContext } from "@/lib/zpath-auth";

type AdmissionCalculateRequest = {
  schoolCode: string;
  method: string;
  year: number;
  payload: unknown;
  benchmark30?: number;
};

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseAdmissionCalculateRequest(
  body: unknown,
): AdmissionCalculateRequest {
  if (!isRecord(body)) {
    throw new Error("Request body must be a JSON object.");
  }

  if (!isNonEmptyString(body.schoolCode)) {
    throw new Error("schoolCode must be a non-empty string.");
  }

  if (!isNonEmptyString(body.method)) {
    throw new Error("method must be a non-empty string.");
  }

  if (typeof body.year !== "number" || !Number.isInteger(body.year)) {
    throw new Error("year must be an integer.");
  }

  if (body.year < 2000 || body.year > 2100) {
    throw new Error("year must be between 2000 and 2100.");
  }

  if (!("payload" in body)) {
    throw new Error("payload is required.");
  }

  if (
    body.benchmark30 !== undefined &&
    (typeof body.benchmark30 !== "number" ||
      !Number.isFinite(body.benchmark30))
  ) {
    throw new Error("benchmark30 must be a finite number when provided.");
  }

  return {
    schoolCode: body.schoolCode.toUpperCase(),
    method: body.method,
    year: body.year,
    payload: body.payload,
    benchmark30: body.benchmark30,
  };
}

/**
 * Config-driven path: schools without a hardcoded module are scored by loading
 * their published admission_configs row and running the generic interpreter.
 * This is what makes a brand-new school (added from a PDF) work with no code.
 */
async function calculateFromPublishedConfig(parsed: AdmissionCalculateRequest) {
  const config = await getPublishedAdmissionConfig(parsed.schoolCode, parsed.year);

  if (!config) {
    throw new Error(
      `Chưa có cấu hình xét tuyển được phê duyệt cho trường "${parsed.schoolCode}" năm ${parsed.year}.`,
    );
  }

  return interpretAdmission({
    config,
    methodCode: parsed.method,
    payload: parsed.payload,
  });
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

  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Request body must be valid JSON.",
        },
        { status: 400 },
      );
    }

    console.error("Unexpected admission request parsing error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Unexpected admission calculation error.",
      },
      { status: 500 },
    );
  }

  try {
    const parsed = parseAdmissionCalculateRequest(body);

    const score = hasStaticAdmissionModule(parsed.schoolCode)
      ? calculateAdmissionScore({
          schoolCode: parsed.schoolCode as SchoolCode,
          method: parsed.method as AdmissionMethod,
          year: parsed.year,
          payload: parsed.payload,
        } satisfies AdmissionInput)
      : await calculateFromPublishedConfig(parsed);

    const benchmark30 =
      parsed.benchmark30 ??
      ("benchmark30" in score ? (score.benchmark30 ?? undefined) : undefined);
    const chance =
      benchmark30 === undefined
        ? null
        : evaluateAdmissionChance(score.normalizedScore30, benchmark30);

    return NextResponse.json({
      ok: true,
      data: {
        score,
        chance,
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

    console.error("Unexpected admission calculation API error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Unexpected admission calculation error.",
      },
      { status: 500 },
    );
  }
}
