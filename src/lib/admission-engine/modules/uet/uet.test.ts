import assert from "node:assert/strict";
import test from "node:test";

import { calculateAdmissionScore } from "../../core/engine";
import { InvalidCombinationException } from "./index";
import { roundHalfUp } from "./uet.helpers";
import { computePriorityBonusFromAwards, validateCertificate } from "./uet.validators";

const basePayload = {
  programCode: "CN1",
  combinationCode: "A00",
  aspirationOrder: 1,
  scores: { math: 9, physics: 8, chemistry: 7, english: 6, informatics: 8, biology: 7 },
};

test("UET priority bonus caps at 1.5 and uses max award only", () => {
  assert.equal(
    computePriorityBonusFromAwards(
      [
        { name: "A", level: "national", year: 2026, scoreBonus: 1.2, subject: "Toán" },
        { name: "B", level: "national", year: 2026, scoreBonus: 2.5, subject: "Vật lý" },
      ],
      "CN1",
    ),
    1.5,
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
  assert.equal(result.details?.thirdSubject, "Hóa");
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

test("UET method 2.2 converts HSA to THPT scale", () => {
  const hsa = calculateAdmissionScore({
    schoolCode: "UET",
    method: "METHOD_2_2",
    year: 2026,
    payload: {
      ...basePayload,
      hsaScore: 88,
    },
  });

  assert.equal(hsa.details?.scoreType, "HSA");
  assert.equal(hsa.details?.rawHsaScore, 88);
  assert.equal(hsa.details?.convertedThptScore, 25.03);
  assert.equal(hsa.normalizedScore30, 25.03);
});

test("UET method 2.3 still passes SAT score through", () => {
  const sat = calculateAdmissionScore({
    schoolCode: "UET",
    method: "METHOD_2_3",
    year: 2026,
    payload: {
      ...basePayload,
      satScore: 1320,
    },
  });

  assert.equal(sat.originalScore, 27.20);
  assert.equal(sat.details?.scoreType, "SAT");
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

test("UET rounding half up to 2 decimals", () => {
  assert.equal(roundHalfUp(27.245, 2), 27.25);
});

test("UET method 2.2 HSA 2024 lookup works", () => {
  const result = calculateAdmissionScore({
    schoolCode: "UET",
    method: "METHOD_2_2",
    year: 2026,
    payload: {
      ...basePayload,
      hsaScore: 88,
      hsaYear: 2024,
    },
  });
  assert.equal(result.normalizedScore30, 25.10);
  assert.equal(result.details?.hsaYear, 2024);
});

test("UET method 2.3 SAT scaling works", () => {
  const result = calculateAdmissionScore({
    schoolCode: "UET",
    method: "METHOD_2_3",
    year: 2026,
    payload: {
      ...basePayload,
      satScore: 1400,
    },
  });
  assert.equal(result.normalizedScore30, 28.00);
});

test("UET method 2.1 THPT adds Provincial HSG priority bonus points", () => {
  const result = calculateAdmissionScore({
    schoolCode: "UET",
    method: "METHOD_2_1",
    year: 2026,
    payload: {
      ...basePayload,
      scores: { math: 9, physics: 8, chemistry: 7 }, // base: 24
      awards: [
        { name: "Provincial Award", level: "provincial", rank: "Nhất", year: 2026, subject: "Toán", scoreBonus: 0 }
      ]
    },
  });
  // auto score bonus should be 2.5, capped at 1.5. Base = 24. Total = 25.5
  assert.equal(result.normalizedScore30, 25.50);
  assert.equal(result.details?.priorityBonus, 1.5);
});

