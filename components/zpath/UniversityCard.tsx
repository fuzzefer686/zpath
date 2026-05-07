import Link from "next/link";
import { Coins } from "lucide-react";

import type { University } from "@/data/universities";

interface UniversityCardProps {
  uni: University;
}

export function UniversityCard({ uni }: UniversityCardProps) {
  return (
    <Link
      href={`/unimap/${uni.code.toLowerCase()}`}
      className="group relative block overflow-hidden rounded-2xl border-2 border-border bg-card shadow-md transition-all hover:-translate-y-1 hover:border-primary hover:shadow-xl"
    >
      <div className={`relative h-44 bg-gradient-to-br ${uni.heroGradient}`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_60%)]" />
        <div className="absolute left-4 top-4 text-white drop-shadow-md">
          <div className="font-display text-3xl font-extrabold leading-tight">{uni.code}</div>
          <div className="mt-1 text-sm font-medium opacity-90">{uni.shortDesc}</div>
        </div>
        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md bg-black/40 px-2 py-1 text-xs font-bold text-white backdrop-blur-sm">
          <Coins className="h-3.5 w-3.5" />
          {uni.city}
        </div>
      </div>

      <div className="space-y-2 px-4 py-3">
        <div className="line-clamp-1 text-xs font-medium text-muted-foreground">{uni.name}</div>
        <div className="space-y-1.5">
          {uni.tags.map((tag, index) => (
            <div key={tag} className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded ${
                  index === 0 ? "bg-primary/15 text-primary" : "bg-secondary/20 text-secondary-foreground"
                }`}
              >
                ◆
              </span>
              {tag}
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}
