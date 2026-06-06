import assert from "node:assert/strict";
import test from "node:test";

import { calculateAdmissionScore } from "../../core/engine";
import { InvalidCombinationException } from "./index";
import { roundHalfUp } from "./uet.helpers";
import { computeMethod1Bonus, validateCertificate } from "./uet.validators";

const basePayload = {
  programCode: "CN1",
  combinationCode: "A00",
  aspirationOrder: 1,
  scores: { math: 9, physics: 8, chemistry: 7, english: 6, informatics: 8, biology: 7 },
};

test("UET method 1 takes highest award only and caps at 3.0", () => {
  assert.equal(
    computeMethod1Bonus(
      [
        { name: "A", level: "national", year: 2026, scoreBonus: 1.2, subject: "Toán" },
        { name: "B", level: "national", year: 2026, scoreBonus: 2.5, subject: "Vật lý" },
      ],
      "CN1",
    ),
    2.5,
  );
});

test("UET rejects GDTX provincial awards", () => {
  assert.equal(
    computeMethod1Bonus(
      [{ name: "A", level: "provincial", year: 2026, scoreBonus: 2, subject: "Toán", isGdtx: true }],
      "CN1",
    ),
    0,
  );
});

test("UET method 2.1 calculates THPT scores and exposes normalized details", () => {
  const result = calculateAdmissionScore({
    schoolCode: "UET",
    method: "METHOD_2_1",
    year: 2026,
    payload: basePayload,
  });

  assert.equal(result.originalScore, 24);
  assert.equal(result.normalizedScore30, 24);
  assert.equal(result.formulaUsed, "METHOD_2_1:A00");
  assert.equal(result.details?.programCode, "CN1");
  assert.equal(result.details?.combinationCode, "A00");
  assert.equal(result.details?.baseScore, 24);
  assert.equal(result.details?.bonusScore, 0);
});

test("UET certificate validation rejects online, missing skills, low scores and unsupported type", () => {
  assert.throws(
    () =>
      validateCertificate({
        type: "IELTS",
        online: true,
        testDate: "2026-01-01",
        skills: { listening: 6, reading: 6, writing: 6, speaking: 6 },
      }),
    /online/i,
  );
  assert.throws(
    () =>
      validateCertificate({
        type: "IELTS",
        testDate: "2026-01-01",
        skills: { listening: 6, reading: 6, writing: 6 },
      }),
    /đủ 4 kỹ năng/i,
  );
  assert.throws(
    () =>
      validateCertificate({
        type: "IELTS",
        testDate: "2026-01-01",
        skills: { listening: 4.5, reading: 6, writing: 6, speaking: 6 },
      }),
    /tối thiểu 5.0/i,
  );
});

test("UET method 2.2 and 2.3 require score payloads", () => {
  const hsa = calculateAdmissionScore({
    schoolCode: "UET",
    method: "METHOD_2_2",
    year: 2026,
    payload: {
      ...basePayload,
      hsaScore: 88,
    },
  });
  const sat = calculateAdmissionScore({
    schoolCode: "UET",
    method: "METHOD_2_3",
    year: 2026,
    payload: {
      ...basePayload,
      satScore: 1320,
    },
  });

  assert.equal(hsa.originalScore, 88);
  assert.equal(hsa.details?.scoreType, "HSA");
  assert.equal(sat.originalScore, 1320);
  assert.equal(sat.details?.scoreType, "SAT");
});

test("UET method 2.5 ignores awards when method 1 was used", () => {
  const result = calculateAdmissionScore({
    schoolCode: "UET",
    method: "METHOD_2_5",
    year: 2026,
    payload: {
      ...basePayload,
      usedMethod1: true,
      awards: [
        { name: "A", level: "national", year: 2026, scoreBonus: 1.5, subject: "Toán" },
      ],
    },
  });

  assert.equal(result.originalScore, 0);
  assert.equal(result.details?.usedMethod1, true);
  assert.equal(result.details?.priorityBonus, 0);
});

test("UET rejects A02 outside CN10/CN21", () => {
  assert.throws(
    () =>
      calculateAdmissionScore({
        schoolCode: "UET",
        method: "METHOD_2_1",
        year: 2026,
        payload: {
          ...basePayload,
          programCode: "CN1",
          combinationCode: "A02",
          scores: { math: 9, physics: 8, biology: 7 },
        },
      }),
    InvalidCombinationException,
  );
});

test("UET method 2.6 validates pre-university path and carries threshold config", () => {
  const result = calculateAdmissionScore({
    schoolCode: "UET",
    method: "METHOD_2_6",
    year: 2026,
    payload: {
      ...basePayload,
      preUniversityCompleted: true,
      preUniversityGraduatedYear: 2025,
      thpt2025Score: 27.25,
    },
  });

  assert.equal(result.details?.thresholdYear, 2025);
  const thresholdConfig = result.details?.thresholdConfig as
    | Record<string, string | number>
    | undefined;
  assert.equal(thresholdConfig?.CN10, 22);
  assert.equal(thresholdConfig?.CN14, 24);
});

test("UET rounding half up to 2 decimals", () => {
  assert.equal(roundHalfUp(27.245, 2), 27.25);
});
