import Link from "next/link";
import { redirect } from "next/navigation";

import { getMentorContext } from "@/lib/auth/requireMentor";

export const dynamic = "force-dynamic";

const navItems = [
  { href: "/mentor/dashboard", label: "Tổng quan" },
  { href: "/mentor/dashboard/settings", label: "Cài đặt" },
];

export default async function MentorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const mentor = await getMentorContext();
  // Not logged in or not an active mentor -> bounce to home.
  if (!mentor) redirect("/");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <span className="text-sm font-black tracking-tight">ZPath Mentor</span>
            <nav className="hidden items-center gap-4 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-foreground/70 transition-colors hover:text-primary"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold leading-tight">{mentor.profile.displayName}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {mentor.profile.role}
            </p>
          </div>
        </div>
      </header>
      <main className="container-page py-8">{children}</main>
    </div>
  );
}
