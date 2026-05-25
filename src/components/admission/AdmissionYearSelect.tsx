"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type AdmissionYearSelectProps = {
  selectedYear: number;
  years: readonly number[];
};

export function AdmissionYearSelect({ selectedYear, years }: AdmissionYearSelectProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
      <span>Năm</span>
      <select
        value={selectedYear}
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("year", event.target.value);
          router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        }}
        className="h-10 rounded-md border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </label>
  );
}
