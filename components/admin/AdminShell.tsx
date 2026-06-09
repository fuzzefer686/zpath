import Link from "next/link";
import { FileText, LayoutDashboard, Users, UserSquare2 } from "lucide-react";

const adminLinks = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/news", label: "News", icon: FileText },
  { href: "/admin/profiles", label: "Profiles", icon: UserSquare2 },
  { href: "/admin/users", label: "Users", icon: Users },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container-page grid gap-6 py-8 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-lg border bg-card p-3 lg:sticky lg:top-24 lg:self-start">
          <div className="px-3 py-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Admin
            </p>
            <h1 className="mt-1 text-lg font-black">ZPATH Control</h1>
          </div>
          <nav className="mt-3 space-y-1">
            {adminLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-foreground/75 hover:bg-primary/5 hover:text-primary"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
