"use client";

import { useMemo, useState } from "react";
import { Search, Star } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  HUST_ADMISSION_PROGRAMS_2026,
  HUST_PROGRAM_GROUP_LABELS,
  type HustAdmissionProgram2026,
  type HustAdmissionProgramGroup,
} from "@/src/lib/admission-data/hust-programs-2026";
import type { AdmissionProgram } from "@/src/types/admission-data";
import { AdmissionYearSelect } from "./AdmissionYearSelect";

type AdmissionProgramsSectionProps = {
  schoolCode: string;
  programs: AdmissionProgram[];
  selectedYear: number;
  availableYears: readonly number[];
};

const HUST_GROUP_ORDER: HustAdmissionProgramGroup[] = [
  "standard",
  "english_advanced",
  "foreign_language",
  "pfiev",
  "international_cooperation",
  "international_joint",
];

export function AdmissionProgramsSection({
  schoolCode,
  programs,
  selectedYear,
  availableYears,
}: AdmissionProgramsSectionProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const shouldUseHust2026Table = schoolCode === "HUST" && selectedYear === 2026;
  const filteredHustPrograms = useMemo(() => {
    if (!normalizedQuery) return HUST_ADMISSION_PROGRAMS_2026;

    return HUST_ADMISSION_PROGRAMS_2026.filter((program) =>
      [
        program.order,
        program.code,
        program.name,
        program.quota,
        HUST_PROGRAM_GROUP_LABELS[program.group],
        program.methods.xttn ? "XTTN" : null,
        program.methods.dgtd ? "ĐGTD" : null,
        program.methods.thpt.join(" "),
      ]
        .filter((value) => value !== null && value !== undefined)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [normalizedQuery]);
  const filteredPrograms = useMemo(() => {
    if (!normalizedQuery) return programs;

    return programs.filter((program) =>
      [
        program.program_code,
        program.program_name,
        program.major_code,
        program.major_name,
        program.year,
        program.quota,
        program.degree_level,
        program.training_type,
        program.note,
      ]
        .filter((value) => value !== null && value !== undefined)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [normalizedQuery, programs]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="text-xl">Chương trình tuyển sinh</CardTitle>
        <AdmissionYearSelect
          selectedYear={selectedYear}
          years={availableYears}
          paramName="programYear"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo mã, tên chương trình, tổ hợp..."
            className="pl-9"
          />
        </div>

        {shouldUseHust2026Table ? (
          <HustProgramsTable programs={filteredHustPrograms} />
        ) : programs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Chưa có dữ liệu chương trình cho năm {selectedYear}.
          </p>
        ) : (
          <>
            {filteredPrograms.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Không có chương trình nào khớp với từ khóa.
              </p>
            ) : (
              <div className="max-h-[1004px] overflow-auto">
                <table className="w-full min-w-[720px] table-fixed text-left text-sm">
                  <thead className="sticky top-0 z-10 border-b bg-card text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="h-11 w-24 pr-4">Mã</th>
                      <th className="h-11 w-64 pr-4">Chương trình</th>
                      <th className="h-11 w-56 pr-4">Ngành</th>
                      <th className="h-11 w-20 pr-4">Năm</th>
                      <th className="h-11 w-24 pr-4">Chỉ tiêu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredPrograms.map((program) => (
                      <tr key={program.id} className="h-12">
                        <td className="truncate pr-4 font-semibold">{program.program_code ?? "-"}</td>
                        <td className="truncate pr-4">{program.program_name}</td>
                        <td className="truncate pr-4">
                          {program.major_name ?? program.major_code ?? "-"}
                        </td>
                        <td className="whitespace-nowrap pr-4">{program.year}</td>
                        <td className="whitespace-nowrap pr-4">{program.quota ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function HustProgramsTable({ programs }: { programs: HustAdmissionProgram2026[] }) {
  if (programs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Không có chương trình nào khớp với từ khóa.
      </p>
    );
  }

  const programByGroup = new Map<HustAdmissionProgramGroup, HustAdmissionProgram2026[]>();
  programs.forEach((program) => {
    const groupPrograms = programByGroup.get(program.group) ?? [];
    groupPrograms.push(program);
    programByGroup.set(program.group, groupPrograms);
  });

  return (
    <>
      <div className="max-h-[1120px] overflow-auto">
        <table className="w-full min-w-[920px] table-fixed border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-card text-center text-xs font-bold uppercase text-primary">
            <tr>
              <th rowSpan={2} className="h-11 w-12 border border-border px-2">
                TT
              </th>
              <th rowSpan={2} className="h-11 w-28 border border-border px-2">
                Mã xét tuyển
              </th>
              <th rowSpan={2} className="h-11 w-[360px] border border-border px-3">
                Tên chương trình đào tạo
              </th>
              <th rowSpan={2} className="h-11 w-20 border border-border px-2">
                Chỉ tiêu
              </th>
              <th colSpan={3} className="h-8 border border-border px-2">
                Phương thức và tổ hợp xét tuyển
              </th>
            </tr>
            <tr>
              <th className="h-8 w-20 border border-border px-2">XTTN</th>
              <th className="h-8 w-20 border border-border px-2">ĐGTD</th>
              <th className="h-8 w-52 border border-border px-2">THPT</th>
            </tr>
          </thead>
          <tbody>
            {HUST_GROUP_ORDER.flatMap((group) => {
              const groupPrograms = programByGroup.get(group);
              if (!groupPrograms?.length) return [];

              return [
                <tr key={group}>
                  <td
                    colSpan={7}
                    className="border border-primary bg-primary px-3 py-2 text-center text-sm font-bold uppercase text-primary-foreground"
                  >
                    {HUST_PROGRAM_GROUP_LABELS[group]}
                  </td>
                </tr>,
                ...groupPrograms.map((program) => (
                  <tr key={program.code} className="h-11">
                    <td className="border border-border px-2 text-center">{program.order}</td>
                    <td className="border border-border px-2 text-center font-bold">
                      {program.code}
                    </td>
                    <td className="border border-border px-3 font-semibold">{program.name}</td>
                    <td className="border border-border px-2 text-center">{program.quota}</td>
                    <td className="border border-border px-2 text-center">
                      <MethodStar enabled={program.methods.xttn} label="XTTN" />
                    </td>
                    <td className="border border-border px-2 text-center">
                      <MethodStar enabled={program.methods.dgtd} label="ĐGTD" />
                    </td>
                    <td className="border border-border px-3 text-center text-muted-foreground">
                      {program.methods.thpt.join(", ")}
                    </td>
                  </tr>
                )),
              ];
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs italic leading-5 text-muted-foreground">
        Ghi chú: Các tổ hợp xét tuyển theo điểm thi tốt nghiệp THPT có tính hệ số môn chính.
      </p>
    </>
  );
}

function MethodStar({ enabled, label }: { enabled: boolean; label: string }) {
  if (!enabled) {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <span className="inline-flex items-center justify-center" aria-label={label} title={label}>
      <Star className="h-5 w-5 fill-emerald-500 text-emerald-600" aria-hidden="true" />
    </span>
  );
}
