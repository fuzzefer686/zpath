import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdmissionProgram } from "@/src/types/admission-data";

type AdmissionProgramsSectionProps = {
  programs: AdmissionProgram[];
};

export function AdmissionProgramsSection({ programs }: AdmissionProgramsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Chương trình tuyển sinh</CardTitle>
      </CardHeader>
      <CardContent>
        {programs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có dữ liệu chương trình.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4">Mã</th>
                  <th className="py-3 pr-4">Chương trình</th>
                  <th className="py-3 pr-4">Ngành</th>
                  <th className="py-3 pr-4">Năm</th>
                  <th className="py-3 pr-4">Chỉ tiêu</th>
                  <th className="py-3 pr-4">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {programs.map((program) => (
                  <tr key={program.id}>
                    <td className="py-3 pr-4 font-semibold">{program.program_code ?? "-"}</td>
                    <td className="py-3 pr-4">{program.program_name}</td>
                    <td className="py-3 pr-4">{program.major_name ?? program.major_code ?? "-"}</td>
                    <td className="py-3 pr-4">{program.year}</td>
                    <td className="py-3 pr-4">{program.quota ?? "-"}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{program.note ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
