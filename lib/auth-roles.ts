export type UserRole = "admin" | "user";

const DEFAULT_ADMIN_EMAILS = ["fuzzefer.real0@gmail.com"];

export function normalizeUserRole(value: unknown): UserRole | null {
  return value === "admin" || value === "user" ? value : null;
}

export function isAdminRole(role: UserRole | null | undefined) {
  return role === "admin";
}

export function getConfiguredAdminEmails() {
  const envEmails = process.env.ADMIN_EMAILS?.split(",") ?? [];
  return [...DEFAULT_ADMIN_EMAILS, ...envEmails]
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function getBootstrapRoleForEmail(email: string | null | undefined): UserRole {
  if (!email) return "user";
  return getConfiguredAdminEmails().includes(email.toLowerCase()) ? "admin" : "user";
}
