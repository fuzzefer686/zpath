import { CheckCircle2, HelpCircle, AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AdvisorAnswerConfidence } from "@/lib/advisor/types";

const confidenceConfig: Record<
  AdvisorAnswerConfidence,
  {
    label: string;
    className: string;
    icon: typeof CheckCircle2;
  }
> = {
  high: {
    label: "Độ tin cậy cao",
    className: "border-tier-high/30 bg-tier-high-soft text-tier-high",
    icon: CheckCircle2,
  },
  medium: {
    label: "Độ tin cậy trung bình",
    className: "border-tier-mid/40 bg-tier-mid-soft text-tier-mid-foreground",
    icon: HelpCircle,
  },
  low: {
    label: "Độ tin cậy thấp",
    className: "border-tier-low/30 bg-tier-low-soft text-tier-low",
    icon: AlertTriangle,
  },
};

type ConfidenceBadgeProps = {
  confidence: AdvisorAnswerConfidence;
};

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const config = confidenceConfig[confidence];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-bold",
        config.className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}
