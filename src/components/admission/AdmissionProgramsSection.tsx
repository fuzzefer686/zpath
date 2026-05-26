"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AdmissionProgram } from "@/src/types/admission-data";
import { AdmissionYearSelect } from "./AdmissionYearSelect";

type AdmissionProgramsSectionProps = {
  programs: AdmissionProgram[];
  selectedYear: number;
  availableYears: readonly number[];
};

export function AdmissionProgramsSection({
  programs,
  selectedYear,
  availableYears,
}: AdmissionProgramsSectionProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
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
        {programs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Chưa có dữ liệu chương trình cho năm {selectedYear}.
          </p>
        ) : (
          <>
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm theo mã, tên chương trình, ngành..."
                className="pl-9"
              />
            </div>

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
                      <th className="h-11 w-72 pr-4">Ghi chú</th>
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
                        <td className="truncate pr-4 text-muted-foreground">
                          {program.note ?? "-"}
                        </td>
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
