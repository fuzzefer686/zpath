"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

type MetaPixelProps = {
  pixelId?: string;
};

export function MetaPixelPageViewTracker({ pixelId }: MetaPixelProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const currentUrl = search ? `${pathname}?${search}` : pathname;
  const lastTrackedUrl = useRef(currentUrl);

  useEffect(() => {
    if (!pixelId || lastTrackedUrl.current === currentUrl) {
      return;
    }

    lastTrackedUrl.current = currentUrl;
    window.fbq?.("track", "PageView");
  }, [currentUrl, pixelId]);

  if (!pixelId) {
    return null;
  }

  return null;
}
