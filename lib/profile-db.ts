import { supabase } from "@/app/lib/supabase";
import type { UserProfile } from "@/types/profile";
import { EMPTY_PROFILE } from "@/types/profile";

// DB row → UI profile
function rowToProfile(r: Record<string, unknown>): UserProfile {
  const get = <T,>(k: string, def: T): T => (r[k] as T) ?? def;
  return {
    name: get("name", ""),
    avatar: get("avatar", ""),
    school: get("school", ""),
    grade: get("grade", ""),
    targetUniversity: get("target_university", ""),
    sbti: get("sbti", "") as UserProfile["sbti"],
    scoreMath: Number(r.score_math ?? 0),
    scoreLiterature: Number(r.score_literature ?? 0),
    electiveSubject1: get("elective_subject_1", "") as UserProfile["electiveSubject1"],
    electiveScore1: Number(r.elective_score_1 ?? 0),
    electiveSubject2: get("elective_subject_2", "") as UserProfile["electiveSubject2"],
    electiveScore2: Number(r.elective_score_2 ?? 0),
    ielts: Number(r.ielts ?? 0),
    culturalAward: get("cultural_award", "none") as UserProfile["culturalAward"],
    region: get("region", ""),
    bio: get("bio", ""),
  };
}

function profileToRow(p: UserProfile) {
  return {
    name: p.name,
    avatar: p.avatar,
    school: p.school,
    grade: p.grade,
    target_university: p.targetUniversity,
    sbti: p.sbti,
    score_math: p.scoreMath,
    score_literature: p.scoreLiterature,
    elective_subject_1: p.electiveSubject1,
    elective_score_1: p.electiveScore1,
    elective_subject_2: p.electiveSubject2,
    elective_score_2: p.electiveScore2,
    ielts: p.ielts,
    cultural_award: p.culturalAward,
    region: p.region,
    bio: p.bio,
  };
}

export async function fetchProfile(userId: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  
  if (error) throw error;
  if (!data) return EMPTY_PROFILE;
  return rowToProfile(data as Record<string, unknown>);
}

export async function upsertProfile(userId: string, p: UserProfile) {
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...profileToRow(p) });
    
  if (error) throw error;
}
