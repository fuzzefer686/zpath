import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Tier } from "@/types/zpath";

interface TierBadgeProps {
  tier: Tier;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const config = {
  LOW: {
    label: "LOW",
    sub: "Tỉ lệ thấp",
    icon: TrendingDown,
    classes: "bg-tier-low text-tier-low-foreground",
    soft: "bg-tier-low-soft text-tier-low",
  },
  MID: {
    label: "MID",
    sub: "Trung bình",
    icon: Minus,
    classes: "bg-tier-mid text-tier-mid-foreground",
    soft: "bg-tier-mid-soft text-tier-mid",
  },
  HIGH: {
    label: "HIGH",
    sub: "Tỉ lệ cao",
    icon: TrendingUp,
    classes: "bg-tier-high text-tier-high-foreground",
    soft: "bg-tier-high-soft text-tier-high",
  },
} as const;

export function TierBadge({ tier, size = "md", className }: TierBadgeProps) {
  const c = config[tier];
  const Icon = c.icon;
  const sizeClass =
    size === "sm"
      ? "gap-1 px-2.5 py-1 text-xs"
      : size === "lg"
        ? "gap-2 px-5 py-2.5 text-base"
        : "gap-1.5 px-3.5 py-1.5 text-sm";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-bold tracking-wide",
        c.classes,
        sizeClass,
        className,
      )}
    >
      <Icon className={cn(size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4")} />
      {c.label}
    </span>
  );
}

export function TierCard({ tier, percent }: { tier: Tier; percent: string }) {
  const c = config[tier];
  const Icon = c.icon;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 border-current/10 p-6 transition-all hover:-translate-y-1 hover:shadow-glow",
        c.soft,
      )}
    >
      <div className={cn("inline-flex h-12 w-12 items-center justify-center rounded-xl", c.classes)}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="mt-4 font-display text-3xl font-bold">{c.label}</div>
      <div className="mt-1 text-sm font-medium opacity-80">{c.sub}</div>
      <div className="mt-4 text-sm text-foreground/70">Tỉ lệ đỗ ước tính</div>
      <div className="mt-1 font-display text-4xl font-bold">{percent}</div>
    </div>
  );
}

export const tierConfig = config;
