import assert from "node:assert/strict";
import test from "node:test";

import type { HustThptCombinationConfig } from "@/src/lib/admission-data/hust-programs-2026";
import type { AdmissionInput } from "../../core/types";
import { compareHustScoreWithPreviousCutoff } from "./compare";
import {
  calculateHustThptScore,
  calculateHustThptSubjectScore,
} from "./hust.thpt";
import { calculateHustXttnScore } from "./hust.xttn";

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
      programCode: "BF1",
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

test("HUST math coefficient 2 formula normalizes back to 30-point scale", () => {
  const combinationConfig: HustThptCombinationConfig = {
    combinationCode: "A00",
    subjects: ["math", "physics", "chemistry"],
    formulaType: "MATH_COEFFICIENT_2",
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

test("HUST TSA comparison covers above, equal, below, and missing cutoff", () => {
  assert.equal(
    compareHustScoreWithPreviousCutoff({
      year: 2026,
      programCode: "IT1",
      method: "TSA",
      score: 27,
      previousYearCutoff: 26,
    }).status,
    "above",
  );
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
