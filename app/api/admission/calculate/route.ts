import { NextResponse } from "next/server";

import {
  calculateAdmissionScore,
  evaluateAdmissionChance,
  type AdmissionInput,
  type AdmissionMethod,
  type SchoolCode,
} from "@/src/lib/admission-engine";

type AdmissionCalculateRequest = {
  schoolCode: SchoolCode;
  method: AdmissionMethod;
  year: number;
  payload: unknown;
  benchmark30?: number;
};

const SCHOOL_CODES: readonly SchoolCode[] = ["HUST", "FTU", "VINUNI", "NEU"];
const ADMISSION_METHODS: readonly AdmissionMethod[] = ["THPT", "TSA", "XTTN"];

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSchoolCode(value: unknown): value is SchoolCode {
  return SCHOOL_CODES.includes(value as SchoolCode);
}

function isAdmissionMethod(value: unknown): value is AdmissionMethod {
  return ADMISSION_METHODS.includes(value as AdmissionMethod);
}

function parseAdmissionCalculateRequest(
  body: unknown,
): AdmissionCalculateRequest {
  if (!isRecord(body)) {
    throw new Error("Request body must be a JSON object.");
  }

  if (!isSchoolCode(body.schoolCode)) {
    throw new Error('schoolCode must be one of: "HUST", "FTU", "VINUNI", "NEU".');
  }

  if (!isAdmissionMethod(body.method)) {
    throw new Error('method must be one of: "THPT", "TSA", "XTTN".');
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
    schoolCode: body.schoolCode,
    method: body.method,
    year: body.year,
    payload: body.payload,
    benchmark30: body.benchmark30,
  };
}

export async function POST(request: Request) {
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
    const input: AdmissionInput = {
      schoolCode: parsed.schoolCode,
      method: parsed.method,
      year: parsed.year,
      payload: parsed.payload,
    };

    const score = calculateAdmissionScore(input);
    const chance =
      parsed.benchmark30 === undefined
        ? null
        : evaluateAdmissionChance(score.normalizedScore30, parsed.benchmark30);

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
