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

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log("Seeding test sponsored placements...");

  // Delete previous test placements
  const { error: deleteErr } = await supabase
    .from("sponsored_placements")
    .delete()
    .eq("sponsor_name", "Test Sponsor");

  if (deleteErr) {
    console.error("Error clearing old test placements:", deleteErr);
  }

  // Insert placements
  const testAds = [
    {
      sponsor_name: "Test Sponsor",
      title: "Khóa học IELTS cam kết đầu ra 7.5+",
      poster_url: "https://svbk.png", // reusing local files or placeholder image
      target_url: "https://zpath.vn/ielts-promo",
      discount_label: "Giảm 50%",
      context_tags: ["ielts", "english", "language"],
      commission_model: "cpc",
      is_active: true,
    },
    {
      sponsor_name: "Test Sponsor",
      title: "Lập trình Python và Machine Learning cơ bản",
      poster_url: "https://svbk.png",
      target_url: "https://zpath.vn/python-promo",
      discount_label: "Giảm 30%",
      context_tags: ["it", "python", "software", "technical"],
      commission_model: "cpa",
      is_active: true,
    },
  ];

  const { data, error } = await supabase
    .from("sponsored_placements")
    .insert(testAds)
    .select();

  if (error) {
    console.error("Error inserting test ads:", error);
    process.exit(1);
  }

  console.log("Successfully seeded test placements:", data);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
