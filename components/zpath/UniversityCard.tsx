import Link from "next/link";
import { Building2, MapPin } from "lucide-react";

import type { University } from "@/data/universities";
import { cityToRegion } from "@/lib/vn-regions";

interface UniversityCardProps {
  uni: University;
}

export function UniversityCard({ uni }: UniversityCardProps) {
  const cardImageUrl = uni.unimapImageUrl ?? uni.heroImageUrl;
  const hasCardImage = Boolean(cardImageUrl);
  const shouldContainCardImage = Boolean(uni.unimapImageUrl);
  const region = cityToRegion(uni.city);
  const locationLabel = uni.city || region || "";

  return (
    <Link
      href={`/unimap/${uni.code.toLowerCase()}`}
      prefetch={false}
      className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-border bg-card shadow-md transition-all hover:-translate-y-1 hover:border-primary hover:shadow-xl"
    >
      <div className={`relative h-40 bg-gradient-to-br ${uni.heroGradient}`}>
        {hasCardImage ? (
          <div
            className={`absolute inset-0 bg-center bg-no-repeat transition-transform duration-500 group-hover:scale-105 ${
              shouldContainCardImage ? "bg-white" : ""
            }`}
            style={{
              backgroundImage: `url(${cardImageUrl})`,
              backgroundPosition: "center center",
              backgroundSize: shouldContainCardImage ? "32% auto" : "cover",
            }}
          />
        ) : null}
        <div
          className={
            shouldContainCardImage
              ? "absolute inset-0 bg-gradient-to-r from-black/55 via-black/10 to-transparent"
              : "absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/5"
          }
        />
        {shouldContainCardImage ? null : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.22),transparent_60%)]" />
        )}
        <div className="absolute left-4 top-4 font-display text-3xl font-extrabold leading-tight text-white drop-shadow-md">
          {uni.code}
        </div>
        {locationLabel ? (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md bg-black/40 px-2 py-1 text-xs font-bold text-white backdrop-blur-sm">
            <MapPin className="h-3.5 w-3.5" />
            {locationLabel}
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 py-3.5">
        <h3 className="line-clamp-2 font-display text-base font-bold leading-snug text-foreground">
          {uni.name}
        </h3>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {uni.type ? (
            <span className="inline-flex items-center gap-1 font-medium">
              <Building2 className="h-3.5 w-3.5" />
              {uni.type}
            </span>
          ) : null}
          {region ? (
            <span className="inline-flex items-center gap-1 font-medium">
              <MapPin className="h-3.5 w-3.5" />
              {region}
            </span>
          ) : null}
        </div>

        {uni.tags.length ? (
          <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
            {uni.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
