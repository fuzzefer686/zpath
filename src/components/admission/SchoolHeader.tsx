import { ExternalLink, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { School } from "@/src/types/admission-data";

type SchoolHeaderProps = {
  school: School;
};

export function SchoolHeader({ school }: SchoolHeaderProps) {
  const hasHeroImage = Boolean(school.hero_image_url);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10 py-12 md:py-16">
      {hasHeroImage ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${school.hero_image_url})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/20" />
        </>
      ) : null}
      <div className="container-page relative">
        <div className="max-w-4xl">
          <div className={`mb-4 inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${
            hasHeroImage
              ? "border-white/30 bg-white/15 text-white backdrop-blur-sm"
              : "border-primary/20 bg-primary/10 text-primary"
          }`}>
            {school.code}
          </div>
          <h1 className={`font-display text-4xl font-extrabold leading-tight md:text-5xl ${
            hasHeroImage ? "text-white drop-shadow-md" : ""
          }`}>
            {school.name}
          </h1>
          {school.english_name ? (
            <p className={`mt-2 text-lg ${hasHeroImage ? "text-white/85" : "text-muted-foreground"}`}>
              {school.english_name}
            </p>
          ) : null}
          <div className={`mt-5 flex flex-wrap items-center gap-3 text-sm ${
            hasHeroImage ? "text-white/85" : "text-muted-foreground"
          }`}>
            {school.type ? <span>{school.type}</span> : null}
            {school.city ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {school.city}
              </span>
            ) : null}
          </div>
          {school.website ? (
            <Button
              asChild
              variant="outline"
              className={`mt-6 ${
                hasHeroImage
                  ? "border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                  : ""
              }`}
            >
              <a href={school.website} target="_blank" rel="noreferrer">
                Website trường <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
