import {
  AOF_BENCHMARKS_2025,
  type AofBenchmark2025,
} from "@/src/lib/admission-data/aof-benchmarks-2025";
import {
  AOF_PROGRAMS_2026,
  type AofAdmissionMethodTag,
  type AofCombinationCode,
  type AofProgram2026,
} from "@/src/lib/admission-data/aof-programs-2026";
import { compareScoreWithCutoff } from "./compareScoreWithCutoff";

export type AofProgramSuggestionStatus = "above" | "equal" | "below";

export type AofProgramSuggestion = {
  programName: string;
  majorName: string;
  programCode2025: string;
  programCode2026: string | null;
  campus: AofProgram2026["campus"] | null;
  benchmark2025: number;
  userScore: number;
  difference: number;
  status: AofProgramSuggestionStatus;
  note: string;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function resolveMethodTag(methodCode: string): AofAdmissionMethodTag | null {
  if (methodCode.startsWith("PT1")) return "PT1";
  if (methodCode.startsWith("PT2")) return "PT2";
  if (methodCode.startsWith("PT3")) return "PT3";
  return null;
}

function campusPriority(campus: AofProgram2026["campus"]) {
  if (campus === "MB_HANOI") return 0;
  if (campus === "MB_HOALAC") return 1;
  return 2;
}

function pickBestProgramMatch(
  benchmark: AofBenchmark2025,
  methodTag: AofAdmissionMethodTag | null,
  combinationCode?: string,
) {
  const normalizedBenchmarkName = normalizeText(benchmark.programName);
  const majorCode = benchmark.majorCode;

  const sameMajor = AOF_PROGRAMS_2026.filter((program) => program.majorCode === majorCode);
  const strictNameMatches = sameMajor.filter((program) => {
    const normalizedProgramName = normalizeText(program.programName);
    return (
      normalizedProgramName === normalizedBenchmarkName ||
      normalizedProgramName.includes(normalizedBenchmarkName) ||
      normalizedBenchmarkName.includes(normalizedProgramName)
    );
  });

  const byNameThenMajor = strictNameMatches.length ? strictNameMatches : sameMajor;
  const byMethod = methodTag
    ? byNameThenMajor.filter((program) => program.methods.includes(methodTag))
    : byNameThenMajor;

  const byCombination =
    methodTag === "PT3" && combinationCode
      ? byMethod.filter((program) =>
          program.combinations.includes(combinationCode as AofCombinationCode),
        )
      : byMethod;

  const candidates = byCombination.length ? byCombination : byMethod;
  if (!candidates.length) return null;

  return [...candidates].sort((a, b) => campusPriority(a.campus) - campusPriority(b.campus))[0];
}

export function suggestEligibleProgramsForAof({
  score30,
  methodCode,
  combinationCode,
}: {
  score30: number;
  methodCode: string;
  combinationCode?: string;
}): AofProgramSuggestion[] {
  if (!Number.isFinite(score30)) return [];

  const methodTag = resolveMethodTag(methodCode);

  const suggestions = AOF_BENCHMARKS_2025.map((benchmark) => {
    const comparison = compareScoreWithCutoff({
      schoolCode: "AOF",
      year: 2026,
      benchmarkYear: 2025,
      programCode: benchmark.programCode2025,
      method: methodCode,
      combinationCode,
      score: score30,
      previousYearCutoff: benchmark.cutoff30,
    });

    if (
      comparison.difference === null ||
      (comparison.status !== "above" &&
        comparison.status !== "equal" &&
        comparison.status !== "below")
    ) {
      return null;
    }

    const matchedProgram = pickBestProgramMatch(benchmark, methodTag, combinationCode);

    return {
      programName: benchmark.programName,
      majorName: benchmark.majorName,
      programCode2025: benchmark.programCode2025,
      programCode2026: matchedProgram?.programCode2026 ?? null,
      campus: matchedProgram?.campus ?? null,
      benchmark2025: benchmark.cutoff30,
      userScore: score30,
      difference: comparison.difference,
      status: comparison.status,
      note: benchmark.note,
    } satisfies AofProgramSuggestion;
  }).filter((item): item is AofProgramSuggestion => Boolean(item));

  return suggestions.sort((a, b) => {
    if (a.status !== b.status) {
      if (a.status === "above") return -1;
      if (b.status === "above") return 1;
      if (a.status === "equal") return -1;
      if (b.status === "equal") return 1;
    }
    return b.difference - a.difference;
  });
}

export function getPassablePrograms(
  suggestions: AofProgramSuggestion[],
): AofProgramSuggestion[] {
  return suggestions.filter(
    (item) => item.status === "above" || item.status === "equal",
  );
}
