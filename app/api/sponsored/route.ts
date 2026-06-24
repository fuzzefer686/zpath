import { NextResponse } from "next/server";
import { supabaseServer } from "@/src/lib/db/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tagsParam = searchParams.get("tags");
    const requestedTags = tagsParam
      ? tagsParam.split(",").map(t => t.trim().toLowerCase()).filter(Boolean)
      : [];

    // Fetch active sponsored placements (bypassing RLS with service_role)
    const { data: placements, error } = await supabaseServer
      .from("sponsored_placements")
      .select("*")
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching sponsored placements:", error);
      return NextResponse.json({ error: "Failed to fetch sponsored placements" }, { status: 500 });
    }

    const now = new Date();

    // Filter by active time range (starts_at <= now <= ends_at)
    const activePlacements = (placements ?? []).filter(p => {
      if (p.starts_at && new Date(p.starts_at) > now) return false;
      if (p.ends_at && new Date(p.ends_at) < now) return false;
      return true;
    });

    // Filter by context tags overlap
    const filteredPlacements = activePlacements.filter(p => {
      // If ad has no context tags or is empty, it's a general ad, show it
      if (!p.context_tags || p.context_tags.length === 0) return true;
      // If client requested specific tags, check overlap
      const placementTags = p.context_tags.map((t: string) => t.toLowerCase());
      return requestedTags.some((rt: string) => placementTags.includes(rt));
    });

    return NextResponse.json({ placements: filteredPlacements });
  } catch (err) {
    console.error("GET /api/sponsored error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
