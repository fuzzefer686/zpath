import assert from "node:assert/strict";

import { parseBenchmarkCsvRows } from "@/src/lib/admission-config/parse-benchmark-csv";
import { parseCsvRows } from "@/src/lib/admission-config/parse-import-csv";

const csv = `program_code,method_code,combination_code,year,score,scale,program_year
IT001,THPT,A00,2025,26.5,30,2026
KT002,thpt,,2024,25,30,2026`;

const { rows, errors } = parseBenchmarkCsvRows(csv, 2026, 2025);

assert.equal(errors.length, 0);
assert.equal(rows.length, 2);
assert.equal(rows[0]?.programCode, "IT001");
assert.equal(rows[0]?.methodCode, "THPT");
assert.equal(rows[0]?.combinationCode, "A00");
assert.equal(rows[0]?.benchmarkYear, 2025);
assert.equal(rows[0]?.score, 26.5);
assert.equal(rows[0]?.programYear, 2026);
assert.equal(rows[1]?.combinationCode, null);
assert.equal(rows[1]?.methodCode, "THPT");

const defaultYear = parseBenchmarkCsvRows(
  "program_code,score\nIT001,26\n",
  2026,
  2025,
);
assert.equal(defaultYear.rows[0]?.benchmarkYear, 2025);
assert.equal(defaultYear.rows[0]?.methodCode, "THPT");

assert.equal(parseCsvRows("a,b\n1,2").length, 1);

console.log("importBenchmarksCsv.test.ts: all assertions passed");
