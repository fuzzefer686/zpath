import type { AdmissionMethod, SchoolCode } from "@/src/lib/admission-engine";
import type { AdmissionProgram, Benchmark } from "@/src/types/admission-data";

export function findBenchmarkForProgram({
  schoolCode,
  programs,
  benchmarks,
  programCode,
  method,
  combinationCode,
  benchmarkYear,
}: {
  schoolCode: SchoolCode;
  programs: AdmissionProgram[];
  benchmarks: Benchmark[];
  programCode: string;
  method: AdmissionMethod;
  combinationCode?: string;
  benchmarkYear: number;
}) {
  const benchmarkProgramIds = new Set(
    programs
      .filter((program) => program.program_code === programCode)
      .map((program) => program.id),
  );

  const sameProgramBenchmarks = benchmarks.filter((benchmark) => {
    if (benchmark.school_code !== schoolCode) return false;
    if (benchmark.year !== benchmarkYear) return false;
    if (benchmark.method_code !== method) return false;

    const benchmarkProgramCode = benchmark.admission_programs?.program_code ?? null;
    if (benchmarkProgramCode) return benchmarkProgramCode === programCode;

    return benchmark.program_id !== null && benchmarkProgramIds.has(benchmark.program_id);
  });

  if (method === "THPT") {
    return (
      sameProgramBenchmarks.find(
        (benchmark) => benchmark.combination_code === combinationCode,
      ) ??
      sameProgramBenchmarks.find((benchmark) => benchmark.combination_code === null) ??
      null
    );
  }

  return sameProgramBenchmarks.find((benchmark) => benchmark.combination_code === null) ?? null;
}
