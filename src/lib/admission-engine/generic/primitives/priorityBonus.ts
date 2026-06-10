export type PriorityBonusResult = {
  score: number;
  priority: number;
  bonus: number;
};

/**
 * Adds priority points and bonus points to a base score, capping the total at
 * `cap` (the original scale of the formula). Priority/bonus that would push the
 * score above the scale maximum are clamped, matching how Vietnamese admission
 * formulas treat overflow.
 */
export function applyPriorityAndBonus(
  baseScore: number,
  priority: number,
  bonuses: number[],
  cap: number,
): PriorityBonusResult {
  const safePriority = Number.isFinite(priority) ? Math.max(0, priority) : 0;
  const bonus = bonuses.reduce(
    (sum, value) => sum + (Number.isFinite(value) ? Math.max(0, value) : 0),
    0,
  );

  const total = baseScore + safePriority + bonus;
  const score = Number.isFinite(cap) && cap > 0 ? Math.min(total, cap) : total;

  return { score, priority: safePriority, bonus };
}
