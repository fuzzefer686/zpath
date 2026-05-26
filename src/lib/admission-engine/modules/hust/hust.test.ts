import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  getHustThptCombinationConfig,
  type HustThptCombinationConfig,
} from "@/src/lib/admission-data/hust-programs-2026";
import { findHustBenchmark2025 } from "@/src/lib/admission-data/hust-benchmarks-2025";
import { HustThptCombinationCode } from "@/src/components/admission/HustThptCombinationCode";
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
import { calculateHustXttnScore } from "./hust.xttn";

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

test("HUST IT2 A01 can compare against 2025 benchmark fallback", () => {
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
  const benchmark = findHustBenchmark2025({
    programCode: "IT2",
    method: "THPT",
    combinationCode: "A01",
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
