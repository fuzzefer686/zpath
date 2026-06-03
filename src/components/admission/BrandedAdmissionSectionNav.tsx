"use client";

import { useMemo } from "react";

import { useActiveAdmissionSection } from "@/hooks/useActiveAdmissionSection";

export type BrandedAdmissionSectionNavItem = {
  href: string;
  label: string;
};

type BrandedAdmissionSectionNavProps = {
  items: BrandedAdmissionSectionNavItem[];
  hoverClass: string;
  activeClass: string;
};

export function BrandedAdmissionSectionNav({
  items,
  hoverClass,
  activeClass,
}: BrandedAdmissionSectionNavProps) {
  const sectionIds = useMemo(() => items.map((item) => item.href.slice(1)), [items]);
  const activeId = useActiveAdmissionSection(sectionIds);

  return (
    <nav
      aria-label="Điều hướng nhanh trong trang"
      className="rounded-2xl border border-slate-200 bg-white/85 p-2 shadow-sm backdrop-blur"
    >
      <div className="flex flex-col gap-1">
        {items.map((item) => {
          const id = item.href.slice(1);
          const isActive = activeId === id;

          return (
            <a
              key={item.href}
              href={item.href}
              aria-current={isActive ? "location" : undefined}
              className={`flex min-h-11 items-center rounded-xl border px-3 py-2 text-sm font-semibold leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950/20 ${
                isActive
                  ? activeClass
                  : `border-transparent text-slate-600 ${hoverClass}`
              }`}
            >
              {item.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
