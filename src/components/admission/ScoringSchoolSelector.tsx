import Link from "next/link";
import Image from "next/image";

import { cn } from "@/lib/utils";

export type ScoringSchoolCode = string;

export type ScoringSchoolOption = {
  code: ScoringSchoolCode;
  shortName: string;
  name: string;
  status: "available" | "coming_soon";
  avatarUrl?: string;
  avatarColor: string;
  accentTextClassName: string;
  accentBorderClassName: string;
  accentRingClassName: string;
  accentSoftClassName: string;
};

type ScoringSchoolSelectorProps = {
  options: ScoringSchoolOption[];
  selectedSchoolCode: ScoringSchoolCode;
};

function createAvatarDataUri(option: ScoringSchoolOption) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <rect width="96" height="96" rx="28" fill="${option.avatarColor}"/>
      <circle cx="72" cy="22" r="9" fill="white" opacity="0.22"/>
      <path d="M18 69c8-13 18-20 30-20s22 7 30 20" fill="none" stroke="white" stroke-width="5" stroke-linecap="round" opacity="0.2"/>
      <text x="48" y="55" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="900" fill="white">${option.shortName}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function ScoringSchoolSelector({
  options,
  selectedSchoolCode,
}: ScoringSchoolSelectorProps) {
  return (
    <nav
      aria-label="Chọn trường tính điểm xét tuyển"
      className="rounded-2xl border border-foreground/10 bg-card/90 p-2 shadow-sm"
    >
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {options.map((option) => {
          const isSelected = option.code === selectedSchoolCode;
          const isComingSoon = option.status === "coming_soon";

          return (
            <Link
              key={option.code}
              href={`/scoring?school=${option.code}`}
              aria-current={isSelected ? "page" : undefined}
              aria-label={`Chọn ${option.name}`}
              title={option.name}
              className={cn(
                "group relative flex min-h-20 items-center gap-3 rounded-xl border bg-background px-3 py-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] sm:px-4",
                isSelected
                  ? cn(
                      "shadow-md ring-4",
                      option.accentBorderClassName,
                      option.accentRingClassName,
                      option.accentSoftClassName,
                    )
                  : "border-transparent hover:border-border",
                isComingSoon && !isSelected ? "opacity-70" : "",
              )}
            >
              <Image
                src={option.avatarUrl ?? createAvatarDataUri(option)}
                alt={option.name}
                width={44}
                height={44}
                unoptimized
                className="h-11 w-11 shrink-0 rounded-full bg-white object-contain p-1 shadow-sm"
              />
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-base font-black tracking-tight",
                    isSelected ? option.accentTextClassName : "text-foreground",
                  )}
                >
                  {option.shortName}
                </span>
                <span className="mt-0.5 block truncate text-xs font-medium text-muted-foreground">
                  {option.name}
                </span>
              </span>
              {isComingSoon ? (
                <span className="absolute right-2 top-2 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                  Sắp có
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
