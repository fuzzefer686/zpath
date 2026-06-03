"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AdmissionProgram, Benchmark } from "@/src/types/admission-data";
import { AdmissionYearSelect } from "./AdmissionYearSelect";

type BenchmarksSectionProps = {
  benchmarks: Benchmark[];
  programs: AdmissionProgram[];
  selectedYear: number;
  availableYears: readonly number[];
};

export function BenchmarksSection({
  benchmarks,
  programs,
  selectedYear,
  availableYears,
}: BenchmarksSectionProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const programById = useMemo(
    () => new Map(programs.map((program) => [program.id, program])),
    [programs],
  );
  const filteredBenchmarks = useMemo(() => {
    if (!normalizedQuery) return benchmarks;

    return benchmarks.filter((benchmark) => {
      const program = benchmark.program_id ? programById.get(benchmark.program_id) : null;

      return [
        program?.program_code,
        program?.program_name,
        program?.major_code,
        program?.major_name,
        benchmark.year,
        benchmark.method_code,
        benchmark.combination_code,
        benchmark.score,
        benchmark.scale,
        benchmark.note,
      ]
        .filter((value) => value !== null && value !== undefined)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [benchmarks, normalizedQuery, programById]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="text-xl">Điểm chuẩn tham khảo</CardTitle>
        <AdmissionYearSelect
          selectedYear={selectedYear}
          years={availableYears}
          paramName="benchmarkYear"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {benchmarks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Chưa có dữ liệu điểm chuẩn cho năm {selectedYear}.
          </p>
        ) : (
          <>
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm theo chương trình, phương thức, tổ hợp..."
                className="pl-9"
              />
            </div>

            {filteredBenchmarks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Không có điểm chuẩn nào khớp với từ khóa.
              </p>
            ) : (
              <div className="max-h-[1004px] overflow-auto">
                <table className="w-full min-w-[920px] table-auto text-left text-sm">
                  <thead className="sticky top-0 z-10 border-b bg-card text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="h-11 w-[300px] pr-5 align-bottom">Chương trình</th>
                      <th className="h-11 w-20 pr-5 align-bottom">Năm</th>
                      <th className="h-11 w-32 pr-5 align-bottom">Phương thức</th>
                      <th className="h-11 w-28 pr-5 align-bottom">Tổ hợp</th>
                      <th className="h-11 w-28 pr-5 align-bottom">Điểm</th>
                      <th className="h-11 w-[300px] pr-5 align-bottom">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredBenchmarks.map((benchmark) => {
                      const program = benchmark.program_id
                        ? programById.get(benchmark.program_id)
                        : null;

                      return (
                        <tr key={benchmark.id} className="align-top">
                          <td className="py-3 pr-5 leading-6">
                            {program?.program_code ? (
                              <span className="font-medium text-foreground">
                                {program.program_code}
                                {" - "}
                              </span>
                            ) : null}
                            <span className="break-words">{program?.program_name ?? "-"}</span>
                          </td>
                          <td className="whitespace-nowrap py-3 pr-5 leading-6">
                            {benchmark.year}
                          </td>
                          <td className="whitespace-normal break-words py-3 pr-5 leading-6">
                            {benchmark.method_code}
                          </td>
                          <td className="whitespace-normal break-words py-3 pr-5 leading-6">
                            {benchmark.combination_code ?? "-"}
                          </td>
                          <td className="whitespace-nowrap py-3 pr-5 font-bold leading-6 tabular-nums">
                            {benchmark.score}/{benchmark.scale ?? 30}
                          </td>
                          <td className="whitespace-normal break-words py-3 pr-5 leading-6 text-muted-foreground">
                            {benchmark.note ?? "-"}
                          </td>
                        </tr>
                      );
                    })}
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
