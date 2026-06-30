/**
 * Seed 2 cv_templates (basic, modern) and 3 test users with complete CV profiles (6 blocks).
 *
 * Requirements:
 * - 1 user <16 years old
 * - 1 user 17 years old
 * - 1 user with an IELTS certificate
 * - Fake mock data, no real PII.
 *
 * Runs with: `npx tsx scripts/seed-cv.ts`
 * Idempotent: re-running upserts the same fixed UUIDs.
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const scryptAsync = promisify(scrypt);

// Hashing function matching the auth system
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString("base64url")}`;
}

function readEnv(key: string): string {
  if (process.env[key]) return process.env[key]!;
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    const match = content.match(new RegExp(`^${key}=(.*)$`, "m"));
    if (match) return match[1].trim();
  }
  return "";
}

const supabaseUrl = readEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (env or .env.local).",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Fixed template UUIDs
const TEMPLATES = [
  {
    id: "00000000-0000-0000-0000-000000000101",
    slug: "basic",
    name: "Bản Cơ Bản (Default)",
    engine: "react_pdf" as const,
    // Navy, sans-serif, roomy. Consumed by lib/cv/renderer/layoutConfig.ts.
    layout_config: {
      themeColor: "#1e3a8a",
      accentColor: "#2563eb",
      fontFamily: "NotoSans",
      fontScale: 1,
      spacing: "comfortable",
      density: "normal",
      showPhoto: true,
      archetype: "classic",
      sectionsOrder: ["basic", "summary", "education", "experience_skills", "certs_awards", "activities"],
    },
    locale: "vi",
    is_active: true,
  },
  {
    id: "00000000-0000-0000-0000-000000000102",
    slug: "modern",
    name: "Bản Hiện Đại",
    engine: "react_pdf" as const,
    // Emerald, serif, compact — visibly different colour/font/spacing from basic.
    layout_config: {
      themeColor: "#059669",
      accentColor: "#0d9488",
      fontFamily: "NotoSerif",
      fontScale: 0.95,
      spacing: "compact",
      density: "compact",
      showPhoto: true,
      archetype: "classic",
      sectionsOrder: ["basic", "summary", "education", "experience_skills", "certs_awards", "activities"],
    },
    locale: "vi",
    is_active: true,
  },
  // two_column archetype — 2 mẫu
  {
    id: "00000000-0000-0000-0000-000000000103",
    slug: "two-col-navy",
    name: "2 Cột — Xanh Navy",
    engine: "react_pdf" as const,
    layout_config: {
      themeColor: "#1e3a8a", accentColor: "#3b82f6",
      fontFamily: "NotoSans", fontScale: 1,
      spacing: "comfortable", density: "normal",
      showPhoto: true, archetype: "two_column",
      sectionsOrder: ["basic", "summary", "education", "experience_skills", "certs_awards", "activities"],
    },
    locale: "vi", is_active: true,
  },
  {
    id: "00000000-0000-0000-0000-000000000104",
    slug: "two-col-amber",
    name: "2 Cột — Vàng Amber",
    engine: "react_pdf" as const,
    layout_config: {
      themeColor: "#92400e", accentColor: "#d97706",
      fontFamily: "NotoSerif", fontScale: 0.95,
      spacing: "compact", density: "compact",
      showPhoto: true, archetype: "two_column",
      sectionsOrder: ["basic", "summary", "education", "experience_skills", "certs_awards", "activities"],
    },
    locale: "vi", is_active: true,
  },
  // sidebar archetype — 2 mẫu
  {
    id: "00000000-0000-0000-0000-000000000105",
    slug: "sidebar-slate",
    name: "Dải Bên — Xám Đậm",
    engine: "react_pdf" as const,
    layout_config: {
      themeColor: "#1e293b", accentColor: "#64748b",
      fontFamily: "NotoSans", fontScale: 1,
      spacing: "comfortable", density: "normal",
      showPhoto: true, archetype: "sidebar",
      sectionsOrder: ["basic", "summary", "education", "experience_skills", "certs_awards", "activities"],
    },
    locale: "vi", is_active: true,
  },
  {
    id: "00000000-0000-0000-0000-000000000106",
    slug: "sidebar-rose",
    name: "Dải Bên — Hồng Rose",
    engine: "react_pdf" as const,
    layout_config: {
      themeColor: "#9f1239", accentColor: "#e11d48",
      fontFamily: "NotoSerif", fontScale: 0.95,
      spacing: "comfortable", density: "normal",
      showPhoto: true, archetype: "sidebar",
      sectionsOrder: ["basic", "summary", "education", "experience_skills", "certs_awards", "activities"],
    },
    locale: "vi", is_active: true,
  },
  // modern archetype — 2 mẫu
  {
    id: "00000000-0000-0000-0000-000000000107",
    slug: "modern-purple",
    name: "Hiện Đại — Tím",
    engine: "react_pdf" as const,
    layout_config: {
      themeColor: "#581c87", accentColor: "#9333ea",
      fontFamily: "NotoSans", fontScale: 1,
      spacing: "comfortable", density: "normal",
      showPhoto: true, archetype: "modern",
      sectionsOrder: ["basic", "summary", "education", "experience_skills", "certs_awards", "activities"],
    },
    locale: "vi", is_active: true,
  },
  {
    id: "00000000-0000-0000-0000-000000000108",
    slug: "modern-orange",
    name: "Hiện Đại — Cam",
    engine: "react_pdf" as const,
    layout_config: {
      themeColor: "#7c2d12", accentColor: "#ea580c",
      fontFamily: "NotoSerif", fontScale: 0.95,
      spacing: "spacious", density: "relaxed",
      showPhoto: true, archetype: "modern",
      sectionsOrder: ["basic", "summary", "education", "experience_skills", "certs_awards", "activities"],
    },
    locale: "vi", is_active: true,
  },
];

// Fixed user UUIDs
const USERS = [
  {
    // User 1: Under 16 years old
    id: "00000000-0000-0000-0000-0000000000b1",
    username: "student_under_16",
    email: "under_16@student.zpath.test",
    phone: "0911111111",
    password: "Student@12345",
    dob: "2011-06-15", // 15 years old in June 2026
    profile: {
      full_name: "Nguyễn Anh Tuấn",
      gender: "Nam",
      address: "Quận Cầu Giấy, Hà Nội",
      avatar_url: null,
      headline: "Học sinh lớp 10 chuyên Tin",
      summary: "Em là học sinh lớp 10 chuyên Tin, đam mê lập trình và mong muốn tìm kiếm định hướng nghề nghiệp sớm trong ngành Khoa học Máy tính.",
      target_major_code: "CNTT",
      target_career: "Software Engineer",
    },
    education: {
      id: "00000000-0000-0000-0000-000000000e11",
      level: "THPT",
      school_name: "Trường THPT Chuyên Hà Nội - Amsterdam",
      gpa: 9.2,
      grade_10: 9.2,
      start_year: 2025,
      end_year: 2028,
      is_current: true,
    },
    experience: {
      id: "00000000-0000-0000-0000-000000000e12",
      type: "project" as const,
      title: "Website CLB Tin Học Amsterdam",
      organization: "CLB Tin học",
      description: "Thiết kế và phát triển trang web giới thiệu CLB sử dụng HTML và CSS cơ bản.",
      start_date: "2025-10-01",
      end_date: "2025-12-15",
      is_current: false,
    },
    skill: {
      id: "00000000-0000-0000-0000-000000000e13",
      name: "HTML/CSS",
      category: "technical" as const,
      proficiency: 3,
      source: "self",
      is_confirmed: true,
    },
    award: {
      id: "00000000-0000-0000-0000-000000000e14",
      title: "Giải Nhì Học sinh giỏi Tin học cấp Trường",
      level: "school" as const,
      rank: "Giải Nhì",
      issuer: "Trường THPT Chuyên Hà Nội - Amsterdam",
      award_year: 2025,
    },
    activity: {
      id: "00000000-0000-0000-0000-000000000e15",
      title: "Thành viên Ban nội dung CLB Tin Học",
      role: "Thành viên",
      organization: "CLB Tin học",
      description: "Tham gia soạn thảo tài liệu ôn tập lập trình Scratch và Python cơ bản cho các thành viên mới.",
      start_date: "2025-09-01",
      end_date: null,
      hours: 40,
    },
  },
  {
    // User 2: 17 years old
    id: "00000000-0000-0000-0000-0000000000b2",
    username: "student_17",
    email: "student_17@student.zpath.test",
    phone: "0922222222",
    password: "Student@12345",
    dob: "2009-02-20", // 17 years old in June 2026
    profile: {
      full_name: "Lê Minh Khôi",
      gender: "Nam",
      address: "Quận Hà Đông, Hà Nội",
      avatar_url: null,
      headline: "Học sinh lớp 12 chuyên Lý",
      summary: "Học sinh lớp 12 chuyên Lý đam mê nghiên cứu IoT và chế tạo robot. Đang tìm kiếm học bổng đại học ngành Kỹ thuật Điện tử.",
      target_major_code: "KT-CN",
      target_career: "Hardware Engineer",
    },
    education: {
      id: "00000000-0000-0000-0000-000000000e21",
      level: "THPT",
      school_name: "Trường THPT Chuyên Nguyễn Huệ",
      gpa: 8.8,
      grade_10: 8.6,
      grade_11: 8.9,
      grade_12: 8.9,
      start_year: 2023,
      end_year: 2026,
      is_current: true,
    },
    experience: {
      id: "00000000-0000-0000-0000-000000000e22",
      type: "competition" as const,
      title: "Cuộc thi Khoa học Kỹ thuật cấp Tỉnh",
      organization: "Sở Giáo dục và Đào tạo Hà Nội",
      description: "Chế tạo mô hình hệ thống IoT phát hiện và cảnh báo rò rỉ khí gas trong gia đình.",
      start_date: "2024-09-01",
      end_date: "2024-12-01",
      is_current: false,
    },
    skill: {
      id: "00000000-0000-0000-0000-000000000e23",
      name: "Arduino & C++",
      category: "technical" as const,
      proficiency: 4,
      source: "self",
      is_confirmed: true,
    },
    award: {
      id: "00000000-0000-0000-0000-000000000e24",
      title: "Giải Ba Cuộc thi Khoa học Kỹ thuật cấp Tỉnh",
      level: "province" as const,
      rank: "Giải Ba",
      issuer: "Sở Giáo dục và Đào tạo Hà Nội",
      award_year: 2024,
    },
    activity: {
      id: "00000000-0000-0000-0000-000000000e25",
      title: "Đội trưởng Đội Robocon Trường",
      role: "Đội trưởng",
      organization: "Trường THPT Chuyên Nguyễn Huệ",
      description: "Lên kế hoạch luyện tập, phân chia công việc chế tạo và lập trình robot dò đường tham gia giải giao lưu robocon.",
      start_date: "2023-10-01",
      end_date: "2024-05-15",
      hours: 120,
    },
  },
  {
    // User 3: 18 years old with IELTS
    id: "00000000-0000-0000-0000-0000000000b3",
    username: "student_ielts",
    email: "student_ielts@student.zpath.test",
    phone: "0933333333",
    password: "Student@12345",
    dob: "2008-05-10", // 18 years old in June 2026
    profile: {
      full_name: "Trần Thị Mai Chi",
      gender: "Nữ",
      address: "Quận Cầu Giấy, Hà Nội",
      avatar_url: null,
      headline: "Học sinh lớp 12 chuyên Anh",
      summary: "Học sinh lớp 12 chuyên Anh năng động, có thế mạnh về giao tiếp quốc tế. Sở hữu IELTS 7.5 và mong muốn ứng tuyển học bổng ngành Kinh tế Quốc tế tại FTU.",
      target_major_code: "KDQT",
      target_career: "Logistics Coordinator",
    },
    education: {
      id: "00000000-0000-0000-0000-000000000e31",
      level: "THPT",
      school_name: "Trường THPT Chuyên Ngoại ngữ",
      gpa: 9.4,
      grade_10: 9.3,
      grade_11: 9.5,
      grade_12: 9.4,
      start_year: 2023,
      end_year: 2026,
      is_current: true,
    },
    experience: {
      id: "00000000-0000-0000-0000-000000000e32",
      type: "volunteer" as const,
      title: "Tình nguyện viên Hội nghị Thượng đỉnh Trẻ",
      organization: "AIESEC Vietnam",
      description: "Hỗ trợ công tác lễ tân đón đoàn, hướng dẫn đại biểu quốc tế và phiên dịch cabin các phiên thảo luận chuyên đề.",
      start_date: "2024-07-10",
      end_date: "2024-07-15",
      is_current: false,
    },
    skill: {
      id: "00000000-0000-0000-0000-000000000e33",
      name: "English Communication",
      category: "soft" as const,
      proficiency: 5,
      source: "self",
      is_confirmed: true,
    },
    certificate: {
      id: "00000000-0000-0000-0000-000000000e34",
      cert_type_code: "IELTS",
      score: "7.5",
      issued_date: "2024-08-15",
      expiry_date: "2026-08-15",
      evidence_url: "evidence/ielts_mock.jpg",
      is_verified: true,
    },
    award: {
      id: "00000000-0000-0000-0000-000000000e35",
      title: "Giải Nhất Học sinh giỏi Tiếng Anh cấp Thành phố",
      level: "province" as const,
      rank: "Giải Nhất",
      issuer: "Sở Giáo dục và Đào tạo Hà Nội",
      award_year: 2024,
    },
    activity: {
      id: "00000000-0000-0000-0000-000000000e36",
      title: "Trưởng Ban Đối Ngoại Dự án Nghệ thuật Lớp",
      role: "Trưởng Ban",
      organization: "Trường THPT Chuyên Ngoại ngữ",
      description: "Thuyết phục thành công 3 nhà tài trợ là trung tâm Anh ngữ lớn hỗ trợ học bổng và tiền mặt trị giá 15 triệu VNĐ.",
      start_date: "2023-11-01",
      end_date: "2024-04-30",
      hours: 80,
    },
  },
];

async function seed() {
  console.log("Starting CV templates seeding...");
  for (const t of TEMPLATES) {
    const { error: templateError } = await supabase.from("cv_templates").upsert(
      {
        id: t.id,
        slug: t.slug,
        name: t.name,
        engine: t.engine,
        layout_config: t.layout_config,
        locale: t.locale,
        is_active: t.is_active,
      },
      { onConflict: "slug" },
    );
    if (templateError) {
      console.error(`Failed to upsert cv_templates for slug ${t.slug}:`, templateError);
    } else {
      console.log(`Seeded cv_template: ${t.slug}`);
    }
  }

  console.log("Starting User test + CV profiles seeding...");
  for (const u of USERS) {
    const passwordHash = await hashPassword(u.password);

    // 1. Seed custom user table
    const { error: userError } = await supabase.from("zpath_users").upsert(
      {
        id: u.id,
        username: u.username,
        email: u.email,
        phone: u.phone,
        password_hash: passwordHash,
        role: "user",
        auth_provider: "password",
      },
      { onConflict: "id" },
    );
    if (userError) {
      console.error(`Failed to upsert zpath_users for ${u.username}:`, userError);
      continue;
    }

    // 2. Seed basic cv_profile
    const { error: profileError } = await supabase.from("cv_profiles").upsert(
      {
        user_id: u.id,
        full_name: u.profile.full_name,
        date_of_birth: u.dob,
        gender: u.profile.gender,
        phone: u.phone,
        email: u.email,
        address: u.profile.address,
        avatar_url: u.profile.avatar_url,
        headline: u.profile.headline,
        summary: u.profile.summary,
        target_major_code: u.profile.target_major_code,
        target_career: u.profile.target_career,
        // sections_config uses default constraint value
      },
      { onConflict: "user_id" },
    );
    if (profileError) {
      console.error(`Failed to upsert cv_profiles for ${u.username}:`, profileError);
      continue;
    }

    // 3. Seed cv_education
    if (u.education) {
      const { error: eduError } = await supabase.from("cv_education").upsert(
        {
          id: u.education.id,
          user_id: u.id,
          level: u.education.level,
          school_name: u.education.school_name,
          gpa: u.education.gpa,
          grade_10: u.education.grade_10,
          grade_11: u.education.grade_11,
          grade_12: u.education.grade_12,
          start_year: u.education.start_year,
          end_year: u.education.end_year,
          is_current: u.education.is_current,
        },
        { onConflict: "id" },
      );
      if (eduError) console.error(`Failed to upsert cv_education for ${u.username}:`, eduError);
    }

    // 4. Seed cv_experiences
    if (u.experience) {
      const { error: expError } = await supabase.from("cv_experiences").upsert(
        {
          id: u.experience.id,
          user_id: u.id,
          type: u.experience.type,
          title: u.experience.title,
          organization: u.experience.organization,
          description: u.experience.description,
          start_date: u.experience.start_date,
          end_date: u.experience.end_date,
          is_current: u.experience.is_current,
        },
        { onConflict: "id" },
      );
      if (expError) console.error(`Failed to upsert cv_experiences for ${u.username}:`, expError);
    }

    // 5. Seed cv_skills
    if (u.skill) {
      const { error: skillError } = await supabase.from("cv_skills").upsert(
        {
          id: u.skill.id,
          user_id: u.id,
          name: u.skill.name,
          category: u.skill.category,
          proficiency: u.skill.proficiency,
          source: u.skill.source,
          is_confirmed: u.skill.is_confirmed,
        },
        { onConflict: "id" },
      );
      if (skillError) console.error(`Failed to upsert cv_skills for ${u.username}:`, skillError);
    }

    // 6. Seed cv_certificates
    if ("certificate" in u && u.certificate) {
      const { error: certError } = await supabase.from("cv_certificates").upsert(
        {
          id: u.certificate.id,
          user_id: u.id,
          cert_type_code: u.certificate.cert_type_code,
          score: u.certificate.score,
          issued_date: u.certificate.issued_date,
          expiry_date: u.certificate.expiry_date,
          evidence_url: u.certificate.evidence_url,
          is_verified: u.certificate.is_verified,
        },
        { onConflict: "id" },
      );
      if (certError) console.error(`Failed to upsert cv_certificates for ${u.username}:`, certError);
    }

    // 7. Seed cv_awards
    if (u.award) {
      const { error: awardError } = await supabase.from("cv_awards").upsert(
        {
          id: u.award.id,
          user_id: u.id,
          title: u.award.title,
          level: u.award.level,
          rank: u.award.rank,
          issuer: u.award.issuer,
          award_year: u.award.award_year,
        },
        { onConflict: "id" },
      );
      if (awardError) console.error(`Failed to upsert cv_awards for ${u.username}:`, awardError);
    }

    // 8. Seed cv_activities
    if (u.activity) {
      const { error: actError } = await supabase.from("cv_activities").upsert(
        {
          id: u.activity.id,
          user_id: u.id,
          title: u.activity.title,
          role: u.activity.role,
          organization: u.activity.organization,
          description: u.activity.description,
          start_date: u.activity.start_date,
          end_date: u.activity.end_date,
          hours: u.activity.hours,
        },
        { onConflict: "id" },
      );
      if (actError) console.error(`Failed to upsert cv_activities for ${u.username}:`, actError);
    }

    console.log(`Seeded test user: ${u.username} (password: ${u.password})`);
  }

  console.log("Seeding process completed successfully!");
}

seed();
