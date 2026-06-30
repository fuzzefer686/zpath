import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env.local manually
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  });
}

// Set up global environment so imports do not fail
process.env.SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

// Mock server-only
try {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
    parent: null,
    children: [],
    paths: [],
  } as any;
} catch {}

const TEST_USER_ID = "00000000-0000-0000-0000-0000000000b1"; // student_under_16

// 1. Mock zpath-auth directly to bypass cookie store context checks entirely
const zpathAuthPath = require.resolve("../lib/zpath-auth");
require.cache[zpathAuthPath] = {
  id: zpathAuthPath,
  filename: zpathAuthPath,
  loaded: true,
  exports: {
    getAuthContext: async () => {
      return {
        user: {
          id: TEST_USER_ID,
          username: "student_under_16",
          role: "user",
          email: "under_16@student.zpath.test",
          phone: "0911111111"
        },
        surveyCompleted: true
      };
    },
    verifyAuthToken: () => ({ sub: TEST_USER_ID }),
    createAuthToken: () => "mocked-token"
  },
  parent: null,
  children: [],
  paths: []
} as any;

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function testRateLimits() {
  console.log("Starting rate limit endpoint verification...");

  // Dynamically import routes after zpath-auth mock is registered
  const { POST: renderPost } = await import("../app/api/cv/render/route");
  const { POST: aiPost } = await import("../app/api/cv/ai/route");

  // Clean up first
  await supabase.from("cv_rate_limit_logs").delete().eq("user_id", TEST_USER_ID);

  try {
    // 2. Test render route rate limit (under limit)
    console.log("\nTesting render route under limit...");
    const res1 = await renderPost();
    const status1 = res1.status;
    console.log(`Render status (expected < 429): ${status1}`);
    assert(status1 !== 429, "Render route returned 429 when under limit");

    // 3. Insert 10 render logs to trigger rate limit
    console.log("Simulating 10 render calls by inserting logs directly...");
    const renderLogs = Array.from({ length: 10 }).map(() => ({
      user_id: TEST_USER_ID,
      action_type: "render",
      created_at: new Date().toISOString()
    }));
    const { error: renderInsertError } = await supabase.from("cv_rate_limit_logs").insert(renderLogs);
    assert(!renderInsertError, "Failed to insert simulated render logs: " + JSON.stringify(renderInsertError));

    // 4. Test render route rate limit (over limit)
    console.log("Testing render route over limit...");
    const res2 = await renderPost();
    const status2 = res2.status;
    const json2 = await res2.json();
    console.log(`Render status (expected 429): ${status2}`);
    console.log(`Render error message:`, json2.error);
    assert(status2 === 429, "Render route failed to rate limit after 10 calls");
    assert(json2.error === "Bạn đã vượt quá giới hạn xuất bản CV (10 lượt/giờ). Vui lòng thử lại sau.", "Render rate limit error message mismatch");

    // 5. Test AI route rate limit (under limit)
    console.log("\nTesting AI route under limit...");
    // Clear logs to check AI under limit
    await supabase.from("cv_rate_limit_logs").delete().eq("user_id", TEST_USER_ID);
    
    const reqAiUnder = new Request("http://localhost:3000/api/cv/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "run_enrich_summary" })
    });
    const resAi1 = await aiPost(reqAiUnder);
    const statusAi1 = resAi1.status;
    console.log(`AI status (expected < 429): ${statusAi1}`);
    assert(statusAi1 !== 429, "AI route returned 429 when under limit");

    // 6. Insert 10 AI logs to trigger rate limit
    console.log("Simulating 10 AI calls by inserting logs directly...");
    const aiLogs = Array.from({ length: 10 }).map(() => ({
      user_id: TEST_USER_ID,
      action_type: "ai_call",
      created_at: new Date().toISOString()
    }));
    const { error: aiInsertError } = await supabase.from("cv_rate_limit_logs").insert(aiLogs);
    assert(!aiInsertError, "Failed to insert simulated AI logs: " + JSON.stringify(aiInsertError));

    // 7. Test AI route rate limit (over limit)
    console.log("Testing AI route over limit...");
    const reqAiOver = new Request("http://localhost:3000/api/cv/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "run_enrich_summary" })
    });
    const resAi2 = await aiPost(reqAiOver);
    const statusAi2 = resAi2.status;
    const jsonAi2 = await resAi2.json();
    console.log(`AI status (expected 429): ${statusAi2}`);
    console.log(`AI error message:`, jsonAi2.error);
    assert(statusAi2 === 429, "AI route failed to rate limit after 10 calls");
    assert(jsonAi2.error === "Bạn đã vượt quá giới hạn lượt gọi AI (10 lượt/giờ). Vui lòng thử lại sau.", "AI rate limit error message mismatch");

    console.log("\n✓ All rate limiting checks passed successfully!");
  } finally {
    console.log("Cleaning up rate limit logs for test user...");
    await supabase.from("cv_rate_limit_logs").delete().eq("user_id", TEST_USER_ID);
  }
}

testRateLimits().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
