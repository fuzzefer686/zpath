/**
 * Minimal CSV parser for admin import endpoints.
 * Expects a header row and comma-separated values (no quoted-field escaping).
 */

export function parseCsvRows(csvText: string): Record<string, string>[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((cell) => cell.trim().toLowerCase());
  const rows: Record<string, string>[] = [];

  for (const line of lines.slice(1)) {
    const cells = line.split(",").map((cell) => cell.trim());
    const record: Record<string, string> = {};
    header.forEach((key, index) => {
      record[key] = cells[index] ?? "";
    });
    rows.push(record);
  }

  return rows;
}

export function readCsvField(
  record: Record<string, string>,
  keys: string[],
): string {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== "") return value;
  }
  return "";
}
