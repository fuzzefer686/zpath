import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/zpath-auth";
import { supabaseServer } from "@/src/lib/db/supabaseServer";
import { PERSONALITY_DESCRIPTIONS } from "@/lib/personality-descriptions";
import type { SbtiType } from "@/types/zpath";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveAuthContext(request: Request) {
  try {
    const auth = await getAuthContext();
    if (auth) return auth;
  } catch {
    // Ignore outside request scope
  }
  if (process.env.NODE_ENV === "test") {
    const testUserId = request.headers.get("x-test-user-id");
    if (testUserId) {
      return {
        user: {
          id: testUserId,
          username: "testuser",
          role: "user" as const,
          email: "test@zpath.vn",
          phone: "0123456789",
        },
        surveyCompleted: true,
      };
    }
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const auth = await resolveAuthContext(request);
    if (!auth) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "questions") {
      const slug = searchParams.get("slug") || "mbti";
      const { data: questions, error } = await supabaseServer
        .from("personality_questions")
        .select("*")
        .eq("test_slug", slug)
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Error fetching personality questions:", error);
        return NextResponse.json({ error: "Không thể lấy câu hỏi trắc nghiệm." }, { status: 500 });
      }

      return NextResponse.json({ questions: questions ?? [] });
    }

    if (action === "latest") {
      const { data: results, error } = await supabaseServer
        .from("personality_results")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("taken_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error fetching latest personality result:", error);
        return NextResponse.json({ error: "Không thể lấy kết quả trắc nghiệm." }, { status: 500 });
      }

      return NextResponse.json({ result: results?.[0] || null });
    }

    return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
  } catch (err) {
    console.error("GET /api/personality error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await resolveAuthContext(request);
    if (!auth) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === "submit") {
      const { test_slug, answers } = body as {
        test_slug: string;
        answers: Record<string, "a" | "b">;
      };

      if (!test_slug || !answers) {
        return NextResponse.json({ error: "Thiếu dữ liệu trắc nghiệm." }, { status: 400 });
      }

      // Fetch questions from DB to score them
      const { data: questions, error: fetchErr } = await supabaseServer
        .from("personality_questions")
        .select("*")
        .eq("test_slug", test_slug);

      if (fetchErr || !questions || questions.length === 0) {
        console.error("Error fetching questions for scoring:", fetchErr);
        return NextResponse.json({ error: "Không tìm thấy bộ câu hỏi." }, { status: 500 });
      }

      // Tally scores for each axis
      const scoreTally: Record<string, number> = {
        E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0
      };

      for (const question of questions) {
        const answer = answers[question.id];
        if (!answer) {
          return NextResponse.json({ error: `Chưa trả lời câu hỏi: ${question.question_text}` }, { status: 400 });
        }
        if (answer === "a") {
          const val = question.value_a;
          scoreTally[val] = (scoreTally[val] || 0) + 1;
        } else if (answer === "b") {
          const val = question.value_b;
          scoreTally[val] = (scoreTally[val] || 0) + 1;
        }
      }

      // Compute MBTI/SBTI code
      const ei = scoreTally.E >= scoreTally.I ? "E" : "I";
      const sn = scoreTally.S >= scoreTally.N ? "S" : "N";
      const tf = scoreTally.T >= scoreTally.F ? "T" : "F";
      const jp = scoreTally.J >= scoreTally.P ? "J" : "P";
      const code = `${ei}${sn}${tf}${jp}` as SbtiType;

      // Get description
      const desc = PERSONALITY_DESCRIPTIONS[code];
      const summaryText = desc
        ? `${desc.title}: ${desc.summary}`
        : "Không tìm thấy mô tả tính cách phù hợp.";

      // Insert result
      const { data: newResult, error: insertErr } = await supabaseServer
        .from("personality_results")
        .insert({
          user_id: auth.user.id,
          test_slug: test_slug,
          result_code: code,
          scores: scoreTally,
          summary: summaryText,
          include_in_cv: false,
        })
        .select()
        .single();

      if (insertErr) {
        console.error("Error saving personality result:", insertErr);
        return NextResponse.json({ error: "Không thể lưu kết quả trắc nghiệm." }, { status: 500 });
      }

      return NextResponse.json({ result: newResult });
    }

    if (action === "toggle_cv") {
      const { result_id, include_in_cv } = body as {
        result_id: string;
        include_in_cv: boolean;
      };

      if (!result_id) {
        return NextResponse.json({ error: "Thiếu ID kết quả." }, { status: 400 });
      }

      const { data: updatedResult, error: updateErr } = await supabaseServer
        .from("personality_results")
        .update({ include_in_cv })
        .eq("id", result_id)
        .eq("user_id", auth.user.id)
        .select()
        .single();

      if (updateErr) {
        console.error("Error updating include_in_cv:", updateErr);
        return NextResponse.json({ error: "Không thể cập nhật cấu hình CV." }, { status: 500 });
      }

      return NextResponse.json({ success: true, result: updatedResult });
    }

    return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
  } catch (err) {
    console.error("POST /api/personality error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
