import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { School } from "@/src/types/admission-data";

type SchoolOverviewSectionProps = {
  school: School;
};

export function SchoolOverviewSection({ school }: SchoolOverviewSectionProps) {
  const rows = [
    ["Mã trường", school.code],
    ["Loại hình", school.type],
    ["Thành phố", school.city],
    ["Địa chỉ", school.address],
    ["Fanpage", school.fanpage],
    ["Nguồn", school.source_url],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Tổng quan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {school.description ? (
          <p className="text-sm leading-6 text-muted-foreground">{school.description}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Chưa có mô tả tổng quan.</p>
        )}
        {rows.length ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border bg-background p-3">
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {label}
                </dt>
                <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </CardContent>
    </Card>
  );
}
