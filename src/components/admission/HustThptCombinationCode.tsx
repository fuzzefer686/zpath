import type { HustThptCombinationConfig } from "@/src/lib/admission-data/hust-programs-2026";

export const HUST_THPT_BOLD_NOTE =
  "Ghi chú: Tổ hợp in đậm có môn Toán nhân hệ số 2.";

export function isHustMainSubjectDoubled(
  combination: Pick<
    HustThptCombinationConfig,
    "isMainSubjectDoubled" | "mainSubjectCoefficient"
  >,
) {
  return combination.isMainSubjectDoubled || combination.mainSubjectCoefficient === 2;
}

export function HustThptCombinationCode({
  combination,
  className,
}: {
  combination: HustThptCombinationConfig;
  className?: string;
}) {
  const content = combination.combinationCode;

  if (isHustMainSubjectDoubled(combination)) {
    return <strong className={className}>{content}</strong>;
  }

  return <span className={className}>{content}</span>;
}
