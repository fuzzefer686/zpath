"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, BarChart3, X } from "lucide-react";

import { isGlobalAdAllowed } from "@/config/ads";

/** Session key so a dismissed popup stays closed until the tab is reopened. */
const DISMISS_KEY = "zpath-score2026-popup-dismissed";

/** Where the CTA sends the user. */
const ARTICLE_HREF = "/du-doan-2026";

/**
 * "Điểm chuẩn 2026" promo popup — modelled on {@link HeroPopupAd} but its own
 * element: it points at the /du-doan-2026 article, not an ad, and tracks its
 * own dismissal key so closing it is independent from the ad popup.
 *
 * Mounted site-wide (see RootLayout). Pinned under the navbar and OFFSET lower
 * than HeroPopupAd (top-[150px]) so, when both show, they stack instead of
 * overlapping. Self-excludes on auth/admin/low-content routes via
 * isGlobalAdAllowed to match the ad popup's placement policy.
 */
export function Score2026Popup() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  const allowed = isGlobalAdAllowed(pathname);
  // Never show the popup on the article page it links to.
  const onArticle = pathname === ARTICLE_HREF;

  useEffect(() => {
    // sessionStorage is client-only, so visibility must be decided after mount
    // (keeps SSR markup stable and avoids a hydration mismatch).
    if (!allowed || onArticle) return;
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing UI to an external store (sessionStorage), the sanctioned use of an effect
    setVisible(true);
  }, [allowed, onArticle]);

  if (!visible || !allowed || onArticle) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  return (
    // Offset below HeroPopupAd (top-[72px]) so the two stack rather than overlap.
    // z-40 keeps it under the navbar (z-50). pointer-events-none lets clicks
    // fall through the empty gutter around the card.
    <div className="pointer-events-none fixed inset-x-0 top-[150px] z-40 flex justify-center px-4">
      <div className="pointer-events-auto relative w-full max-w-md animate-fade-up">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Đóng thông báo điểm chuẩn 2026"
          className="absolute -right-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-md transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <Link
          href={ARTICLE_HREF}
          onClick={dismiss}
          className="group block overflow-hidden rounded-[1.25rem] border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-accent/10 p-4 shadow-xl backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/50"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <BarChart3 className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-bold leading-tight">Điểm chuẩn 2026</h2>
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-black uppercase text-primary-foreground">
                  Mới
                </span>
              </div>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                Xem dự đoán HUST, FTU, NEU
              </p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      </div>
    </div>
  );
}
