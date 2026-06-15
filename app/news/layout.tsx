import { notFound } from "next/navigation";

import { FEATURES } from "@/config/features";

/**
 * Gates the entire `/news` route tree behind the `news` feature flag.
 * When disabled, every news route (list, articles, manage, editor) returns 404.
 * Code and data stay intact — re-enable via `config/features.ts`.
 */
export default function NewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!FEATURES.news.enabled) {
    notFound();
  }

  return <>{children}</>;
}
