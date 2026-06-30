"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import { AD_SLOTS, ADS_ENABLED, CUSTOM_ADS, isGlobalAdAllowed } from "@/config/ads";
import { Ad } from "./Ad";

/** Session key so a dismissed popup stays closed until the tab is reopened. */
const DISMISS_KEY = "zpath-hero-ad-dismissed";

/**
 * Dismissible promo popup pinned just under the navbar. It stays in place
 * while scrolling (position: fixed), floats above the page content (does not
 * push layout) and is hidden once the user closes it. Mounted site-wide (see
 * RootLayout) so the promo reaches every tab; one dismissal silences it across
 * the whole session, and low-content/auth routes are excluded via
 * isGlobalAdAllowed to stay within AdSense policy.
 */
export function HeroPopupAd() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  const allowed = isGlobalAdAllowed(pathname);
  const hasAd =
    ADS_ENABLED && (Boolean(CUSTOM_ADS.heroPopup?.length) || Boolean(AD_SLOTS.heroPopup));

  useEffect(() => {
    // sessionStorage is client-only, so visibility must be decided after mount
    // (keeps SSR markup stable and avoids a hydration mismatch).
    if (!hasAd || !allowed) return;
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing UI to an external store (sessionStorage), the sanctioned use of an effect
    setVisible(true);
  }, [hasAd, allowed]);

  if (!visible || !allowed) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  return (
    // Fixed under the sticky navbar (h-16). z-40 keeps it below the navbar
    // (z-50). pointer-events-none lets clicks fall through the empty area.
    <div className="pointer-events-none fixed inset-x-0 top-[72px] z-40 flex justify-center px-4">
      <div className="pointer-events-auto relative w-full max-w-2xl animate-fade-up">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Đóng quảng cáo"
          className="absolute -right-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-md transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <Ad placement="heroPopup" className="shadow-xl" />
      </div>
    </div>
  );
}
