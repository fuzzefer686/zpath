"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2, Shield } from "lucide-react";

import { useUserRole } from "@/hooks/useUserRole";
import { ADMIN_SECTIONS } from "@/lib/admin/sections";
import { cn } from "@/lib/utils";

type AdminShellProps = {
  children: React.ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const { isAdmin, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Đang kiểm tra quyền truy cập...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container-page py-8">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm font-medium text-destructive">
          Bạn cần quyền quản trị viên để truy cập khu vực này.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border bg-card/60">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                ZPATH Admin
              </p>
              <h1 className="text-lg font-black tracking-tight">Bảng điều khiển</h1>
            </div>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            ← Về trang chính
          </Link>
        </div>
      </div>

      <div className="container-page py-6 md:py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <aside className="lg:w-64 lg:shrink-0">
            <nav
              aria-label="Menu quản trị"
              className="rounded-xl border border-border bg-card p-2 shadow-sm"
            >
              <ul className="space-y-1">
                {ADMIN_SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const isActive =
                    section.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(section.href);
                  const isDisabled = section.status === "coming_soon";

                  return (
                    <li key={section.id}>
                      {isDisabled ? (
                        <span
                          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-muted-foreground opacity-60"
                          title="Sắp ra mắt"
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="font-semibold">{section.title}</span>
                          <span className="ml-auto text-[10px] font-bold uppercase">
                            Soon
                          </span>
                        </span>
                      ) : (
                        <Link
                          href={section.href}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-foreground/80 hover:bg-muted hover:text-foreground",
                          )}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {section.title}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
