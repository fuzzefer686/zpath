"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";

const links = [
  { href: "/", label: "Trang chủ" },
  { href: "/unimap", label: "UniMap" },
  { href: "/survey", label: "Tư vấn ngành" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === href : pathname.startsWith(href);

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
              className={`text-sm font-medium transition-colors hover:text-primary ${isActive(l.href) ? "text-primary font-bold" : "text-foreground/70"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="hero" size="sm">
            <Link href="/survey">Dùng thử ngay</Link>
          </Button>
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
                className={`rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted ${isActive(l.href) ? "text-primary bg-primary/5 font-bold" : ""}`}
              >
                {l.label}
              </Link>
            ))}
            <Button asChild variant="hero" className="mt-2 w-full">
              <Link href="/survey" onClick={() => setOpen(false)}>Dùng thử ngay</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
