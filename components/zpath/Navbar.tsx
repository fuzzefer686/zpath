"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, X, User, LogOut, Shield, Settings, ChevronDown, Sparkles } from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "@/components/zpath/AuthProvider";
import { FEATURES } from "@/config/features";

const links = [
  { href: "/", label: "Trang chủ" },
  { href: "/unimap", label: "UniMap" },
  { href: "/scoring", label: "Tính điểm" },
  // Hidden while the news feature is gated off (config/features.ts).
  ...(FEATURES.news.enabled ? [{ href: "/news", label: "News" }] : []),
  ...(FEATURES.mentor.enabled ? [{ href: "/mentor", label: "Tư vấn" }] : []),
  { href: "/advisor", label: "Zpath AI" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { user, logout, openAuthPrompt } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");

  const isActive = (href: string) =>
    href === "/" ? pathname === href : pathname.startsWith(href);

  // Sync real-time profile avatar and display name when logged in
  useEffect(() => {
    if (user) {
      setDisplayName(user.username);
      fetch("/api/profile")
        .then((res) => {
          if (res.ok) return res.json();
        })
        .then((data) => {
          if (data) {
            if (data.avatar_url) setAvatarUrl(data.avatar_url);
            if (data.display_name) setDisplayName(data.display_name);
          }
        })
        .catch((err) => console.log("Failed to load nav avatar:", err));
    } else {
      setAvatarUrl(null);
      setDisplayName("");
    }
  }, [user, pathname]); // Re-sync when pathname changes as well

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    setOpen(false);
    await logout();
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
              className={`text-sm font-medium transition-colors hover:text-primary ${isActive(l.href) ? "text-primary font-bold animate-pulse" : "text-foreground/70"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Authentication Section */}
        <div className="hidden items-center gap-4 md:flex">
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-white/20 bg-white/50 p-1 pr-3 text-sm font-semibold shadow-sm transition hover:bg-white/80 hover:shadow"
              >
                <div className="h-8 w-8 overflow-hidden rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center font-bold">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </div>
                <span className="max-w-[120px] truncate text-xs">{displayName}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground transition duration-200" />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 origin-top-right rounded-2xl border border-white/20 bg-white/90 p-1.5 shadow-xl shadow-purple-500/5 backdrop-blur-xl animate-fade-up">
                  <div className="border-b border-muted/50 px-3 py-2 text-left">
                    <p className="text-xs font-bold text-foreground truncate">{displayName}</p>
                    <p className="text-[10px] text-muted-foreground truncate">@{user.username}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-foreground/80 hover:bg-primary/5 hover:text-primary transition"
                    >
                      <User className="h-4 w-4 text-primary" />
                      Trang cá nhân
                    </Link>
                    <Link
                      href="/advisor"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-foreground/80 hover:bg-primary/5 hover:text-primary transition"
                    >
                      <Sparkles className="h-4 w-4 text-primary" />
                      Zpath AI
                    </Link>
                    {user.role === "admin" && (
                      <span className="flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-bold text-purple-600 bg-purple-50">
                        <Shield className="h-3.5 w-3.5" /> Quản trị viên
                      </span>
                    )}
                  </div>
                  <div className="border-t border-muted/50 pt-1.5 pb-1">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/5 transition"
                    >
                      <LogOut className="h-4 w-4 text-destructive" />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={openAuthPrompt}
                className="text-sm font-semibold text-foreground/80 hover:text-primary transition"
              >
                Đăng nhập
              </button>
              <Button asChild variant="hero" size="sm">
                <Link href="/advisor">Zpath AI</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-foreground/10 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
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

            {user ? (
              <div className="border-t border-border mt-2 pt-4 space-y-2">
                <div className="flex items-center gap-3 px-3 py-1.5">
                  <div className="h-10 w-10 overflow-hidden rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center font-bold">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                  </div>
                </div>

                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted text-foreground/80"
                >
                  <User className="h-4 w-4 text-primary" />
                  Trang cá nhân
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium text-destructive hover:bg-destructive/5"
                >
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </button>
              </div>
            ) : (
              <div className="border-t border-border mt-2 pt-4 flex flex-col gap-2">
                <button
                  onClick={() => {
                    setOpen(false);
                    openAuthPrompt();
                  }}
                  className="h-11 rounded-xl border-2 border-foreground/15 text-sm font-bold text-foreground hover:bg-muted transition"
                >
                  Đăng nhập
                </button>
                <Button asChild variant="hero" className="w-full">
                  <Link href="/advisor" onClick={() => setOpen(false)}>Zpath AI</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
