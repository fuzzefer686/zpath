import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdmissionInfo, AdmissionMethodRecord } from "@/src/types/admission-data";
import { AdmissionYearSelect } from "./AdmissionYearSelect";

type AdmissionInfoSectionProps = {
  admissionInfo: AdmissionInfo | null;
  methods: AdmissionMethodRecord[];
  selectedYear: number;
  availableYears: readonly number[];
};

export function AdmissionInfoSection({
  admissionInfo,
  methods,
  selectedYear,
  availableYears,
}: AdmissionInfoSectionProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="text-xl">Thông tin tuyển sinh</CardTitle>
        <AdmissionYearSelect
          selectedYear={selectedYear}
          years={availableYears}
          paramName="programYear"
        />
      </CardHeader>
      <CardContent className="space-y-5">
        {admissionInfo ? (
          <div className="grid gap-3 md:grid-cols-2">
            <InfoBlock label="Năm" value={String(admissionInfo.year)} />
            <InfoBlock label="Tổng chỉ tiêu" value={admissionInfo.total_quota?.toString() ?? "-"} />
            <InfoBlock label="Phạm vi tuyển sinh" value={admissionInfo.admission_scope ?? "-"} />
            <InfoBlock label="Thời gian đăng ký" value={admissionInfo.application_timeline ?? "-"} />
            <InfoBlock label="Điều kiện" value={admissionInfo.eligibility ?? "-"} />
            <InfoBlock label="Ghi chú" value={admissionInfo.notes ?? "-"} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Chưa có thông tin tuyển sinh cho năm {selectedYear}.
          </p>
        )}

        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Phương thức
          </h3>
          {methods.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chưa có phương thức tuyển sinh cho năm {selectedYear}.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {methods.map((method) => (
                <div key={method.id} className="rounded-lg border border-border p-4">
                  <div className="text-sm font-bold">{method.method_code}</div>
                  <p className="mt-1 text-sm">{method.method_name}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Năm {method.year}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm leading-6">{value}</div>
    </div>
  );
}
