import { NextResponse } from "next/server";

import { getAuthContext } from "@/lib/zpath-auth";
import { supabaseServer } from "@/src/lib/db/supabaseServer";
import { isUnder16 } from "@/lib/cv/ageGate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Policy the user agrees to when publishing a public share link (§13.3).
// Bump when the privacy/consent wording changes; the version is recorded per
// share in cv_shares.policy_version for the consent audit trail.
const SHARE_POLICY_VERSION = "2026-01-01"; // Luật 91/2025 + NĐ 356/2025 effective date

function shareUrl(request: Request, token: string): string {
  const origin = new URL(request.url).origin;
  return `${origin}/share/${token}`;
}

// ---------------------------------------------------------------------------
// GET /api/cv/share — current active share link for the owner (UI status).
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

    const { data, error } = await supabaseServer.rpc("get_active_cv_share", {
      p_user_id: auth.user.id,
    });
    if (error) throw error;

    if (!data) return NextResponse.json({ share: null });
    const share = data as { token: string; expiresAt: string };
    return NextResponse.json({
      share: {
        token: share.token,
        url: shareUrl(request, share.token),
        expiresAt: share.expiresAt,
      },
    });
  } catch (err) {
    console.error("GET /api/cv/share error:", err);
    return NextResponse.json({ error: "Không thể lấy trạng thái chia sẻ." }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/cv/share — publish a public share link.
// Age gate (§13.2): under-16 is blocked BEFORE anything else. Consent (§13.3):
// the body must explicitly acknowledge PII publication.
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

    const userId = auth.user.id;

    // 1) Age gate — fail-closed. Under-16 (or unknown DOB) cannot share publicly.
    if (await isUnder16(userId)) {
      return NextResponse.json(
        {
          error: "under16_share_blocked",
          message:
            "Tài khoản dưới 16 tuổi (hoặc chưa khai ngày sinh) không thể công khai CV. " +
            "Theo Luật 91/2025, việc công bố dữ liệu trẻ em cần đồng ý của người đại diện theo pháp luật.",
        },
        { status: 403 },
      );
    }

    // 2) Consent — explicit PII-publication acknowledgement is mandatory.
    const body = (await request.json().catch(() => ({}))) as { piiAcknowledged?: boolean };
    if (body.piiAcknowledged !== true) {
      return NextResponse.json(
        {
          error: "consent_required",
          message: "Bạn cần xác nhận đồng ý công bố thông tin cá nhân trước khi tạo liên kết.",
        },
        { status: 400 },
      );
    }

    // 3) Issue the token (RPC also enforces consent + age, defense-in-depth).
    const { data, error } = await supabaseServer.rpc("enable_cv_share", {
      p_user_id: userId,
      p_policy_version: SHARE_POLICY_VERSION,
      p_pii_ack: true,
      p_ttl_minutes: 30,
    });

    if (error) {
      // Map RPC guard violations to friendly responses.
      const msg = error.message || "";
      if (msg.includes("under16")) {
        return NextResponse.json({ error: "under16_share_blocked" }, { status: 403 });
      }
      if (msg.includes("consent_required")) {
        return NextResponse.json({ error: "consent_required" }, { status: 400 });
      }
      throw error;
    }

    const result = data as { token: string; expiresAt: string };
    return NextResponse.json({
      success: true,
      token: result.token,
      url: shareUrl(request, result.token),
      expiresAt: result.expiresAt,
      policyVersion: SHARE_POLICY_VERSION,
    });
  } catch (err) {
    console.error("POST /api/cv/share error:", err);
    return NextResponse.json({ error: "Không thể tạo liên kết chia sẻ." }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/cv/share — revoke all active links for the owner.
// ---------------------------------------------------------------------------
export async function DELETE() {
  try {
    const auth = await getAuthContext();
    if (!auth) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

    const { data, error } = await supabaseServer.rpc("revoke_cv_share", {
      p_user_id: auth.user.id,
    });
    if (error) throw error;

    return NextResponse.json({ success: true, revoked: (data as number) ?? 0 });
  } catch (err) {
    console.error("DELETE /api/cv/share error:", err);
    return NextResponse.json({ error: "Không thể thu hồi liên kết." }, { status: 500 });
  }
}
