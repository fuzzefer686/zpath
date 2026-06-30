"use client";

import { usePathname } from "next/navigation";

import { isGlobalAdAllowed } from "@/config/ads";
import { Ad } from "./Ad";

/**
 * Vertical skyscraper ads pinned to the left and right margins.
 *
 * The page content is capped at 80rem (1280px) and centred, so a 160px rail
 * only fits without overlapping once the viewport is ≥ ~1660px. Below that the
 * rails are hidden (`min-[1660px]:block`) — expected on laptops/phones. The
 * rails are fixed and vertically centred, so they stay in view while scrolling.
 */
export function SideRailAds() {
  const pathname = usePathname();
  if (!isGlobalAdAllowed(pathname)) return null;

  return (
    <>
      <div className="fixed left-4 top-1/2 z-30 hidden w-40 -translate-y-1/2 min-[1660px]:block">
        <Ad placement="railLeft" orientation="vertical" className="h-[600px]" />
      </div>
      <div className="fixed right-4 top-1/2 z-30 hidden w-40 -translate-y-1/2 min-[1660px]:block">
        <Ad placement="railRight" orientation="vertical" className="h-[600px]" />
      </div>
    </>
  );
}
