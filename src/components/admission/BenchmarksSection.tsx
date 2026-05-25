import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdmissionProgram, Benchmark } from "@/src/types/admission-data";

type BenchmarksSectionProps = {
  benchmarks: Benchmark[];
  programs: AdmissionProgram[];
};

export function BenchmarksSection({ benchmarks, programs }: BenchmarksSectionProps) {
  const programById = new Map(programs.map((program) => [program.id, program]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Điểm chuẩn tham khảo</CardTitle>
      </CardHeader>
      <CardContent>
        {benchmarks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có dữ liệu điểm chuẩn.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4">Chương trình</th>
                  <th className="py-3 pr-4">Năm</th>
                  <th className="py-3 pr-4">Phương thức</th>
                  <th className="py-3 pr-4">Tổ hợp</th>
                  <th className="py-3 pr-4">Điểm</th>
                  <th className="py-3 pr-4">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {benchmarks.map((benchmark) => {
                  const program = benchmark.program_id
                    ? programById.get(benchmark.program_id)
                    : null;

                  return (
                    <tr key={benchmark.id}>
                      <td className="py-3 pr-4">
                        {program?.program_code ? `${program.program_code} - ` : ""}
                        {program?.program_name ?? "-"}
                      </td>
                      <td className="py-3 pr-4">{benchmark.year}</td>
                      <td className="py-3 pr-4">{benchmark.method_code}</td>
                      <td className="py-3 pr-4">{benchmark.combination_code ?? "-"}</td>
                      <td className="py-3 pr-4 font-bold">
                        {benchmark.score}/{benchmark.scale ?? 30}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{benchmark.note ?? "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
