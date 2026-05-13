import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Lấy thông tin từ .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
let supabaseUrl = "";
let supabaseKey = "";

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
  const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
  if (urlMatch) supabaseUrl = urlMatch[1].trim();
  if (keyMatch) supabaseKey = keyMatch[1].trim();
}

if (!supabaseUrl || !supabaseKey) {
  console.error("Không tìm thấy NEXT_PUBLIC_SUPABASE_URL hoặc KEY trong .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  const dataPath = path.resolve(process.cwd(), "unimap_data.json");
  if (!fs.existsSync(dataPath)) {
    console.error("Không tìm thấy file unimap_data.json");
    process.exit(1);
  }

  const rawData = fs.readFileSync(dataPath, "utf-8");
  const data = JSON.parse(rawData);

  console.log("Seeding Majors...");
  if (data.majors) {
    for (const major of data.majors) {
      const { error } = await supabase.from("majors").upsert({
        code: major.major_code,
        name: major.name,
        // Since the JSON doesn't provide category, description, we keep them empty or null
      }, { onConflict: 'code' });
      if (error) console.error("Error inserting major", major.major_code, error);
    }
  }

  console.log("Seeding Universities...");
  if (data.universities) {
    for (const uni of data.universities) {
      const { error } = await supabase.from("universities").upsert({
        code: uni.code,
        name: uni.name,
        short_desc: uni.short_desc,
        tags: uni.tags,
        city: uni.city,
        website: uni.website || null,
        about: uni.about,
        highlights: uni.highlights,
      }, { onConflict: 'code' });
      if (error) console.error("Error inserting university", uni.code, error);
    }
  }

  console.log("Seeding Programs (Ngành đào tạo của từng trường)...");
  if (data.universities) {
    for (const uni of data.universities) {
      if (!uni.programs) continue;
      for (const prog of uni.programs) {
        const { error } = await supabase.from("programs").upsert({
          university_code: uni.code,
          major_code: prog.major_code || null,
          program_code: prog.program_code,
          name: prog.name,
          admission_score_2025: prog.admission_score_2025,
          tuition_per_semester: prog.tuition_per_semester,
        }, { onConflict: 'university_code,program_code' });
        if (error) console.error("Error inserting program", prog.program_code, "in", uni.code, error);
      }
    }
  }

  console.log("Seed hoàn tất!");
}

seed();
