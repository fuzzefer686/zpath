"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, User, LayoutDashboard } from "lucide-react";
import { Logo } from "./Logo";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/app/lib/supabase";

const links = [
  { href: "/", label: "Trang chủ" },
  { href: "/unimap", label: "UniMap" },
  { href: "/majorly", label: "Majorly" },
  { href: "/landing", label: "Tính tỉ lệ đỗ" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { googleUser: user, isLoading } = useUserProfile({ requireAuth: false });
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" aria-label="ZPATH home">
          <Logo size="sm" />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link 
              key={l.href} 
              href={l.href} 
              className={`text-sm font-medium transition-colors hover:text-primary ${pathname === l.href ? "text-primary font-bold" : "text-foreground/70"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {!isLoading && user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard"><LayoutDashboard className="h-4 w-4 mr-1" /> Dashboard</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-1" /> Đăng xuất
              </Button>
            </>
          ) : !isLoading ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Đăng nhập</Link>
              </Button>
              <Button asChild variant="hero" size="sm">
                <Link href="/landing">Dùng thử ngay</Link>
              </Button>
            </>
          ) : (
            <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
          )}
        </div>
        <button
          className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-foreground/10 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="container-page flex flex-col gap-2 py-4">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted ${pathname === l.href ? "text-primary bg-primary/5 font-bold" : ""}`}
              >
                {l.label}
              </Link>
            ))}
            {!isLoading && user ? (
              <>
                <Link href="/dashboard" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted">
                  <LayoutDashboard className="h-4 w-4 inline-block mr-2" /> Dashboard
                </Link>
                <Button variant="outline" className="mt-2 w-full" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" /> Đăng xuất
                </Button>
              </>
            ) : !isLoading ? (
              <>
                <Link href="/login" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted">
                  Đăng nhập / Đăng ký
                </Link>
                <Button asChild variant="hero" className="mt-2 w-full">
                  <Link href="/landing" onClick={() => setOpen(false)}>Dùng thử ngay</Link>
                </Button>
              </>
            ) : null}
          </div>
        </div>
      )}
    </header>
  );
}
