import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  HUST_ADMISSION_PROGRAMS_2026,
  getHustThptCombinationConfig,
  type HustSubjectKey,
  type HustThptCombinationConfig,
} from "@/src/lib/admission-data/hust-programs-2026";
import { findBenchmarkForProgram } from "@/src/lib/admission-data/benchmark-lookup";
import { HustThptCombinationCode } from "@/src/components/admission/HustThptCombinationCode";
import type { AdmissionProgram, Benchmark } from "@/src/types/admission-data";
import type { AdmissionInput } from "../../core/types";
import { compareHustScoreWithPreviousCutoff } from "./compare";
import {
  convertLanguageCertificateToBand,
  convertToeicFourSkills,
} from "./language-certificate";
import {
  calculateHustThptScore,
  calculateHustThptSubjectScore,
} from "./hust.thpt";
import { calculateHustTsaScore } from "./hust.tsa";
import { calculateHustXttnScore } from "./hust.xttn";

const subjectScoreFixture: Record<HustSubjectKey, number> = {
  math: 8.4,
  physics: 9.25,
  chemistry: 8.1,
  english: 8.5,
  biology: 8,
  literature: 8.2,
  chinese: 8.3,
  korean: 8.3,
  informatics: 9,
};

function createBenchmarkProgram(programCode: string): AdmissionProgram {
  return {
    id: `program-2025-${programCode}`,
    school_code: "HUST",
    program_code: programCode,
    program_name: programCode,
    major_code: null,
    major_name: null,
    year: 2025,
    quota: null,
    degree_level: "Đại học",
    training_type: "Chính quy",
    note: null,
    source_url: null,
    created_at: null,
  };
}

function createBenchmarkRow({
  programCode,
  methodCode,
  combinationCode,
  score,
  scale = 30,
}: {
  programCode: string;
  methodCode: "THPT" | "TSA" | "XTTN";
  combinationCode: string | null;
  score: number;
  scale?: number;
}): Benchmark {
  return {
    id: `benchmark-2025-${programCode}-${methodCode}-${combinationCode ?? "all"}`,
    school_code: "HUST",
    program_id: `program-2025-${programCode}`,
    admission_programs: {
      program_code: programCode,
      year: 2025,
    },
    year: 2025,
    method_code: methodCode,
    combination_code: combinationCode,
    score,
    scale,
    note: null,
    source_url: null,
    created_at: null,
  };
}

test("HUST language certificate conversion maps IELTS 5.0 to band 1", () => {
  const result = convertLanguageCertificateToBand({
    certificateType: "IELTS_ACADEMIC",
    score: 5.0,
  });

  assert.equal(result?.bonusScoreOutOf10, 1);
  assert.equal(result?.convertedSubjectScoreOutOf10, 8.0);
});

test("HUST language certificate conversion maps IELTS 6.5 to band 4", () => {
  const result = convertLanguageCertificateToBand({
    certificateType: "IELTS_ACADEMIC",
    score: 6.5,
  });

  assert.equal(result?.bonusScoreOutOf10, 4);
  assert.equal(result?.convertedSubjectScoreOutOf10, 9.5);
});

test("HUST language certificate conversion maps IELTS 7.5 to band 5", () => {
  const result = convertLanguageCertificateToBand({
    certificateType: "IELTS_ACADEMIC",
    score: 7.5,
  });

  assert.equal(result?.bonusScoreOutOf10, 5);
  assert.equal(result?.convertedSubjectScoreOutOf10, 10.0);
});

test("HUST language certificate conversion maps VSTEP 8.0 to band 4", () => {
  const result = convertLanguageCertificateToBand({
    certificateType: "VSTEP",
    score: 8.0,
  });

  assert.equal(result?.bonusScoreOutOf10, 4);
  assert.equal(result?.convertedSubjectScoreOutOf10, 9.5);
});

test("HUST language certificate conversion maps TOEFL iBT 94 to band 5", () => {
  const result = convertLanguageCertificateToBand({
    certificateType: "TOEFL_IBT",
    score: 94,
  });

  assert.equal(result?.bonusScoreOutOf10, 5);
  assert.equal(result?.convertedSubjectScoreOutOf10, 10.0);
});

test("HUST TOEIC conversion averages four converted skill bands", () => {
  const result = convertToeicFourSkills({
    listening: 400,
    speaking: 164,
    reading: 429,
    writing: 180,
  });

  assert.equal(result?.bonusScoreOutOf10, 3.5);
  assert.equal(result?.convertedSubjectScoreOutOf10, 9.25);
  assert.equal(result?.skillBands.listening.bandId, "band_2");
  assert.equal(result?.skillBands.writing.bandId, "band_5");
});

test("HUST missing or unsupported language certificate returns null safely", () => {
  assert.equal(
    convertLanguageCertificateToBand({
      certificateType: "IELTS_ACADEMIC",
      score: 4.5,
    }),
    null,
  );
  assert.equal(
    convertLanguageCertificateToBand({
      certificateType: "TOEIC",
      score: 900,
    }),
    null,
  );
  assert.equal(
    convertToeicFourSkills({
      listening: 400,
      speaking: 164,
      reading: 429,
    }),
    null,
  );
});

test("HUST K01 formula uses math, literature, and best science subject", () => {
  const result = calculateHustThptScore({
    schoolCode: "HUST",
    method: "THPT",
    year: 2026,
    payload: {
      programCode: "BF1",
      combinationCode: "K01",
      scores: {
        math: 8,
        literature: 7,
        physics: 9,
        chemistry: 8,
      },
      priorityScore: 0.5,
    },
  } satisfies AdmissionInput);

  assert.equal(result.normalizedScore30, 25);
  assert.equal(result.details?.bestScienceScore, 9);
});

test("HUST normal THPT combinations use simple subject sum", () => {
  const result = calculateHustThptScore({
    schoolCode: "HUST",
    method: "THPT",
    year: 2026,
    payload: {
      programCode: "ED2",
      combinationCode: "A00",
      scores: {
        math: 8,
        physics: 9,
        chemistry: 7,
      },
    },
  });

  assert.equal(result.normalizedScore30, 24);
});

test("HUST THPT A01 uses converted English score when certificate mode is selected", () => {
  const result = calculateHustThptScore({
    schoolCode: "HUST",
    method: "THPT",
    year: 2026,
    payload: {
      programCode: "ED2",
      combinationCode: "A01",
      englishScoreSource: "certificate",
      scores: {
        math: 8,
        physics: 7,
      },
      languageCertificate: {
        certificateType: "IELTS_ACADEMIC",
        score: 6.5,
      },
    },
  });

  assert.equal(result.normalizedScore30, 24.5);
  assert.deepEqual(result.details?.subjectScores, {
    math: 8,
    physics: 7,
    english: 9.5,
  });
});

test("HUST IT2 A01 can compare against 2025 benchmark table data", () => {
  const score = calculateHustThptScore({
    schoolCode: "HUST",
    method: "THPT",
    year: 2026,
    payload: {
      programCode: "IT2",
      combinationCode: "A01",
      englishScoreSource: "certificate",
      scores: {
        math: 8.4,
        physics: 9.25,
      },
      priorityScore: 0.25,
      languageCertificate: {
        certificateType: "IELTS_ACADEMIC",
        score: 6.5,
      },
    },
  });
  const benchmark = findBenchmarkForProgram({
    schoolCode: "HUST",
    programs: [],
    benchmarks: [
      createBenchmarkRow({
        programCode: "IT2",
        methodCode: "THPT",
        combinationCode: null,
        score: 28.87,
      }),
    ],
    programCode: "IT2",
    method: "THPT",
    combinationCode: "A01",
    benchmarkYear: 2025,
  });

  assert.equal(Number(score.normalizedScore30.toFixed(4)), 26.9125);
  assert.equal(benchmark?.score, 28.87);
  assert.equal(
    compareHustScoreWithPreviousCutoff({
      year: 2026,
      benchmarkYear: 2025,
      programCode: "IT2",
      method: "THPT",
      combinationCode: "A01",
      score: score.normalizedScore30,
      previousYearCutoff: benchmark?.score ?? null,
    }).status,
    "below",
  );
});

test("HUST ED2 D01 without IELTS compares against 2025 benchmark table data", () => {
  const score = calculateHustThptScore({
    schoolCode: "HUST",
    method: "THPT",
    year: 2026,
    payload: {
      programCode: "ED2",
      combinationCode: "D01",
      scores: {
        math: 8.4,
        literature: 8.2,
        english: 8.5,
      },
      priorityScore: 0.25,
    },
  });
  const benchmark = findBenchmarkForProgram({
    schoolCode: "HUST",
    programs: [createBenchmarkProgram("ED2")],
    benchmarks: [
      createBenchmarkRow({
        programCode: "ED2",
        methodCode: "THPT",
        combinationCode: "D01",
        score: 23.3,
      }),
    ],
    programCode: "ED2",
    method: "THPT",
    combinationCode: "D01",
    benchmarkYear: 2025,
  });

  assert.equal(Number(score.normalizedScore30.toFixed(2)), 25.35);
  assert.equal(benchmark?.score, 23.3);
  assert.equal(
    compareHustScoreWithPreviousCutoff({
      year: 2026,
      benchmarkYear: 2025,
      programCode: "ED2",
      method: "THPT",
      combinationCode: "D01",
      score: score.normalizedScore30,
      previousYearCutoff: benchmark?.score ?? null,
    }).status,
    "above",
  );
});

test("HUST THPT A00 does not allow English certificate replacement", () => {
  assert.throws(
    () =>
      calculateHustThptScore({
        schoolCode: "HUST",
        method: "THPT",
        year: 2026,
        payload: {
          programCode: "ED2",
          combinationCode: "A00",
          englishScoreSource: "certificate",
          scores: {
            math: 8,
            physics: 9,
            chemistry: 7,
          },
          languageCertificate: {
            certificateType: "IELTS_ACADEMIC",
            score: 6.5,
          },
        },
      }),
    /không hỗ trợ quy đổi/,
  );
});

test("HUST math coefficient 2 formula normalizes back to 30-point scale", () => {
  const combinationConfig: HustThptCombinationConfig = {
    combinationCode: "A00",
    subjects: ["math", "physics", "chemistry"],
    formulaType: "MATH_COEFFICIENT_2",
    mainSubject: "math",
    mainSubjectCoefficient: 2,
    isMainSubjectDoubled: true,
    mathCoefficient: 2,
  };

  const result = calculateHustThptSubjectScore({
    combinationConfig,
    scores: {
      math: 8,
      physics: 9,
      chemistry: 7,
    },
  });

  assert.equal(result.score, 24);
});

test("HUST doubled combination is rendered in bold", () => {
  const combination = getHustThptCombinationConfig("BF1", "A00");
  assert.ok(combination);

  const html = renderToStaticMarkup(
    createElement(HustThptCombinationCode, { combination }),
  );

  assert.match(html, /^<strong/);
  assert.match(html, />A00<\/strong>$/);
});

test("HUST normal combination is not rendered in bold", () => {
  const combination = getHustThptCombinationConfig("ED2", "A00");
  assert.ok(combination);

  const html = renderToStaticMarkup(
    createElement(HustThptCombinationCode, { combination }),
  );

  assert.match(html, /^<span/);
  assert.match(html, />A00<\/span>$/);
});

test("HUST stores doubled status per program and combination", () => {
  const engineeringA00 = getHustThptCombinationConfig("BF1", "A00");
  const educationA00 = getHustThptCombinationConfig("ED2", "A00");

  assert.equal(engineeringA00?.isMainSubjectDoubled, true);
  assert.equal(engineeringA00?.mainSubjectCoefficient, 2);
  assert.equal(educationA00?.isMainSubjectDoubled, false);
  assert.equal(educationA00?.mainSubjectCoefficient, 1);
});

test("HUST calculator applies coefficient 2 only when config marks it", () => {
  const doubledResult = calculateHustThptScore({
    schoolCode: "HUST",
    method: "THPT",
    year: 2026,
    payload: {
      programCode: "BF1",
      combinationCode: "A00",
      scores: {
        math: 10,
        physics: 0,
        chemistry: 0,
      },
    },
  });
  const normalResult = calculateHustThptScore({
    schoolCode: "HUST",
    method: "THPT",
    year: 2026,
    payload: {
      programCode: "ED2",
      combinationCode: "A00",
      scores: {
        math: 10,
        physics: 0,
        chemistry: 0,
      },
    },
  });

  assert.equal(doubledResult.normalizedScore30, 15);
  assert.equal(normalResult.normalizedScore30, 10);
});

test("HUST K01 is not automatically rendered as bold", () => {
  const combination = getHustThptCombinationConfig("BF1", "K01");
  assert.ok(combination);
  assert.equal(combination.isMainSubjectDoubled, false);

  const html = renderToStaticMarkup(
    createElement(HustThptCombinationCode, { combination }),
  );

  assert.match(html, /^<span/);
  assert.match(html, />K01<\/span>$/);
});

test("HUST THPT benchmark lookup works across every supported 2026 program combination", () => {
  for (const program of HUST_ADMISSION_PROGRAMS_2026) {
    for (const combination of program.thptCombinations) {
      const scores = combination.subjects.reduce<Partial<Record<HustSubjectKey, number>>>(
        (next, subject) => {
          if (combination.formulaType === "K01") {
            if (subject === "math" || subject === "literature" || subject === "physics") {
              next[subject] = subjectScoreFixture[subject];
            }
            return next;
          }

          next[subject] = subjectScoreFixture[subject];
          return next;
        },
        {},
      );
      const result = calculateHustThptScore({
        schoolCode: "HUST",
        method: "THPT",
        year: 2026,
        payload: {
          programCode: program.code,
          combinationCode: combination.combinationCode,
          scores,
          priorityScore: 0,
        },
      });
      const benchmark = findBenchmarkForProgram({
        schoolCode: "HUST",
        programs: [],
        benchmarks: [
          createBenchmarkRow({
            programCode: program.code,
            methodCode: "THPT",
            combinationCode: combination.combinationCode,
            score: 20,
          }),
        ],
        programCode: program.code,
        method: "THPT",
        combinationCode: combination.combinationCode,
        benchmarkYear: 2025,
      });
      const comparison = compareHustScoreWithPreviousCutoff({
        year: 2026,
        benchmarkYear: 2025,
        programCode: program.code,
        method: "THPT",
        combinationCode: combination.combinationCode,
        score: result.normalizedScore30,
        previousYearCutoff: benchmark?.score ?? null,
      });

      assert.notEqual(
        comparison.status,
        "missing_cutoff",
        `${program.code}/${combination.combinationCode} should compare with benchmark table row`,
      );
    }
  }
});

test("HUST TSA and XTTN benchmark lookup works across every 2026 program", () => {
  for (const program of HUST_ADMISSION_PROGRAMS_2026) {
    const tsaResult = calculateHustTsaScore({
      schoolCode: "HUST",
      method: "TSA",
      year: 2026,
      payload: {
        tsaScore: 75,
      },
    });
    const tsaBenchmark = findBenchmarkForProgram({
      schoolCode: "HUST",
      programs: [],
      benchmarks: [
        createBenchmarkRow({
          programCode: program.code,
          methodCode: "TSA",
          combinationCode: null,
          score: 70,
          scale: 100,
        }),
      ],
      programCode: program.code,
      method: "TSA",
      benchmarkYear: 2025,
    });
    const tsaComparison = compareHustScoreWithPreviousCutoff({
      year: 2026,
      benchmarkYear: 2025,
      programCode: program.code,
      method: "TSA",
      score: tsaResult.originalScore,
      previousYearCutoff: tsaBenchmark?.score ?? null,
    });

    assert.notEqual(
      tsaComparison.status,
      "missing_cutoff",
      `${program.code}/TSA should compare with benchmark table row`,
    );

    const xttnResult = calculateHustXttnScore({
      schoolCode: "HUST",
      method: "XTTN",
      year: 2026,
      payload: {
        subtype: "portfolio_interview",
        tsaScore: 45,
        achievementScore: 35,
        bonusScoreManual: 3,
      },
    });
    const xttnBenchmark = findBenchmarkForProgram({
      schoolCode: "HUST",
      programs: [],
      benchmarks: [
        createBenchmarkRow({
          programCode: program.code,
          methodCode: "XTTN",
          combinationCode: null,
          score: 60,
          scale: 100,
        }),
      ],
      programCode: program.code,
      method: "XTTN",
      benchmarkYear: 2025,
    });
    const xttnComparison = compareHustScoreWithPreviousCutoff({
      year: 2026,
      benchmarkYear: 2025,
      programCode: program.code,
      method: "XTTN",
      score: xttnResult.originalScore,
      previousYearCutoff: xttnBenchmark?.score ?? null,
    });

    assert.notEqual(
      xttnComparison.status,
      "missing_cutoff",
      `${program.code}/XTTN should compare with benchmark table row`,
    );
  }
});

test("HUST TSA comparison covers above, equal, below, and missing cutoff", () => {
  const aboveComparison = compareHustScoreWithPreviousCutoff({
    year: 2026,
    programCode: "IT1",
    method: "TSA",
    score: 27,
    previousYearCutoff: 26,
  });

  assert.equal(aboveComparison.status, "above");
  assert.equal(aboveComparison.benchmarkYear, 2025);
  assert.equal(
    compareHustScoreWithPreviousCutoff({
      year: 2026,
      programCode: "IT1",
      method: "TSA",
      score: 26,
      previousYearCutoff: 26,
    }).status,
    "equal",
  );
  assert.equal(
    compareHustScoreWithPreviousCutoff({
      year: 2026,
      programCode: "IT1",
      method: "TSA",
      score: 25,
      previousYearCutoff: 26,
    }).status,
    "below",
  );
  assert.equal(
    compareHustScoreWithPreviousCutoff({
      year: 2026,
      programCode: "IT1",
      method: "TSA",
      score: 25,
      previousYearCutoff: null,
    }).status,
    "missing_cutoff",
  );
});

test("HUST XTTN portfolio formula clamps components and total score", () => {
  const result = calculateHustXttnScore({
    schoolCode: "HUST",
    method: "XTTN",
    year: 2026,
    payload: {
      subtype: "portfolio_interview",
      tsaScore: 90,
      achievementScore: 70,
      bonusScore: 15,
    },
  });

  assert.equal(result.originalScore, 100);
  assert.equal(result.normalizedScore30, 30);
  assert.equal(result.details?.thinkingScore, 40);
  assert.equal(result.details?.achievementScore, 50);
  assert.equal(result.details?.bonusScore, 10);
});

test("HUST XTTN clamps manual, language certificate, and other bonus to max 10", () => {
  const result = calculateHustXttnScore({
    schoolCode: "HUST",
    method: "XTTN",
    year: 2026,
    payload: {
      subtype: "portfolio_interview",
      tsaScore: 45,
      achievementScore: 40,
      bonusScoreManual: 8,
      otherBonus: 2,
      languageCertificate: {
        certificateType: "IELTS_ACADEMIC",
        score: 7.5,
      },
    },
  });

  assert.equal(result.details?.languageCertificateBonus, 5);
  assert.equal(result.details?.bonusScoreManual, 8);
  assert.equal(result.details?.otherBonus, 2);
  assert.equal(result.details?.bonusScore, 10);
});

test("HUST THPT validation rejects invalid subject score", () => {
  assert.throws(
    () =>
      calculateHustThptScore({
        schoolCode: "HUST",
        method: "THPT",
        year: 2026,
        payload: {
          programCode: "BF1",
          combinationCode: "A00",
          scores: {
            math: 11,
            physics: 9,
            chemistry: 7,
          },
        },
      }),
    /0 đến 10/,
  );
});

test("HUST THPT validation rejects unsupported program combination", () => {
  assert.throws(
    () =>
      calculateHustThptScore({
        schoolCode: "HUST",
        method: "THPT",
        year: 2026,
        payload: {
          programCode: "BF1",
          combinationCode: "D01",
          scores: {
            math: 8,
            literature: 8,
            english: 8,
          },
        },
      }),
    /không hỗ trợ tổ hợp/,
  );
});
