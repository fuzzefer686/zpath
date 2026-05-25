"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatVND } from "@/lib/utils";
import type { AdmissionProgram, TuitionFee } from "@/src/types/admission-data";

type TuitionSectionProps = {
  tuitionFees: TuitionFee[];
  programs: AdmissionProgram[];
};

export function TuitionSection({ tuitionFees, programs }: TuitionSectionProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const programById = useMemo(
    () => new Map(programs.map((program) => [program.id, program])),
    [programs],
  );
  const filteredTuitionFees = useMemo(() => {
    if (!normalizedQuery) return tuitionFees;

    return tuitionFees.filter((fee) => {
      const program = fee.program_id ? programById.get(fee.program_id) : null;

      return [
        program?.program_code,
        program?.program_name,
        program?.major_code,
        program?.major_name,
        fee.year,
        formatFeeRange(fee),
        fee.unit,
        fee.description,
        fee.note,
      ]
        .filter((value) => value !== null && value !== undefined)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [normalizedQuery, programById, tuitionFees]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Học phí</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tuitionFees.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có dữ liệu học phí.</p>
        ) : (
          <>
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm theo chương trình, học phí, ghi chú..."
                className="pl-9"
              />
            </div>

            {filteredTuitionFees.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Không có dòng học phí nào khớp với từ khóa.
              </p>
            ) : (
              <div className="max-h-[1004px] overflow-auto">
                <table className="w-full min-w-[720px] table-fixed text-left text-sm">
                  <thead className="sticky top-0 z-10 border-b bg-card text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="h-11 w-72 pr-4">Chương trình</th>
                      <th className="h-11 w-20 pr-4">Năm</th>
                      <th className="h-11 w-48 pr-4">Học phí</th>
                      <th className="h-11 w-28 pr-4">Đơn vị</th>
                      <th className="h-11 w-72 pr-4">Mô tả</th>
                      <th className="h-11 w-72 pr-4">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredTuitionFees.map((fee) => {
                      const program = fee.program_id ? programById.get(fee.program_id) : null;
                      return (
                        <tr key={fee.id} className="h-12">
                          <td className="truncate pr-4">
                            {program?.program_code ? `${program.program_code} - ` : ""}
                            {program?.program_name ?? "Thông tin chung"}
                          </td>
                          <td className="whitespace-nowrap pr-4">{fee.year}</td>
                          <td className="truncate pr-4 font-bold text-primary">
                            {formatFeeRange(fee)}
                          </td>
                          <td className="truncate pr-4">{fee.unit ?? "-"}</td>
                          <td className="truncate pr-4 text-muted-foreground">
                            {fee.description ?? "-"}
                          </td>
                          <td className="truncate pr-4 text-muted-foreground">
                            {fee.note ?? "-"}
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

function formatFeeRange(fee: TuitionFee) {
  if (fee.currency && fee.currency !== "VND") {
    const min = fee.min_fee ?? 0;
    const max = fee.max_fee ?? min;
    return min === max ? `${min} ${fee.currency}` : `${min} - ${max} ${fee.currency}`;
  }

  if (fee.min_fee === null && fee.max_fee === null) return "Chưa công bố";
  if (fee.min_fee !== null && fee.max_fee !== null && fee.min_fee !== fee.max_fee) {
    return `${formatVND(fee.min_fee)} - ${formatVND(fee.max_fee)}`;
  }

  return formatVND(fee.min_fee ?? fee.max_fee ?? 0);
}
