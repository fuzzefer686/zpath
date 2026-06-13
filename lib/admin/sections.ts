import type { LucideIcon } from "lucide-react";
import { Calculator, LayoutDashboard } from "lucide-react";

export type AdminSectionStatus = "available" | "coming_soon";

export type AdminSection = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  status: AdminSectionStatus;
};

/**
 * Central registry of admin tools. Add new entries here when shipping
 * additional /admin/* pages — the hub and sidebar read from this list.
 */
export const ADMIN_SECTIONS: AdminSection[] = [
  {
    id: "hub",
    title: "Tổng quan",
    description: "Danh sách công cụ quản trị và hướng dẫn nhanh.",
    href: "/admin",
    icon: LayoutDashboard,
    status: "available",
  },
  {
    id: "admission",
    title: "Tính điểm tuyển sinh",
    description:
      "Tải PDF đề án, trích xuất cấu hình bằng AI, chỉnh sửa và publish trang tính điểm theo trường.",
    href: "/admin/admission",
    icon: Calculator,
    status: "available",
  },
];

export function getAdminSectionByHref(pathname: string): AdminSection | undefined {
  const normalized = pathname.replace(/\/$/, "") || "/admin";
  return ADMIN_SECTIONS.find(
    (section) =>
      section.href === normalized ||
      (section.href !== "/admin" && normalized.startsWith(`${section.href}/`)),
  );
}

export const ADMIN_TOOL_SECTIONS = ADMIN_SECTIONS.filter(
  (section) => section.id !== "hub",
);
