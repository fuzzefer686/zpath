import { NextResponse } from "next/server";

import { getAuthContext } from "@/lib/zpath-auth";
import { supabaseServer } from "@/src/lib/db/supabaseServer";
import { runCvAiTask } from "@/lib/ai/vertex";
import { isAiEnabled } from "@/lib/ai/flags";
import type { FullProfile } from "@/lib/ai/sanitizer";

export const runtime = "nodejs";

async function logAiCall(userId: string) {
  const { error } = await supabaseServer
    .from("cv_rate_limit_logs")
    .insert({ user_id: userId, action_type: "ai_call" });
  if (error) {
    console.error("Failed to log rate limit entry for AI call:", error);
  }
}

// ---------------------------------------------------------------------------
// Server-side age check for the AI path. INTENTIONALLY DISTINCT from
// lib/cv/ageGate.ts (T20): that helper is fail-CLOSED (unknown DOB → under-16)
// to block share/export; this one is fail-OPEN (unknown DOB → not under-16)
// because the sanitizer strips ALL PII regardless of this flag, so a wrong age
// guess never leaks data — it only decides whether to skip AI enrichment.
// Do NOT consolidate the two: they encode opposite fail-safe directions on
// purpose. See lib/cv/ageGate.ts and the T20 evaluation note.
// ---------------------------------------------------------------------------
function computeIsUnder16(dateOfBirth: string | null): boolean {
  if (!dateOfBirth) return false;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return false;
  const now = new Date();
  const age = now.getFullYear() - dob.getFullYear()
    - (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
  return age < 16;
}

// ---------------------------------------------------------------------------
// Build FullProfile from raw DB rows — maps DB snake_case to sanitizer camelCase.
// ---------------------------------------------------------------------------
function buildFullProfile(
  cvProfile: Record<string, unknown>,
  education: Record<string, unknown>[],
  skills: Record<string, unknown>[],
  certificates: Record<string, unknown>[],
  awards: Record<string, unknown>[],
  activities: Record<string, unknown>[],
  experiences: Record<string, unknown>[],
  personalityType: string | null = null,
): FullProfile {
  return {
    fullName: (cvProfile.full_name as string) ?? null,
    dateOfBirth: (cvProfile.date_of_birth as string) ?? null,
    phone: (cvProfile.phone as string) ?? null,
    email: (cvProfile.email as string) ?? null,
    address: (cvProfile.address as string) ?? null,
    avatarUrl: (cvProfile.avatar_url as string) ?? null,
    targetMajorCode: (cvProfile.target_major_code as string) ?? null,
    targetCareer: (cvProfile.target_career as string) ?? null,
    headline: (cvProfile.headline as string) ?? null,
    objective: (cvProfile.summary as string) ?? null,
    education: education.map((e) => ({
      level: (e.level as string) ?? null,
      gpa: (e.gpa as number) ?? null,
      grade10: (e.grade_10 as number) ?? null,
      grade11: (e.grade_11 as number) ?? null,
      grade12: (e.grade_12 as number) ?? null,
      subjects: (e.subjects as Record<string, number>) ?? null,
      schoolName: (e.school_name as string) ?? null,
      startYear: (e.start_year as number) ?? null,
      endYear: (e.end_year as number) ?? null,
    })),
    skills: skills.map((s) => ({
      name: s.name as string,
      category: s.category as string,
      proficiency: (s.proficiency as number) ?? null,
    })),
    certificates: certificates.map((c) => ({
      certTypeCode: c.cert_type_code as string,
      score: (c.score as string) ?? null,
    })),
    awards: awards.map((a) => ({
      title: (a.title as string) ?? null,
      level: (a.level as string) ?? null,
      rank: (a.rank as string) ?? null,
      year: (a.award_year as number) ?? null,
      issuer: (a.issuer as string) ?? null,
    })),
    experiences: experiences.map((e) => ({
      type: (e.type as string) ?? null,
      title: (e.title as string) ?? null,
      description: (e.description as string) ?? null,
      organization: (e.organization as string) ?? null,
    })),
    activities: activities.map((a) => ({
      type: null,
      role: (a.role as string) ?? null,
      hours: (a.hours as number) ?? null,
      title: (a.title as string) ?? null,
      description: (a.description as string) ?? null,
      organization: (a.organization as string) ?? null,
    })),
    personalityType,
  };
}

async function fetchAllCvData(userId: string) {
  const [cvRes, eduRes, expRes, skillRes, certRes, awardRes, actRes, personalityRes] =
    await Promise.all([
      supabaseServer.from("cv_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabaseServer.from("cv_education").select("*").eq("user_id", userId),
      supabaseServer.from("cv_experiences").select("*").eq("user_id", userId),
      supabaseServer.from("cv_skills").select("*").eq("user_id", userId),
      supabaseServer.from("cv_certificates").select("*").eq("user_id", userId),
      supabaseServer.from("cv_awards").select("*").eq("user_id", userId),
      supabaseServer.from("cv_activities").select("*").eq("user_id", userId),
      // Only fetch personality if user opted in to show on CV.
      supabaseServer
        .from("personality_results")
        .select("result_code")
        .eq("user_id", userId)
        .eq("include_in_cv", true)
        .order("taken_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (cvRes.error) throw cvRes.error;

  return {
    cvProfile: cvRes.data as Record<string, unknown> | null,
    education: (eduRes.data ?? []) as Record<string, unknown>[],
    experiences: (expRes.data ?? []) as Record<string, unknown>[],
    skills: (skillRes.data ?? []) as Record<string, unknown>[],
    certificates: (certRes.data ?? []) as Record<string, unknown>[],
    awards: (awardRes.data ?? []) as Record<string, unknown>[],
    activities: (actRes.data ?? []) as Record<string, unknown>[],
    personalityType: (personalityRes.data?.result_code as string | null) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Parse JSON from model output. The model is prompted to return ONLY JSON but
// may wrap it in markdown fences — strip those first.
// ---------------------------------------------------------------------------
function parseJsonFromModelText(text: string): unknown {
  const stripped = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  return JSON.parse(stripped);
}

// ---------------------------------------------------------------------------
// GET /api/cv/ai — fetch pending AI recommendations for the current user.
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const auth = await getAuthContext();
    if (!auth) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

    const [recoRes, aiEnabled] = await Promise.all([
      supabaseServer
        .from("cv_recommendations")
        .select("*")
        .eq("user_id", auth.user.id)
        .eq("status", "pending")
        .in("type", ["summary_suggestion", "skill_gap", "cert_gap", "course", "career_direction"])
        .order("generated_at", { ascending: false }),
      isAiEnabled(),
    ]);

    if (recoRes.error) throw recoRes.error;
    return NextResponse.json({ recommendations: recoRes.data ?? [], aiEnabled });
  } catch (err) {
    console.error("GET /api/cv/ai error:", err);
    return NextResponse.json({ error: "Không thể lấy gợi ý AI." }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/cv/ai — run an AI task or update a recommendation status.
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

    const userId = auth.user.id;
    const body = (await request.json()) as {
      action: string;
      id?: string;
      status?: string;
    };
    const { action } = body;

    const isAiTask = [
      "run_enrich_summary",
      "run_suggest_skills",
      "run_analyze_skill_gap",
      "run_analyze_cert_gap",
      "run_recommend_courses",
      "run_suggest_career_direction",
    ].includes(action);

    if (isAiTask) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count: aiCallCount, error: countError } = await supabaseServer
        .from("cv_rate_limit_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("action_type", "ai_call")
        .gte("created_at", oneHourAgo);

      if (countError) throw countError;
      if (aiCallCount !== null && aiCallCount >= 10) {
        return NextResponse.json(
          { error: "Bạn đã vượt quá giới hạn lượt gọi AI (10 lượt/giờ). Vui lòng thử lại sau." },
          { status: 429 }
        );
      }
    }

    // ------------------------------------------------------------------
    // run_enrich_summary: generate headline + summary suggestion.
    // ------------------------------------------------------------------
    if (action === "run_enrich_summary") {
      const { cvProfile, education, skills, certificates, awards, activities, experiences, personalityType } =
        await fetchAllCvData(userId);

      if (!cvProfile) {
        return NextResponse.json({ error: "Chưa có hồ sơ CV." }, { status: 400 });
      }

      const isUnder16 = computeIsUnder16(cvProfile.date_of_birth as string | null);
      const profile = buildFullProfile(cvProfile, education, skills, certificates, awards, activities, experiences, personalityType);

      const result = await runCvAiTask(profile, "enrich_summary", {
        isUnder16,
        config: { responseMimeType: "application/json", maxOutputTokens: 512 },
      });

      if (result.skipped) {
        if (result.skipReason === "kill_switch_disabled") {
          return NextResponse.json({ status: "ai_disabled" });
        }
        return NextResponse.json({ skipped: true, skipReason: result.skipReason });
      }

      await logAiCall(userId);

      const parsed = parseJsonFromModelText(result.text ?? "{}") as {
        headline?: string;
        summary?: string;
        rationale?: string;
      };

      if (!parsed.headline && !parsed.summary) {
        return NextResponse.json({ error: "Mô hình không trả về kết quả hợp lệ." }, { status: 500 });
      }

      // Replace stale pending summary_suggestion rows before inserting new one.
      await supabaseServer
        .from("cv_recommendations")
        .delete()
        .eq("user_id", userId)
        .eq("type", "summary_suggestion")
        .eq("status", "pending");

      const { data: inserted, error: insertErr } = await supabaseServer
        .from("cv_recommendations")
        .insert({
          user_id: userId,
          type: "summary_suggestion",
          payload: { headline: parsed.headline ?? null, summary: parsed.summary ?? null },
          rationale: parsed.rationale ?? null,
          source_model: result.sourceModel ?? null,
          status: "pending",
        })
        .select("*")
        .single();

      if (insertErr) throw insertErr;
      return NextResponse.json({ recommendation: inserted });
    }

    // ------------------------------------------------------------------
    // run_suggest_skills: generate up to 5 skill suggestions.
    // ------------------------------------------------------------------
    if (action === "run_suggest_skills") {
      const { cvProfile, education, skills, certificates, awards, activities, experiences, personalityType } =
        await fetchAllCvData(userId);

      if (!cvProfile) {
        return NextResponse.json({ error: "Chưa có hồ sơ CV." }, { status: 400 });
      }

      const isUnder16 = computeIsUnder16(cvProfile.date_of_birth as string | null);
      const profile = buildFullProfile(cvProfile, education, skills, certificates, awards, activities, experiences, personalityType);

      const result = await runCvAiTask(profile, "suggest_skills", {
        isUnder16,
        config: { responseMimeType: "application/json", maxOutputTokens: 768 },
      });

      if (result.skipped) {
        if (result.skipReason === "kill_switch_disabled") {
          return NextResponse.json({ status: "ai_disabled" });
        }
        return NextResponse.json({ skipped: true, skipReason: result.skipReason });
      }

      await logAiCall(userId);

      const parsed = parseJsonFromModelText(result.text ?? "{}") as {
        skills?: Array<{ name?: string; category?: string; rationale?: string }>;
      };

      const suggestedSkills = (parsed.skills ?? []).filter((s) => s.name?.trim());
      if (suggestedSkills.length === 0) {
        return NextResponse.json({ error: "Mô hình không trả về kỹ năng hợp lệ." }, { status: 500 });
      }

      // Clear stale pending suggest_skills rows.
      await supabaseServer
        .from("cv_recommendations")
        .delete()
        .eq("user_id", userId)
        .eq("type", "skill_gap")
        .eq("status", "pending")
        .eq("source_model", result.sourceModel ?? "");

      const rows = suggestedSkills.map((s) => ({
        user_id: userId,
        type: "skill_gap" as const,
        payload: {
          name: s.name!.trim(),
          category: s.category ?? "other",
          source_task: "suggest_skills",
        },
        rationale: s.rationale ?? null,
        source_model: result.sourceModel ?? null,
        status: "pending",
      }));

      const { data: inserted, error: insertErr } = await supabaseServer
        .from("cv_recommendations")
        .insert(rows)
        .select("*");

      if (insertErr) throw insertErr;
      return NextResponse.json({ recommendations: inserted ?? [] });
    }

    // ------------------------------------------------------------------
    // T16 — run_analyze_skill_gap: identify missing skills vs. target career.
    // ------------------------------------------------------------------
    if (action === "run_analyze_skill_gap") {
      const { cvProfile, education, skills, certificates, awards, activities, experiences, personalityType } =
        await fetchAllCvData(userId);

      if (!cvProfile) {
        return NextResponse.json({ error: "Chưa có hồ sơ CV." }, { status: 400 });
      }

      const isUnder16 = computeIsUnder16(cvProfile.date_of_birth as string | null);
      const profile = buildFullProfile(cvProfile, education, skills, certificates, awards, activities, experiences, personalityType);

      const result = await runCvAiTask(profile, "analyze_skill_gap", {
        isUnder16,
        config: { responseMimeType: "application/json", maxOutputTokens: 512 },
      });

      if (result.skipped) {
        if (result.skipReason === "kill_switch_disabled") {
          return NextResponse.json({ status: "ai_disabled" });
        }
        return NextResponse.json({ skipped: true, skipReason: result.skipReason });
      }

      await logAiCall(userId);

      const parsed = parseJsonFromModelText(result.text ?? "{}") as {
        gaps?: Array<{ skill?: string; category?: string; importance?: string; rationale?: string }>;
      };

      const gaps = (parsed.gaps ?? []).filter((g) => g.skill?.trim());
      if (gaps.length === 0) {
        return NextResponse.json({ error: "Mô hình không trả về kết quả hợp lệ." }, { status: 500 });
      }

      // Clear stale T16 analyze_skill_gap rows (source_task differentiates from T15).
      await supabaseServer
        .from("cv_recommendations")
        .delete()
        .eq("user_id", userId)
        .eq("type", "skill_gap")
        .eq("status", "pending")
        .filter("payload->>source_task", "eq", "analyze_skill_gap");

      const rows = gaps.map((g) => ({
        user_id: userId,
        type: "skill_gap" as const,
        payload: {
          name: g.skill!.trim(),
          category: g.category ?? "other",
          importance: g.importance ?? "medium",
          source_task: "analyze_skill_gap",
        },
        rationale: g.rationale ?? null,
        source_model: result.sourceModel ?? null,
        status: "pending",
      }));

      const { data: inserted, error: insertErr } = await supabaseServer
        .from("cv_recommendations")
        .insert(rows)
        .select("*");

      if (insertErr) throw insertErr;
      return NextResponse.json({ recommendations: inserted ?? [] });
    }

    // ------------------------------------------------------------------
    // T16 — run_analyze_cert_gap: identify missing certs vs. target major.
    // ------------------------------------------------------------------
    if (action === "run_analyze_cert_gap") {
      const { cvProfile, education, skills, certificates, awards, activities, experiences, personalityType } =
        await fetchAllCvData(userId);

      if (!cvProfile) {
        return NextResponse.json({ error: "Chưa có hồ sơ CV." }, { status: 400 });
      }

      const isUnder16 = computeIsUnder16(cvProfile.date_of_birth as string | null);
      const profile = buildFullProfile(cvProfile, education, skills, certificates, awards, activities, experiences, personalityType);

      const result = await runCvAiTask(profile, "analyze_cert_gap", {
        isUnder16,
        config: { responseMimeType: "application/json", maxOutputTokens: 512 },
      });

      if (result.skipped) {
        if (result.skipReason === "kill_switch_disabled") {
          return NextResponse.json({ status: "ai_disabled" });
        }
        return NextResponse.json({ skipped: true, skipReason: result.skipReason });
      }

      await logAiCall(userId);

      const parsed = parseJsonFromModelText(result.text ?? "{}") as {
        gaps?: Array<{ certName?: string; certTypeCode?: string; importance?: string; rationale?: string }>;
      };

      const gaps = (parsed.gaps ?? []).filter((g) => g.certName?.trim());
      if (gaps.length === 0) {
        return NextResponse.json({ error: "Mô hình không trả về kết quả hợp lệ." }, { status: 500 });
      }

      await supabaseServer
        .from("cv_recommendations")
        .delete()
        .eq("user_id", userId)
        .eq("type", "cert_gap")
        .eq("status", "pending");

      const rows = gaps.map((g) => ({
        user_id: userId,
        type: "cert_gap" as const,
        payload: {
          certName: g.certName!.trim(),
          certTypeCode: g.certTypeCode?.trim() ?? null,
          importance: g.importance ?? "medium",
        },
        rationale: g.rationale ?? null,
        source_model: result.sourceModel ?? null,
        status: "pending",
      }));

      const { data: inserted, error: insertErr } = await supabaseServer
        .from("cv_recommendations")
        .insert(rows)
        .select("*");

      if (insertErr) throw insertErr;
      return NextResponse.json({ recommendations: inserted ?? [] });
    }

    // ------------------------------------------------------------------
    // T17 — run_recommend_courses: suggest courses to bridge skill/cert gaps.
    // ------------------------------------------------------------------
    if (action === "run_recommend_courses") {
      const { cvProfile, education, skills, certificates, awards, activities, experiences, personalityType } =
        await fetchAllCvData(userId);

      if (!cvProfile) {
        return NextResponse.json({ error: "Chưa có hồ sơ CV." }, { status: 400 });
      }

      const isUnder16 = computeIsUnder16(cvProfile.date_of_birth as string | null);
      const profile = buildFullProfile(cvProfile, education, skills, certificates, awards, activities, experiences, personalityType);

      const result = await runCvAiTask(profile, "recommend_courses", {
        isUnder16,
        config: { responseMimeType: "application/json", maxOutputTokens: 768 },
      });

      if (result.skipped) {
        if (result.skipReason === "kill_switch_disabled") {
          return NextResponse.json({ status: "ai_disabled" });
        }
        return NextResponse.json({ skipped: true, skipReason: result.skipReason });
      }

      await logAiCall(userId);

      const parsed = parseJsonFromModelText(result.text ?? "{}") as {
        courses?: Array<{ name?: string; provider?: string; url?: string | null; tags?: string[]; rationale?: string }>;
      };

      const courses = (parsed.courses ?? []).filter((c) => c.name?.trim());
      if (courses.length === 0) {
        return NextResponse.json({ error: "Mô hình không trả về kết quả hợp lệ." }, { status: 500 });
      }

      await supabaseServer
        .from("cv_recommendations")
        .delete()
        .eq("user_id", userId)
        .eq("type", "course")
        .eq("status", "pending");

      const rows = courses.map((c) => ({
        user_id: userId,
        type: "course" as const,
        payload: {
          name: c.name!.trim(),
          provider: c.provider?.trim() ?? null,
          url: c.url?.trim() || null,
          tags: c.tags ?? [],
        },
        rationale: c.rationale ?? null,
        source_model: result.sourceModel ?? null,
        status: "pending",
      }));

      const { data: inserted, error: insertErr } = await supabaseServer
        .from("cv_recommendations")
        .insert(rows)
        .select("*");

      if (insertErr) throw insertErr;
      return NextResponse.json({ recommendations: inserted ?? [] });
    }

    // ------------------------------------------------------------------
    // T17 — run_suggest_career_direction: 2–3 career fits from profile.
    // ------------------------------------------------------------------
    if (action === "run_suggest_career_direction") {
      const { cvProfile, education, skills, certificates, awards, activities, experiences, personalityType } =
        await fetchAllCvData(userId);

      if (!cvProfile) {
        return NextResponse.json({ error: "Chưa có hồ sơ CV." }, { status: 400 });
      }

      const isUnder16 = computeIsUnder16(cvProfile.date_of_birth as string | null);
      const profile = buildFullProfile(cvProfile, education, skills, certificates, awards, activities, experiences, personalityType);

      const result = await runCvAiTask(profile, "suggest_career_direction", {
        isUnder16,
        config: { responseMimeType: "application/json", maxOutputTokens: 768 },
      });

      if (result.skipped) {
        if (result.skipReason === "kill_switch_disabled") {
          return NextResponse.json({ status: "ai_disabled" });
        }
        return NextResponse.json({ skipped: true, skipReason: result.skipReason });
      }

      await logAiCall(userId);

      const parsed = parseJsonFromModelText(result.text ?? "{}") as {
        directions?: Array<{ title?: string; fit?: string; rationale?: string }>;
      };

      const directions = (parsed.directions ?? []).filter((d) => d.title?.trim());
      if (directions.length === 0) {
        return NextResponse.json({ error: "Mô hình không trả về kết quả hợp lệ." }, { status: 500 });
      }

      await supabaseServer
        .from("cv_recommendations")
        .delete()
        .eq("user_id", userId)
        .eq("type", "career_direction")
        .eq("status", "pending");

      const rows = directions.map((d) => ({
        user_id: userId,
        type: "career_direction" as const,
        payload: {
          title: d.title!.trim(),
          fit: d.fit ?? "medium",
        },
        rationale: d.rationale ?? null,
        source_model: result.sourceModel ?? null,
        status: "pending",
      }));

      const { data: inserted, error: insertErr } = await supabaseServer
        .from("cv_recommendations")
        .insert(rows)
        .select("*");

      if (insertErr) throw insertErr;
      return NextResponse.json({ recommendations: inserted ?? [] });
    }

    // ------------------------------------------------------------------
    // update_recommendation_status: accept or dismiss a pending recommendation.
    // When accepted, apply the suggestion to the CV (summary_suggestion →
    // cv_profiles; skill_gap → cv_skills). AI never touches cv_certificates,
    // cv_awards, or any score/rank — this is enforced by only handling these
    // two reco types here.
    // ------------------------------------------------------------------
    if (action === "update_recommendation_status") {
      const { id, status } = body as { action: string; id?: string; status?: string };

      if (!id || !status || !["accepted", "dismissed"].includes(status)) {
        return NextResponse.json({ error: "Thiếu id hoặc status không hợp lệ." }, { status: 400 });
      }

      // Load the recommendation (must belong to current user).
      const { data: reco, error: recoErr } = await supabaseServer
        .from("cv_recommendations")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .eq("status", "pending")
        .single();

      if (recoErr || !reco) {
        return NextResponse.json({ error: "Không tìm thấy gợi ý hợp lệ." }, { status: 404 });
      }

      // Apply to CV when accepted.
      if (status === "accepted") {
        if (reco.type === "summary_suggestion") {
          const p = reco.payload as { headline?: string; summary?: string };
          const update: Record<string, string | null> = { updated_at: new Date().toISOString() };
          if (p.headline) update.headline = p.headline;
          if (p.summary) update.summary = p.summary;

          const { error: profileErr } = await supabaseServer
            .from("cv_profiles")
            .update(update)
            .eq("user_id", userId);

          if (profileErr) throw profileErr;
        }

        if (reco.type === "skill_gap") {
          const p = reco.payload as { name?: string; category?: string; source_task?: string };
          // Only auto-add to cv_skills for T15 suggest_skills (user-ready skill).
          // T16 analyze_skill_gap rows are gap acknowledgements — not added to CV.
          if (p.name && p.source_task === "suggest_skills") {
            const { error: skillErr } = await supabaseServer
              .from("cv_skills")
              .insert({
                user_id: userId,
                name: p.name,
                category: p.category ?? "other",
                proficiency: 3,
                source: "ai_suggested",
                is_confirmed: true,
              });
            if (skillErr) throw skillErr;
          }
        }
        // cert_gap, course, career_direction: mark-only — no CV modification.
      }

      // Mark the recommendation as accepted/dismissed.
      const { error: updateErr } = await supabaseServer
        .from("cv_recommendations")
        .update({ status })
        .eq("id", id)
        .eq("user_id", userId);

      if (updateErr) throw updateErr;
      return NextResponse.json({ success: true, status });
    }

    return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
  } catch (err) {
    console.error("POST /api/cv/ai error:", err);
    return NextResponse.json({ error: "Đã xảy ra lỗi khi xử lý yêu cầu AI." }, { status: 500 });
  }
}
