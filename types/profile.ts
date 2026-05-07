import type { SbtiType, Subject } from "./zpath";

export interface UserProfile {
  name: string;
  avatar: string; // dataURL or empty
  school: string;
  grade: string; // "12", "11", ...
  targetUniversity: string; // code or text
  sbti: SbtiType | "";
  scoreMath: number;
  scoreLiterature: number;
  electiveSubject1: Subject | "";
  electiveScore1: number;
  electiveSubject2: Subject | "";
  electiveScore2: number;
  ielts: number;
  culturalAward: "none" | "encouragement" | "third" | "second" | "first";
  region: string;
  bio: string;
}

export const EMPTY_PROFILE: UserProfile = {
  name: "",
  avatar: "",
  school: "",
  grade: "",
  targetUniversity: "",
  sbti: "",
  scoreMath: 0,
  scoreLiterature: 0,
  electiveSubject1: "",
  electiveScore1: 0,
  electiveSubject2: "",
  electiveScore2: 0,
  ielts: 0,
  culturalAward: "none",
  region: "",
  bio: "",
};

const KEY = "zpath:profile";

export function loadProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return { ...EMPTY_PROFILE, ...JSON.parse(raw) } as UserProfile;
  } catch {
    return null;
  }
}

export function saveProfile(p: UserProfile) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function clearProfile() {
  localStorage.removeItem(KEY);
}
