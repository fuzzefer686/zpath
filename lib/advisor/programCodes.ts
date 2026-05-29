export function canonicalizeAdvisorProgramCode(value?: string | null) {
  const normalized = value
    ?.trim()
    .toUpperCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, "");

  if (!normalized) return undefined;

  const englishAdvancedMatch = normalized.match(/^([A-Z]{1,3})-?E-?(\d{1,3})$/);
  if (englishAdvancedMatch) {
    return `${englishAdvancedMatch[1]}-E${englishAdvancedMatch[2]}`;
  }

  const pfievMatch = normalized.match(/^([A-Z]{1,3})-?EP$/);
  if (pfievMatch) {
    return `${pfievMatch[1]}-EP`;
  }

  const internationalMatch = normalized.match(/^([A-Z]{1,3})-?(LUH|NUT|GU)$/);
  if (internationalMatch) {
    return `${internationalMatch[1]}-${internationalMatch[2]}`;
  }

  return normalized;
}
