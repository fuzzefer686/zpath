import "server-only";

import { supabaseServer } from "@/src/lib/db/supabaseServer";
import type { NewsArticle } from "@/types/news";
import { listNewsArticles } from "@/lib/news-server";

export type AdminProfile = {
  id: string;
  displayName: string;
  school: string | null;
  grade: string | null;
  targetUniversity: string | null;
  avatarUrl: string | null;
  updatedAt: string | null;
};

export type AdminUser = {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  role: "admin" | "user";
  authProvider: string | null;
  createdAt: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  school: string | null;
  grade: string | null;
  target_university: string | null;
  avatar_url: string | null;
  updated_at: string | null;
};

type UserRow = {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  auth_provider: string | null;
  created_at: string;
};

export async function listAdminNewsArticles(): Promise<NewsArticle[]> {
  return listNewsArticles({ scope: "admin", userId: "admin" });
}

export async function listAdminProfiles(): Promise<AdminProfile[]> {
  const { data, error } = await supabaseServer
    .from("profiles")
    .select("id, display_name, school, grade, target_university, avatar_url, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as ProfileRow[]).map((profile) => ({
    id: profile.id,
    displayName: profile.display_name ?? "Chưa đặt tên",
    school: profile.school,
    grade: profile.grade,
    targetUniversity: profile.target_university,
    avatarUrl: profile.avatar_url,
    updatedAt: profile.updated_at,
  }));
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabaseServer
    .from("zpath_users")
    .select("id, username, email, phone, role, auth_provider, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as UserRow[]).map((user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    role: user.role === "admin" ? "admin" : "user",
    authProvider: user.auth_provider,
    createdAt: user.created_at,
  }));
}
