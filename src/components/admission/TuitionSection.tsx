import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatVND } from "@/lib/utils";
import type { AdmissionProgram, TuitionFee } from "@/src/types/admission-data";

type TuitionSectionProps = {
  tuitionFees: TuitionFee[];
  programs: AdmissionProgram[];
};

export function TuitionSection({ tuitionFees, programs }: TuitionSectionProps) {
  const programById = new Map(programs.map((program) => [program.id, program]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Học phí</CardTitle>
      </CardHeader>
      <CardContent>
        {tuitionFees.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có dữ liệu học phí.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {tuitionFees.map((fee) => {
              const program = fee.program_id ? programById.get(fee.program_id) : null;
              return (
                <div key={fee.id} className="rounded-lg border border-border p-4">
                  <div className="text-sm font-bold">
                    {program?.program_name ?? "Thông tin chung"}
                  </div>
                  <div className="mt-2 text-lg font-bold text-primary">
                    {formatFeeRange(fee)}
                  </div>
                  {fee.unit ? <p className="text-xs text-muted-foreground">{fee.unit}</p> : null}
                  {fee.description ? <p className="mt-2 text-sm">{fee.description}</p> : null}
                  {fee.note ? (
                    <p className="mt-2 text-xs text-muted-foreground">{fee.note}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
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
