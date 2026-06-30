import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Read from .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
let supabaseUrl = "";
let serviceRoleKey = "";

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
  const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
  if (urlMatch) supabaseUrl = urlMatch[1].trim();
  if (keyMatch) serviceRoleKey = keyMatch[1].trim();
}

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Test user ID (using student_under_16 from seed)
const TEST_USER_ID = "00000000-0000-0000-0000-0000000000b1";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log("Running database-level CV CRUD logic checks...");

  // 1. Check template retrieval
  const { data: templates, error: tempError } = await supabase
    .from("cv_templates")
    .select("*")
    .eq("slug", "basic")
    .single();
  assert(!tempError, "Fetch cv_templates error");
  assert(templates !== null, "Basic template must exist");
  console.log("✓ Template verification passed.");

  // 2. Read existing basic profile
  const { data: profile, error: profError } = await supabase
    .from("cv_profiles")
    .select("*")
    .eq("user_id", TEST_USER_ID)
    .single();
  assert(!profError, "Fetch cv_profiles error");
  assert(profile.full_name === "Nguyễn Anh Tuấn", "Basic profile data mismatch");
  console.log("✓ Basic profile verification passed.");

  // 3. Insert and delete a test education record
  const testEduId = "00000000-0000-0000-0000-999999999999";
  const { error: insertEduError } = await supabase
    .from("cv_education")
    .insert({
      id: testEduId,
      user_id: TEST_USER_ID,
      level: "university",
      school_name: "Test University",
      gpa: 8.5,
      start_year: 2026,
      end_year: 2030,
      is_current: false,
    });
  assert(!insertEduError, "Insert cv_education error: " + JSON.stringify(insertEduError));

  const { data: insertedEdu, error: fetchEduError } = await supabase
    .from("cv_education")
    .select("*")
    .eq("id", testEduId)
    .single();
  assert(!fetchEduError, "Fetch inserted cv_education error");
  assert(insertedEdu.school_name === "Test University", "Inserted school name mismatch");
  assert(Number(insertedEdu.gpa) === 8.5, "Inserted GPA mismatch");
  console.log("✓ Insert cv_education verified.");

  // Delete the test record
  const { error: deleteEduError } = await supabase
    .from("cv_education")
    .delete()
    .eq("id", testEduId);
  assert(!deleteEduError, "Delete cv_education error");

  const { data: deletedEdu } = await supabase
    .from("cv_education")
    .select("*")
    .eq("id", testEduId)
    .maybeSingle();
  assert(deletedEdu === null, "Education record was not deleted");
  console.log("✓ Delete cv_education verified.");

  // 4. Insert and delete a test skill
  const testSkillId = "00000000-0000-0000-0000-999999999998";
  const { error: insertSkillError } = await supabase
    .from("cv_skills")
    .insert({
      id: testSkillId,
      user_id: TEST_USER_ID,
      name: "Test Skill",
      category: "technical",
      proficiency: 5,
      source: "self",
      is_confirmed: true,
    });
  assert(!insertSkillError, "Insert cv_skills error");

  const { data: insertedSkill } = await supabase
    .from("cv_skills")
    .select("*")
    .eq("id", testSkillId)
    .single();
  assert(insertedSkill !== null && insertedSkill.name === "Test Skill", "Skill validation mismatch");
  console.log("✓ Insert cv_skills verified.");

  const { error: deleteSkillError } = await supabase
    .from("cv_skills")
    .delete()
    .eq("id", testSkillId);
  assert(!deleteSkillError, "Delete cv_skills error");
  console.log("✓ Delete cv_skills verified.");

  // 5. Test sections_config update
  const newConfig = {
    order: ["activities", "certs_awards", "experience_skills", "education", "summary", "basic"],
    visibility: { basic: true, summary: false, education: true, experience_skills: true, certs_awards: true, activities: false }
  };
  const { error: layoutError } = await supabase
    .from("cv_profiles")
    .update({ sections_config: newConfig })
    .eq("user_id", TEST_USER_ID);
  assert(!layoutError, "Update sections_config error");

  const { data: updatedProfile } = await supabase
    .from("cv_profiles")
    .select("sections_config")
    .eq("user_id", TEST_USER_ID)
    .single();
  assert(updatedProfile !== null, "Fetch updated profile error");
  assert(updatedProfile!.sections_config.order[0] === "activities", "sections_config order mismatch");
  assert(updatedProfile!.sections_config.visibility.summary === false, "sections_config visibility mismatch");
  console.log("✓ Update sections_config layout verified.");

  // 6. Test certificate evidence storage integration
  console.log("Testing certificate evidence storage integration...");
  const testCertId = "00000000-0000-0000-0000-888888888888";
  
  // Clean up any stale test cert
  await supabase.from("cv_certificates").delete().eq("id", testCertId);

  // Create certificate
  const { error: insertCertError } = await supabase
    .from("cv_certificates")
    .insert({
      id: testCertId,
      user_id: TEST_USER_ID,
      cert_type_code: "IELTS_ACADEMIC",
      score: "8.5",
      evidence_url: `${TEST_USER_ID}/${testCertId}/test-cert.pdf`
    });
  assert(!insertCertError, "Insert cv_certificates error: " + JSON.stringify(insertCertError));

  // Upload mock file to Storage
  const mockFileBuffer = Buffer.from("mock pdf file content");
  const storagePath = `${TEST_USER_ID}/${testCertId}/test-cert.pdf`;
  
  // Clean up any stale storage file
  await supabase.storage.from("cv-evidence").remove([storagePath]);

  const { error: uploadError } = await supabase.storage
    .from("cv-evidence")
    .upload(storagePath, mockFileBuffer, {
      contentType: "application/pdf",
      upsert: true
    });
  assert(!uploadError, "Storage upload error: " + JSON.stringify(uploadError));
  console.log("✓ Uploaded mock evidence file to storage.");

  // Check signed URL creation
  const { data: signedData, error: signedError } = await supabase.storage
    .from("cv-evidence")
    .createSignedUrl(storagePath, 1800);
  assert(!signedError && signedData !== null, "Create signed URL error: " + JSON.stringify(signedError));
  assert(signedData!.signedUrl.startsWith("http"), "Signed URL must start with http");
  console.log("✓ Generated signed URL successfully.");

  // Now delete certificate record
  const { data: existingCert } = await supabase
    .from("cv_certificates")
    .select("evidence_url")
    .eq("id", testCertId)
    .eq("user_id", TEST_USER_ID)
    .maybeSingle();

  assert(existingCert !== null && existingCert.evidence_url === storagePath, "Fetch existing certificate mismatch");

  // Remove storage file
  if (existingCert?.evidence_url) {
    const { error: removeError } = await supabase.storage
      .from("cv-evidence")
      .remove([existingCert.evidence_url]);
    assert(!removeError, "Remove storage file error: " + JSON.stringify(removeError));
  }

  // Delete DB record
  const { error: deleteCertError } = await supabase
    .from("cv_certificates")
    .delete()
    .eq("id", testCertId);
  assert(!deleteCertError, "Delete cv_certificates error");

  // Check file no longer exists in storage
  const { data: fileList, error: listError } = await supabase.storage
    .from("cv-evidence")
    .list(`${TEST_USER_ID}/${testCertId}`);
  assert(!listError, "List storage files error");
  assert(fileList?.length === 0, "Storage file was not deleted");
  console.log("✓ Evidence storage deletion cascade verified.");

  // Restore default config to avoid breaking other tests
  const defaultConfig = {
    order: ["basic", "summary", "education", "experience_skills", "certs_awards", "activities"],
    visibility: { basic: true, summary: true, education: true, experience_skills: true, certs_awards: true, activities: true }
  };
  await supabase
    .from("cv_profiles")
    .update({ sections_config: defaultConfig })
    .eq("user_id", TEST_USER_ID);

  console.log("All database-level CV CRUD tests passed successfully!");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
