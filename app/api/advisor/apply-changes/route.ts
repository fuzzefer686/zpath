import { NextRequest, NextResponse } from "next/server";

import {
  applyAdvisorWeightContributions,
  getPendingAdvisorWeightContributions,
} from "@/lib/advisor-data";
import { getAuthenticatedUserRole } from "@/lib/auth-server";
import { isAdminRole } from "@/lib/auth-roles";

async function requireAdmin(req: NextRequest) {
  const auth = await getAuthenticatedUserRole(req);
  return auth && isAdminRole(auth.role) ? auth : null;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth) {
      return NextResponse.json({ error: "Bạn không có quyền admin." }, { status: 403 });
    }

    const contributions = await getPendingAdvisorWeightContributions();
    return NextResponse.json({ contributions });
  } catch (error) {
    console.error("Advisor apply changes GET error:", error);
    return NextResponse.json(
      { error: "Không thể tải danh sách đóng góp." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth) {
      return NextResponse.json({ error: "Bạn không có quyền admin." }, { status: 403 });
    }

    const body = (await req.json()) as { contributionIds?: unknown };
    const contributionIds = Array.isArray(body.contributionIds)
      ? body.contributionIds.filter((id): id is string => typeof id === "string")
      : [];

    if (!contributionIds.length) {
      return NextResponse.json(
        { error: "Vui lòng chọn ít nhất một đóng góp." },
        { status: 400 },
      );
    }

    const result = await applyAdvisorWeightContributions(contributionIds);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Advisor apply changes POST error:", error);
    const detail =
      process.env.NODE_ENV === "production" || !(error instanceof Error)
        ? undefined
        : error.message;

    return NextResponse.json(
      { error: "Không thể áp dụng thay đổi.", detail },
      { status: 500 },
    );
  }
}
