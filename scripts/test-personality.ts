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

// Mock server-only to prevent it from throwing an error in standard Node environment
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
  } as unknown as NodeModule;
} catch {
  // Ignore if server-only is not installed
}

// Set Node environment to test
(process.env as Record<string, string | undefined>).NODE_ENV = "test";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testPersonality() {
  console.log("Starting Personality Framework API verification...");

  // Fetch a test user ID from the database
  const { data: users } = await supabase.from("zpath_users").select("id").limit(1);
  if (!users || users.length === 0) {
    console.error("No users found in zpath_users to run test under.");
    process.exit(1);
  }
  const testUserId = users[0].id;

  // Dynamically import routes after environment is set
  const { GET: handleGet, POST: handlePost } = await import("../app/api/personality/route");

  console.log("\n--- Testing GET /api/personality?action=questions ---");
  {
    const req = new Request(`http://localhost:3000/api/personality?action=questions&slug=mbti`, {
      headers: { "x-test-user-id": testUserId },
    });
    const res = await handleGet(req);
    const json = await res.json();
    console.log("Questions count:", json.questions?.length);
    console.log(`- Returns 4 seeded questions? ${json.questions?.length === 4 ? "✅ YES" : "❌ NO"}`);
    if (json.questions && json.questions.length > 0) {
      console.log("Question 1 text:", json.questions[0].question_text);
    }
  }

  // Clear previous test results for this user
  await supabase.from("personality_results").delete().eq("user_id", testUserId);

  console.log("\n--- Testing POST /api/personality (submit test) ---");
  // Fetch questions to get valid IDs
  const { data: dbQuestions } = await supabase
    .from("personality_questions")
    .select("*")
    .eq("test_slug", "mbti")
    .order("sort_order", { ascending: true });

  if (!dbQuestions || dbQuestions.length < 4) {
    console.error("Seeded questions not found in DB.");
    process.exit(1);
  }

  // Answer A for all should result in 'ESTJ'
  const testAnswers: Record<string, "a" | "b"> = {};
  dbQuestions.forEach((q) => {
    testAnswers[q.id] = "a";
  });

  {
    const req = new Request(`http://localhost:3000/api/personality`, {
      method: "POST",
      headers: {
        "x-test-user-id": testUserId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "submit",
        test_slug: "mbti",
        answers: testAnswers,
      }),
    });
    const res = await handlePost(req);
    const json = await res.json();
    const result = json.result;

    console.log("Submitted test result code:", result?.result_code);
    console.log(`- Result code is 'ESTJ'? ${result?.result_code === "ESTJ" ? "✅ YES" : "❌ NO"}`);
    console.log("Calculated summary:", result?.summary);
    console.log("Scores tally:", result?.scores);

    // Test toggle_cv on this result
    console.log("\n--- Testing POST /api/personality (toggle_cv) ---");
    const reqToggle = new Request(`http://localhost:3000/api/personality`, {
      method: "POST",
      headers: {
        "x-test-user-id": testUserId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "toggle_cv",
        result_id: result.id,
        include_in_cv: true,
      }),
    });
    const resToggle = await handlePost(reqToggle);
    const jsonToggle = await resToggle.json();
    console.log("Toggle success?", jsonToggle.success);
    console.log("Result include_in_cv is:", jsonToggle.result?.include_in_cv);
    console.log(`- include_in_cv is true? ${jsonToggle.result?.include_in_cv === true ? "✅ YES" : "❌ NO"}`);

    // Test GET /api/personality?action=latest
    console.log("\n--- Testing GET /api/personality?action=latest ---");
    const reqLatest = new Request(`http://localhost:3000/api/personality?action=latest`, {
      headers: { "x-test-user-id": testUserId },
    });
    const resLatest = await handleGet(reqLatest);
    const jsonLatest = await resLatest.json();
    console.log("Latest result code:", jsonLatest.result?.result_code);
    console.log(`- Latest code matches submitted code? ${jsonLatest.result?.result_code === "ESTJ" ? "✅ YES" : "❌ NO"}`);
    console.log(`- include_in_cv in latest is true? ${jsonLatest.result?.include_in_cv === true ? "✅ YES" : "❌ NO"}`);
  }
}

testPersonality().catch((err) => {
  console.error(err);
  process.exit(1);
});
