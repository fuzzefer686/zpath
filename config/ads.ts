/**
 * Centralized Google AdSense configuration.
 *
 * Safe to import from both server and client components: plain constants only,
 * no secrets (the publisher id is public by design — it ships in the page HTML).
 *
 * HOW TO FILL IN THE SLOTS:
 *   1. Go to https://www.google.com/adsense → Ads → By ad unit → Display ads.
 *   2. Create one ad unit per slot below, copy its `data-ad-slot` number.
 *   3. Replace the empty string for that slot here. An empty slot renders nothing,
 *      so it is safe to deploy before the units exist.
 */

/** AdSense publisher id (`ca-pub-...`). Override via NEXT_PUBLIC_ADSENSE_CLIENT. */
export const ADSENSE_CLIENT =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "ca-pub-7783540122858073";

/** Master switch — flip to false to hide every ad unit at once. */
export const ADS_ENABLED = true;

/**
 * Ad slot ids per placement. Fill these in from the AdSense dashboard.
 * Leave as "" to keep the placement disabled (renders nothing).
 */
export const AD_SLOTS = {
  /** Dismissible popup overlaying the bottom of the homepage hero. */
  heroPopup: "",
  /** Vertical skyscraper pinned to the LEFT margin on very wide screens. */
  railLeft: "",
  /** Vertical skyscraper pinned to the RIGHT margin on very wide screens. */
  railRight: "",
  /** In-content banner between homepage sections (shown on narrow screens). */
  homeInline1: "",
  /** Second in-content banner further down the homepage. */
  homeInline2: "",
  /** Shown on (almost) every page, just above the footer. */
  globalFooter: "",
  /** UniMap list page, between the hero and the results grid. */
  unimapList: "",
  /** UniMap school detail page, in-content. */
  unimapDetail: "",
} as const;

export type AdSlotKey = keyof typeof AD_SLOTS;

/**
 * Self-served / affiliate banners — your own links (e.g. https://rutgon.me/...),
 * NOT Google AdSense. Unlike AdSense these render everywhere, including
 * localhost, and you control the creative entirely.
 *
 * Each placement can list one or more banners; if more than one is given they
 * rotate per page view. Leave a placement as [] to disable it.
 *
 * Fields:
 *   - href:  the destination link (your rutgon.me / affiliate URL).
 *   - image: optional banner image URL. If omitted, a text/CTA banner shows.
 *   - title / subtitle: text used when there is no image (the CTA banner).
 *   - alt:   accessibility text for the image.
 *   - sponsored: keep true for affiliate/paid links (adds rel="sponsored").
 */
export type CustomAd = {
  href: string;
  image?: string;
  title?: string;
  subtitle?: string;
  alt?: string;
  sponsored?: boolean;
};



export const CUSTOM_ADS: Record<AdSlotKey, CustomAd[]> = {
  // Hero popup — demo with your link so you can see the overlay on the homepage.
  heroPopup: [
    {
      href: "https://rutgon.me/moGqPL",
      title: "Ưu đãi đặc biệt dành cho bạn",
      subtitle: "Bấm để xem chi tiết",
      sponsored: true,
    },
  ],
  // Side rails — only visible on very wide screens (≥ ~1660px).
  railLeft: [
    {
      href: "https://rutgon.me/moGqPL",
      title: "Quảng cáo",
      subtitle: "Liên hệ đặt chỗ",
      sponsored: true,
    },
  ],
  railRight: [
    {
      href: "https://rutgon.me/moGqPL",
      title: "Quảng cáo",
      subtitle: "Liên hệ đặt chỗ",
      sponsored: true,
    },
  ],
  // In-content banners between homepage sections — these are how mobile users
  // (where the side rails are hidden) see ads. Demo with your link.
  homeInline1: [
    {
      href: "https://rutgon.me/moGqPL",
      title: "Ưu đãi đặc biệt dành cho bạn",
      subtitle: "Bấm để xem chi tiết",
      sponsored: true,
    },
  ],
  homeInline2: [
    {
      href: "https://rutgon.me/moGqPL",
      title: "Đăng ký tư vấn miễn phí",
      subtitle: "Bấm để xem chi tiết",
      sponsored: true,
    },
  ],
  globalFooter: [],
  unimapList: [],
  unimapDetail: [],
};



/**
 * Routes where the GLOBAL ad must NOT render — auth flows, processing screens,
 * the admin area and other low-content pages that would violate AdSense policy.
 */
export const GLOBAL_AD_EXCLUDED_PREFIXES = [
  "/login",
  "/processing",
  "/admin",
  "/survey",
  "/chat",
] as const;

export const isGlobalAdAllowed = (pathname: string) =>
  !GLOBAL_AD_EXCLUDED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
