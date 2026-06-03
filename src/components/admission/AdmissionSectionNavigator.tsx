"use client";

import {
  BarChart3,
  Calculator,
  Grid3X3,
  Info,
  LayoutDashboard,
  ListChecks,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";

import { useActiveAdmissionSection } from "@/hooks/useActiveAdmissionSection";

export type AdmissionSectionNavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

const DEFAULT_NAV_ITEMS: AdmissionSectionNavItem[] = [
  { href: "#calculator", label: "Công cụ tính điểm", Icon: Calculator },
  { href: "#overview", label: "Tổng quan", Icon: LayoutDashboard },
  { href: "#admission-info", label: "Thông tin tuyển sinh", Icon: Info },
  { href: "#programs", label: "Chương trình tuyển sinh", Icon: ListChecks },
  { href: "#combinations", label: "Tổ hợp xét tuyển", Icon: Grid3X3 },
  { href: "#benchmarks", label: "Điểm chuẩn tham khảo", Icon: BarChart3 },
  { href: "#tuition", label: "Học phí", Icon: WalletCards },
];

export const PRO_MAX_NAV_ITEMS: AdmissionSectionNavItem[] = [
  { href: "#calculator", label: "Công cụ tính điểm", Icon: Calculator },
  { href: "#overview", label: "Tổng quan", Icon: LayoutDashboard },
  { href: "#admission-info", label: "Thông tin tuyển sinh", Icon: Info },
  { href: "#programs", label: "Chương trình tuyển sinh", Icon: ListChecks },
  { href: "#combinations", label: "Tổ hợp xét tuyển", Icon: Grid3X3 },
  { href: "#benchmarks", label: "Điểm chuẩn tham khảo", Icon: BarChart3 },
  { href: "#tuition", label: "Học phí", Icon: WalletCards },
];

type AdmissionSectionNavigatorProps = {
  items?: AdmissionSectionNavItem[];
};

export function AdmissionSectionNavigator({
  items = DEFAULT_NAV_ITEMS,
}: AdmissionSectionNavigatorProps) {
  const sectionIds = useMemo(() => items.map((item) => item.href.slice(1)), [items]);
  const activeId = useActiveAdmissionSection(sectionIds);

  function handleNavigate(id: string) {
    window.dispatchEvent(
      new CustomEvent("admission-section:navigate", {
        detail: { id },
      }),
    );
  }

  return (
    <nav
      aria-label="Điều hướng nội dung tuyển sinh"
      className="sticky top-4 z-30 rounded-lg border border-border bg-card p-2 shadow-sm lg:fixed lg:left-4 lg:top-1/2 lg:-translate-y-1/2 lg:rounded-full lg:p-1"
    >
      <div className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {items.map(({ href, label, Icon }) => {
          const id = href.slice(1);
          const isActive = activeId === id;

          return (
            <a
              key={href}
              href={href}
              title={label}
              aria-current={isActive ? "location" : undefined}
              onClick={() => handleNavigate(id)}
              className={`group relative flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:h-10 lg:w-10 lg:justify-center lg:rounded-full lg:px-0 lg:py-0 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent/10 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="whitespace-nowrap lg:pointer-events-none lg:absolute lg:left-12 lg:rounded-md lg:border lg:border-border lg:bg-popover lg:px-2 lg:py-1 lg:text-xs lg:text-popover-foreground lg:opacity-0 lg:shadow-sm lg:transition-opacity lg:group-hover:opacity-100 lg:group-focus-visible:opacity-100">
                {label}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
