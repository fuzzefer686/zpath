"use client";

import type { AdSlotKey } from "@/config/ads";
import { Ad } from "./Ad";

/**
 * In-content ad inserted between page sections. Shown on narrow/medium screens
 * (mobile, tablet, laptop) and hidden on very wide screens (≥1660px) where the
 * side rails already run — so users always see at least one of the two.
 */
export function InlineAd({ placement }: { placement: AdSlotKey }) {
  return (
    <div className="container-page py-6 min-[1660px]:hidden">
      <Ad placement={placement} className="mx-auto max-w-3xl" />
    </div>
  );
}
