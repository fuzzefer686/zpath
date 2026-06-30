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
  // Ignore if server-only is not installed/resolvable
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testApi() {
  console.log("Starting API endpoint verification...");

  // Dynamically import routes after env is set
  const { GET: getPlacements } = await import("../app/api/sponsored/route");
  const { GET: clickPlacement } = await import("../app/api/sponsored/click/route");

  // Fetch the seeded placements to get valid IDs
  const { data: placements } = await supabase
    .from("sponsored_placements")
    .select("*")
    .eq("sponsor_name", "Test Sponsor");

  if (!placements || placements.length < 2) {
    console.error("Test placements not found. Please run seed script first.");
    process.exit(1);
  }

  const ieltsAd = placements.find((p) => p.context_tags.includes("ielts"));
  const pythonAd = placements.find((p) => p.context_tags.includes("it"));

  if (!ieltsAd || !pythonAd) {
    console.error("Expected test placements missing.");
    process.exit(1);
  }

  console.log("\n--- Testing GET /api/sponsored ---");

  // Test 1: request tags = "ielts"
  {
    const req = new Request(`http://localhost:3000/api/sponsored?tags=ielts`);
    const res = await getPlacements(req);
    const json = await res.json();
    console.log("Query 'ielts' results:", json.placements?.map((p: { id: string; title: string }) => p.title));
    const hasIelts = json.placements?.some((p: { id: string; title: string }) => p.id === ieltsAd.id);
    const hasPython = json.placements?.some((p: { id: string; title: string }) => p.id === pythonAd.id);
    console.log(`- Contains IELTS ad? ${hasIelts ? "✅ YES" : "❌ NO"}`);
    console.log(`- Contains Python ad? ${hasPython ? "❌ YES (should be filtered out)" : "✅ NO"}`);
  }

  // Test 2: request tags = "it"
  {
    const req = new Request(`http://localhost:3000/api/sponsored?tags=it`);
    const res = await getPlacements(req);
    const json = await res.json();
    console.log("Query 'it' results:", json.placements?.map((p: { id: string; title: string }) => p.title));
    const hasIelts = json.placements?.some((p: { id: string; title: string }) => p.id === ieltsAd.id);
    const hasPython = json.placements?.some((p: { id: string; title: string }) => p.id === pythonAd.id);
    console.log(`- Contains IELTS ad? ${hasIelts ? "❌ YES (should be filtered out)" : "✅ NO"}`);
    console.log(`- Contains Python ad? ${hasPython ? "✅ YES" : "❌ NO"}`);
  }

  // Test 3: request tags = "ielts,it" (overlap)
  {
    const req = new Request(`http://localhost:3000/api/sponsored?tags=ielts,it`);
    const res = await getPlacements(req);
    const json = await res.json();
    console.log("Query 'ielts,it' results:", json.placements?.map((p: { id: string; title: string }) => p.title));
    const hasIelts = json.placements?.some((p: { id: string; title: string }) => p.id === ieltsAd.id);
    const hasPython = json.placements?.some((p: { id: string; title: string }) => p.id === pythonAd.id);
    console.log(`- Contains IELTS ad? ${hasIelts ? "✅ YES" : "❌ NO"}`);
    console.log(`- Contains Python ad? ${hasPython ? "✅ YES" : "❌ NO"}`);
  }

  // Test 4: query tags that do not match
  {
    const req = new Request(`http://localhost:3000/api/sponsored?tags=cooking,gardening`);
    const res = await getPlacements(req);
    const json = await res.json();
    console.log("Query 'cooking,gardening' results count:", json.placements?.length);
    console.log(`- Returns 0 results? ${json.placements?.length === 0 ? "✅ YES" : "❌ NO"}`);
  }

  console.log("\n--- Testing GET /api/sponsored/click ---");

  // Clear previous clicks for this ad
  await supabase.from("affiliate_clicks").delete().eq("placement_id", ieltsAd.id);

  // Test click and redirect
  const reqClick = new Request(
    `http://localhost:3000/api/sponsored/click?id=${ieltsAd.id}&context=capability_map`
  );
  const resClick = await clickPlacement(reqClick);

  console.log("Response status code:", resClick.status);
  console.log("Response headers location:", resClick.headers.get("location"));
  console.log(`- Redirects to target_url? ${resClick.headers.get("location") === ieltsAd.target_url ? "✅ YES" : "❌ NO"}`);

  // Check if click was recorded in the database
  const { data: clicks } = await supabase
    .from("affiliate_clicks")
    .select("*")
    .eq("placement_id", ieltsAd.id);

  console.log("Recorded clicks count:", clicks?.length);
  console.log(`- Click recorded? ${clicks && clicks.length > 0 ? "✅ YES" : "❌ NO"}`);
  if (clicks && clicks.length > 0) {
    console.log("Click context:", clicks[0].context);
    console.log(`- Context is 'capability_map'? ${clicks[0].context === "capability_map" ? "✅ YES" : "❌ NO"}`);
  }
}

testApi().catch((err) => {
  console.error(err);
  process.exit(1);
});
