import { ArrowRight, Search } from "lucide-react";

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
    <div className="mx-auto max-w-3xl rounded-3xl border border-white/40 bg-white/55 p-3 sm:p-4 backdrop-blur-2xl shadow-glow hover:border-white/60 transition-all duration-300">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Soft glowing input container */}
        <div className="relative flex-1 rounded-2xl border border-white/20 bg-white/70 focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/10 transition-all shadow-inner overflow-hidden">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onAsk();
            }}
            placeholder={inputPlaceholder}
            className="h-14 rounded-2xl border-0 bg-transparent pl-12 pr-4 text-sm font-medium text-foreground placeholder-foreground/60 shadow-none ring-0 focus-visible:ring-0 sm:text-base outline-none w-full"
          />
        </div>

        {/* Premium gradient action button */}
        <Button
          type="button"
          onClick={onAsk}
          disabled={!value.trim()}
          size="lg"
          className="h-14 w-full rounded-2xl px-8 sm:w-auto bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 shadow-glow hover:shadow-glow/85 text-white font-bold cursor-pointer transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-sm sm:text-base gap-2 shrink-0"
        >
          Hỏi ngay
          <ArrowRight className="h-4 w-4 text-white" />
        </Button>
      </div>
    </div>
  );
}
