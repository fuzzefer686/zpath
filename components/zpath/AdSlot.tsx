"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { ADS_ENABLED, ADSENSE_CLIENT, AD_SLOTS, type AdSlotKey } from "@/config/ads";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdSlotProps = {
  /** Which configured placement this is (resolves the slot id from config/ads). */
  placement: AdSlotKey;
  /** AdSense ad format: "auto" (responsive), "fluid", "rectangle", ... */
  format?: string;
  /** Whether the unit may grow to the full container width on small screens. */
  fullWidthResponsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * A single Google AdSense display unit.
 *
 * Renders nothing when ads are disabled or the slot id has not been filled in
 * yet, so it is safe to place before the AdSense units exist. The unit is
 * re-initialised on every client-side navigation (App Router is an SPA, so the
 * <ins> would otherwise stay blank after the first push).
 */
export function AdSlot({
  placement,
  format = "auto",
  fullWidthResponsive = true,
  className,
  style,
}: AdSlotProps) {
  const pathname = usePathname();
  const slot = AD_SLOTS[placement];

  useEffect(() => {
    if (!ADS_ENABLED || !slot) return;
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch {
      // AdSense script not ready yet — ignore; it retries on next navigation.
    }
  }, [pathname, slot]);

  if (!ADS_ENABLED || !slot) return null;

  return (
    <ins
      // Force a fresh element per route so AdSense fills it again after SPA nav.
      key={`${placement}-${pathname}`}
      className={`adsbygoogle block ${className ?? ""}`}
      style={{ display: "block", ...style }}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={fullWidthResponsive ? "true" : "false"}
    />
  );
}
