"use client";

import { usePathname } from "next/navigation";

import { isGlobalAdAllowed } from "@/config/ads";
import { Ad } from "./Ad";

/**
 * Site-wide ad shown just above the footer on content pages. Hidden on auth,
 * processing and admin routes (see GLOBAL_AD_EXCLUDED_PREFIXES) to stay within
 * AdSense policy on low-content screens.
 */
export function GlobalAd() {
  const pathname = usePathname();
  if (!isGlobalAdAllowed(pathname)) return null;

  return (
    <div className="container-page py-6">
      <Ad placement="globalFooter" className="mx-auto max-w-3xl" />
    </div>
  );
}
