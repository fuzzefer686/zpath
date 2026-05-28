import { BadgeCheck, ExternalLink, Landmark, ShieldCheck } from "lucide-react";

import type { AdvisorAnswer } from "@/lib/advisor/types";

type SourceListProps = {
  sources: AdvisorAnswer["sources"];
  dataStatus: AdvisorAnswer["dataStatus"];
};

const sourceTypeLabels: Record<AdvisorAnswer["sources"][number]["sourceType"], string> = {
  zpath_database: "ZPath Database",
  official_school_site: "Website trường",
  government_site: "Cơ quan nhà nước",
  news: "Báo chí",
  other: "Nguồn khác",
};

const sourceTypeStyles: Record<
  AdvisorAnswer["sources"][number]["sourceType"],
  {
    icon: typeof BadgeCheck;
    labelClassName: string;
    cardClassName: string;
    trusted: boolean;
  }
> = {
  zpath_database: {
    icon: ShieldCheck,
    labelClassName: "bg-primary/10 text-primary border-primary/20",
    cardClassName: "border-primary/25 bg-primary/5",
    trusted: true,
  },
  official_school_site: {
    icon: BadgeCheck,
    labelClassName: "bg-primary/10 text-primary border-primary/20",
    cardClassName: "border-primary/25 bg-primary/5",
    trusted: true,
  },
  government_site: {
    icon: Landmark,
    labelClassName: "bg-secondary/40 text-secondary-foreground border-secondary/50",
    cardClassName: "border-secondary/50 bg-secondary/15",
    trusted: true,
  },
  news: {
    icon: ExternalLink,
    labelClassName: "bg-muted text-muted-foreground border-border",
    cardClassName: "border-border bg-background",
    trusted: false,
  },
  other: {
    icon: ExternalLink,
    labelClassName: "bg-muted text-muted-foreground border-border",
    cardClassName: "border-border bg-background",
    trusted: false,
  },
};

export function SourceList({ sources, dataStatus }: SourceListProps) {
  if (!sources.length) {
    return (
      <div className="rounded-md border border-border bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
        {dataStatus === "web_augmented"
          ? "ZPath chưa tìm thấy nguồn web đủ tin cậy cho phần này. Bạn nên kiểm tra website chính thức của trường."
          : "Câu trả lời này dựa trên kiến thức tổng quan hoặc dữ liệu hiện có của ZPath, chưa có nguồn web cụ thể."}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {dataStatus === "web_augmented" && (
        <div className="rounded-md border border-border bg-muted/35 p-3 text-xs leading-5 text-muted-foreground">
          Khi ZPath dùng nguồn web, các thông tin thực tế nên khớp với danh sách nguồn dưới đây. Ưu tiên kiểm tra website chính thức của trường hoặc cơ quan nhà nước.
        </div>
      )}

      {sources.map((source) => {
        const config = sourceTypeStyles[source.sourceType];
        const SourceIcon = config.icon;

        return (
          <a
            key={`${source.title}-${source.url}`}
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className={`block rounded-md border p-4 transition-colors hover:border-primary/50 hover:bg-primary/5 ${config.cardClassName}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-bold leading-5">{source.title}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-bold ${config.labelClassName}`}>
                    <SourceIcon className="h-3.5 w-3.5" />
                    {sourceTypeLabels[source.sourceType]}
                  </span>
                  {config.trusted && (
                    <span className="rounded-md border border-primary/20 bg-background/80 px-2 py-1 text-xs font-bold text-primary">
                      Nguồn ưu tiên
                    </span>
                  )}
                  {source.publisher && (
                    <span className="text-xs font-semibold text-muted-foreground">
                      {source.publisher}
                    </span>
                  )}
                </div>
              </div>
              <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
            <div className="mt-3 break-all rounded-md bg-background/75 px-3 py-2 text-xs leading-5 text-muted-foreground">
              {source.url}
            </div>
            {source.accessedAt && (
              <div className="mt-2 text-xs text-muted-foreground">
                Truy cập: {source.accessedAt}
              </div>
            )}
          </a>
        );
      })}
    </div>
  );
}
