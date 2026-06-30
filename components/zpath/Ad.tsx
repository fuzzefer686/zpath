"use client";

import { CUSTOM_ADS, type AdSlotKey } from "@/config/ads";
import { AdSlot } from "./AdSlot";
import { CustomAdBanner } from "./CustomAdBanner";

type AdProps = {
  placement: AdSlotKey;
  /** "vertical" for side-rail skyscrapers; default "horizontal". */
  orientation?: "horizontal" | "vertical";
  className?: string;
};

/**
 * Unified ad for a placement. Shows your self-served banner (CUSTOM_ADS) when
 * one is configured; otherwise falls back to the Google AdSense unit (AD_SLOTS).
 * Both empty → renders nothing. Drive everything from config/ads.ts.
 */
export function Ad({ placement, orientation = "horizontal", className }: AdProps) {
  if (CUSTOM_ADS[placement]?.length) {
    return (
      <CustomAdBanner placement={placement} orientation={orientation} className={className} />
    );
  }
  return (
    <AdSlot
      placement={placement}
      format={orientation === "vertical" ? "vertical" : "auto"}
      className={className}
    />
  );
}
