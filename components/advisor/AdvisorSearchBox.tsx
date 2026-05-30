import { ArrowRight, Globe2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AdvisorSearchBoxProps = {
  value: string;
  allowWebSearch: boolean;
  onChange: (value: string) => void;
  onAsk: () => void;
  onAllowWebSearchChange: (allowWebSearch: boolean) => void;
};

const inputPlaceholder =
  "Ví dụ: Review ngành Marketing ở NEU, so sánh Y đa khoa và Dược, 25 điểm A00 nên chọn trường nào?";

export function AdvisorSearchBox({
  value,
  allowWebSearch,
  onChange,
  onAsk,
  onAllowWebSearchChange,
}: AdvisorSearchBoxProps) {
  return (
    <div className="mx-auto max-w-3xl rounded-lg border border-border bg-card p-2 shadow-md">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onAsk();
            }}
            placeholder={inputPlaceholder}
            className="h-14 rounded-md border-0 bg-background pl-12 pr-4 text-sm shadow-none ring-0 focus-visible:ring-0 sm:text-base"
          />
        </div>

        <Button
          type="button"
          onClick={onAsk}
          disabled={!value.trim()}
          size="lg"
          className="h-14 w-full rounded-md px-6 sm:w-auto"
        >
          Hỏi ngay
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-2 px-2 pb-1 pt-2 text-left sm:flex-row sm:items-center sm:justify-between">
        <label className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-foreground opacity-80 cursor-not-allowed">
          <input
            type="checkbox"
            checked={true}
            disabled={true}
            className="h-4 w-4 rounded border-border accent-primary cursor-not-allowed"
          />
          <span className="inline-flex items-center gap-1.5 select-none">
            <Globe2 className="h-4 w-4 text-primary" />
            Tìm thêm trên web
          </span>
        </label>
        <span className="text-xs leading-5 text-muted-foreground select-none">
          Chế độ tìm kiếm web luôn BẬT để đảm bảo cập nhật thông tin tuyển sinh mới nhất.
        </span>
      </div>
    </div>
  );
}
