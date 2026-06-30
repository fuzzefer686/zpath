"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

import { ADS_ENABLED, CUSTOM_ADS, type AdSlotKey } from "@/config/ads";

type CustomAdBannerProps = {
  /** Which placement to pull banners from (config/ads → CUSTOM_ADS). */
  placement: AdSlotKey;
  /** "vertical" => skyscraper layout for side rails; default "horizontal". */
  orientation?: "horizontal" | "vertical";
  className?: string;
};

/**
 * A self-served / affiliate banner (your own link, e.g. rutgon.me) — not
 * AdSense. Renders an image banner when `image` is set, otherwise a styled
 * text CTA. If a placement has several banners, one is picked per page view.
 */
export function CustomAdBanner({
  placement,
  orientation = "horizontal",
  className,
}: CustomAdBannerProps) {
  const pathname = usePathname();
  const banners = CUSTOM_ADS[placement];
  const isVertical = orientation === "vertical";

  // Rotate per navigation: deterministic per pathname so it doesn't flicker
  // within a page, but varies as the user moves around the site.
  const ad = useMemo(() => {
    if (!ADS_ENABLED || !banners || banners.length === 0) return null;
    const seed = pathname.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return banners[seed % banners.length];
  }, [banners, pathname]);

  if (!ad) return null;

  return (
    <a
      href={ad.href}
      target="_blank"
      rel={`noopener noreferrer${ad.sponsored ? " sponsored" : ""}`}
      className={`group relative block overflow-hidden rounded-2xl border-2 border-border bg-card transition-colors hover:border-primary ${className ?? ""}`}
    >
      {/* "Quảng cáo" label — required disclosure for paid/affiliate placements */}
      <span className="absolute right-2 top-2 z-10 rounded-full bg-foreground/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background">
        Quảng cáo
      </span>

      {ad.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ad.image}
          alt={ad.alt ?? ad.title ?? "Quảng cáo"}
          className={`block w-full object-cover ${isVertical ? "h-full" : "h-auto"}`}
          loading="lazy"
        />
      ) : isVertical ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-b from-primary/10 via-background to-secondary/10 px-4 py-6 text-center">
          <p className="font-display text-base font-bold leading-snug text-foreground">
            {ad.title ?? "Xem ưu đãi"}
          </p>
          {ad.subtitle ? (
            <p className="text-sm text-muted-foreground">{ad.subtitle}</p>
          ) : null}
          <span className="mt-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-transform group-hover:scale-105">
            Xem ngay
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 bg-gradient-to-br from-primary/10 via-background to-secondary/10 px-5 py-4">
          <div className="min-w-0">
            <p className="truncate font-display text-base font-bold text-foreground md:text-lg">
              {ad.title ?? "Xem ưu đãi"}
            </p>
            {ad.subtitle ? (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{ad.subtitle}</p>
            ) : null}
          </div>
          <span className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-transform group-hover:scale-105">
            Xem ngay
          </span>
        </div>
      )}
    </a>
  );
}
