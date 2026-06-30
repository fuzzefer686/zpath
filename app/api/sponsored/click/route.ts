import { NextResponse } from "next/server";
import { supabaseServer } from "@/src/lib/db/supabaseServer";
import { getAuthContext } from "@/lib/zpath-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const placementId = searchParams.get("id");
    const context = searchParams.get("context") || "unknown";

    if (!placementId) {
      return NextResponse.json({ error: "Missing placement ID" }, { status: 400 });
    }

    // Fetch target URL from sponsored_placements using supabaseServer (service_role)
    const { data: placement, error: fetchError } = await supabaseServer
      .from("sponsored_placements")
      .select("target_url")
      .eq("id", placementId)
      .maybeSingle();

    if (fetchError || !placement) {
      console.error("Error fetching sponsored placement:", fetchError);
      return NextResponse.json({ error: "Sponsored placement not found" }, { status: 404 });
    }

    // Optional: Get logged in user ID if available
    let userId: string | null = null;
    try {
      const auth = await getAuthContext();
      if (auth?.user) {
        userId = auth.user.id;
      }
    } catch (err) {
      // Ignore auth resolution errors for robustness
      console.warn("Failed to resolve auth context in sponsored click:", err);
    }

    // Insert click record into affiliate_clicks
    const { error: clickError } = await supabaseServer
      .from("affiliate_clicks")
      .insert({
        placement_id: placementId,
        user_id: userId,
        context: context,
      });

    if (clickError) {
      console.error("Error recording affiliate click:", clickError);
      // Fallback: Proceed with redirection so user experience is not broken
    }

    return NextResponse.redirect(new URL(placement.target_url));
  } catch (err) {
    console.error("GET /api/sponsored/click error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
