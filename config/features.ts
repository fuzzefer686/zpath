/**
 * Centralized feature flags.
 *
 * Toggle features here instead of deleting code/data. Flipping a flag back to
 * `true` must be enough to fully restore a feature (routes + navigation).
 *
 * Safe to import from both server and client components: this module holds
 * plain constants only (no secrets, no server-only imports).
 */
export type FeatureFlags = {
  /** Public news/blog section (`/news` and its sub-routes). */
  news: {
    enabled: boolean;
  };
  /** Mentor consultation chat (`/mentor`). */
  mentor: {
    enabled: boolean;
  };
  /** CV Builder — profile page, PDF export, AI tools. */
  cvBuilder: {
    enabled: boolean;
    /** External CV API adapter. Keep false until DPA + cross-border consent done (§13). */
    externalRenderer: boolean;
  };
};

export const FEATURES: FeatureFlags = {
  news: {
    // Temporarily hidden while the /mentor consultation feature ships.
    // Code and data are kept intact; flip to `true` to restore.
    enabled: false,
  },
  mentor: {
    enabled: true,
  },
  cvBuilder: {
    enabled: true,
    externalRenderer: false, // MUST stay false — §13.7 DPA gate not yet cleared
  },
};
