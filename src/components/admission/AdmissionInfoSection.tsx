import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdmissionInfo, AdmissionMethodRecord } from "@/src/types/admission-data";

type AdmissionInfoSectionProps = {
  admissionInfo: AdmissionInfo | null;
  methods: AdmissionMethodRecord[];
};

export function AdmissionInfoSection({
  admissionInfo,
  methods,
}: AdmissionInfoSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Thông tin tuyển sinh</CardTitle>
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
          <p className="text-sm text-muted-foreground">Chưa có thông tin tuyển sinh.</p>
        )}

        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Phương thức
          </h3>
          {methods.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có phương thức tuyển sinh.</p>
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
