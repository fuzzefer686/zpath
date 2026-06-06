import Link from "next/link";

import { cn } from "@/lib/utils";

export type ScoringSchoolCode = "HUST" | "FTU" | "NEU";

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
      className="rounded-lg border border-border bg-card p-2 shadow-sm"
    >
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => {
          const isSelected = option.code === selectedSchoolCode;

          return (
            <Link
              key={option.code}
              href={`/scoring?school=${option.code}`}
              aria-current={isSelected ? "page" : undefined}
              aria-label={`Chọn ${option.name}`}
              title={option.name}
              className={cn(
                "group flex min-h-16 items-center justify-center gap-2.5 rounded-md border bg-background px-3 py-2 transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] sm:min-h-20 sm:gap-3 sm:px-5",
                isSelected
                  ? cn(
                      "shadow-md ring-4",
                      option.accentBorderClassName,
                      option.accentRingClassName,
                      option.accentSoftClassName,
                    )
                  : "border-transparent hover:border-border",
              )}
            >
              <img
                src={option.avatarUrl ?? createAvatarDataUri(option)}
                alt={option.name}
                className="h-10 w-10 shrink-0 rounded-full bg-white object-contain p-1 shadow-sm sm:h-12 sm:w-12"
              />
              <span
                className={cn(
                  "text-base font-black tracking-tight sm:text-xl",
                  isSelected ? option.accentTextClassName : "text-foreground",
                )}
              >
                {option.shortName}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
