import { parseCsvRows, readCsvField } from "./parse-import-csv";

export type CsvBenchmarkRow = {
  programCode: string;
  methodCode: string;
  combinationCode: string | null;
  benchmarkYear: number;
  score: number;
  scale: number;
  programYear: number;
};

function parseBenchmarkYear(value: string, fallback: number): number | null {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function parseScore(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseScale(value: string): number {
  if (!value) return 30;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 30;
}

export function parseBenchmarkCsvRows(
  csvText: string,
  admissionYear: number,
  defaultBenchmarkYear: number,
): { rows: CsvBenchmarkRow[]; errors: Array<{ line: number; reason: string }> } {
  const rawRows = parseCsvRows(csvText);
  const rows: CsvBenchmarkRow[] = [];
  const errors: Array<{ line: number; reason: string }> = [];

  rawRows.forEach((record, index) => {
    const line = index + 2;
    const programCode = readCsvField(record, ["program_code", "programcode"]);
    const methodCode = (
      readCsvField(record, ["method_code", "methodcode"]) || "THPT"
    ).toUpperCase();
    const combinationRaw = readCsvField(record, [
      "combination_code",
      "combinationcode",
    ]);
    const combinationCode = combinationRaw ? combinationRaw.toUpperCase() : null;

    const benchmarkYear = parseBenchmarkYear(
      readCsvField(record, ["year", "benchmark_year", "benchmarkyear"]),
      defaultBenchmarkYear,
    );
    const programYear = parseBenchmarkYear(
      readCsvField(record, ["program_year", "programyear"]),
      admissionYear,
    );
    const score = parseScore(readCsvField(record, ["score", "benchmark_score"]));
    const scale = parseScale(readCsvField(record, ["scale"]));

    if (!programCode) {
      errors.push({ line, reason: "Thiếu program_code." });
      return;
    }
    if (benchmarkYear === null) {
      errors.push({ line, reason: "year không hợp lệ." });
      return;
    }
    if (programYear === null) {
      errors.push({ line, reason: "program_year không hợp lệ." });
      return;
    }
    if (score === null) {
      errors.push({ line, reason: "score không hợp lệ." });
      return;
    }

    rows.push({
      programCode,
      methodCode,
      combinationCode,
      benchmarkYear,
      score,
      scale,
      programYear,
    });
  });

  return { rows, errors };
}
