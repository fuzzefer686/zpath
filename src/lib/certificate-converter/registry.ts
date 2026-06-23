import { listPublishedConfigSchools } from "@/src/lib/admission-config/store";

import { AofConverterAdapter } from "./adapters/aof";
import { FtuConverterAdapter } from "./adapters/ftu";
import { GenericConfigConverterAdapter } from "./adapters/generic";
import { HustConverterAdapter } from "./adapters/hust";
import type { ConverterSchoolSummary, SchoolConverterAdapter } from "./types";

const STATIC_SCHOOLS: ConverterSchoolSummary[] = [
  {
    schoolCode: "AOF",
    schoolName: "Học viện Tài chính",
    source: "static",
  },
  {
    schoolCode: "HUST",
    schoolName: "Đại học Bách khoa Hà Nội",
    source: "static",
  },
  {
    schoolCode: "FTU",
    schoolName: "Đại học Ngoại Thương",
    source: "static",
  },
];

export function createDefaultConverterAdapters(): SchoolConverterAdapter[] {
  return [
    new AofConverterAdapter(),
    new HustConverterAdapter(),
    new FtuConverterAdapter(),
    new GenericConfigConverterAdapter(),
  ];
}

export async function listConverterSchools(): Promise<ConverterSchoolSummary[]> {
  const merged = [...STATIC_SCHOOLS];
  const existing = new Set(merged.map((item) => item.schoolCode));

  const publishedSchools = await listPublishedConfigSchools();
  for (const school of publishedSchools) {
    if (existing.has(school.schoolCode)) continue;
    merged.push({
      schoolCode: school.schoolCode,
      schoolName: school.schoolName,
      source: "config",
    });
    existing.add(school.schoolCode);
  }

  return merged.sort((left, right) => left.schoolCode.localeCompare(right.schoolCode));
}
