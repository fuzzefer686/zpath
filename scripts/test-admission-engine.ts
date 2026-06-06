import {
  calculateAdmissionScore,
  evaluateAdmissionChance,
} from "../src/lib/admission-engine";

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
}

function assertThrows(fn: () => unknown, expectedMessage: string, label: string) {
  try {
    fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (!message.includes(expectedMessage)) {
      throw new Error(
        `${label}: expected error containing "${expectedMessage}", received "${message}"`,
      );
    }

    return;
  }

  throw new Error(`${label}: expected function to throw`);
}

function runAdmissionEngineChecks() {
  const thptA00 = calculateAdmissionScore({
    schoolCode: "HUST",
    method: "THPT",
    year: 2025,
    payload: {
      programCode: "ED2",
      combinationCode: "A00",
      scores: {
        math: 9,
        physics: 8,
        chemistry: 7,
      },
      priorityScore: 0.25,
    },
  });
  assertEqual(thptA00.normalizedScore30, 24.25, "HUST THPT A00 normalized score");

  assertThrows(
    () =>
      calculateAdmissionScore({
        schoolCode: "HUST",
        method: "THPT",
        year: 2025,
        payload: {
          programCode: "ED2",
          combinationCode: "A00",
          scores: {
            math: 9,
            physics: 8,
          },
        },
      }),
    "Vui lòng nhập",
    "HUST THPT missing required subject",
  );

  const tsa = calculateAdmissionScore({
    schoolCode: "HUST",
    method: "TSA",
    year: 2025,
    payload: {
      tsaScore: 80,
    },
  });
  assertEqual(tsa.normalizedScore30, 24, "HUST TSA normalized score");

  const xttn = calculateAdmissionScore({
    schoolCode: "HUST",
    method: "XTTN",
    year: 2025,
    payload: {
      subtype: "portfolio_interview",
      tsaScore: 60,
      achievementScore: 50,
      bonusScoreManual: 10,
    },
  });
  assertEqual(xttn.normalizedScore30, 30, "HUST XTTN normalized score");

  const chance = evaluateAdmissionChance(28, 26);
  assertEqual(chance.level, "VERY_HIGH", "Admission chance level");

  const ftuHocBa = calculateAdmissionScore({
    schoolCode: "FTU",
    method: "HOC_BA",
    year: 2026,
    payload: {
      programCode: "NTH.KT.H02",
      combinationCode: "A00",
      scores: { math: 8, physics: 9, chemistry: 7 },
    },
  });
  assertEqual(ftuHocBa.normalizedScore30, 24, "FTU HOC_BA group 1 normalized score");

  const ftuGroup2 = calculateAdmissionScore({
    schoolCode: "FTU",
    method: "DGNL",
    year: 2026,
    payload: { programCode: "NTH.CN.H18", testType: "HSA", testScore: 125 },
  });
  assertEqual(ftuGroup2.originalScore, 38, "FTU DGNL group 2 original score (scale 40)");
  assertEqual(ftuGroup2.normalizedScore30, 28.5, "FTU DGNL group 2 normalized score");

  assertThrows(
    () =>
      calculateAdmissionScore({
        schoolCode: "FTU",
        method: "DGNL",
        year: 2026,
        payload: { programCode: "NTH.KT.H02", testType: "TSA", testScore: 85 },
      }),
    "không xét tuyển bằng",
    "FTU TSA restricted to group 2 programs",
  );
}

runAdmissionEngineChecks();
console.log("Admission engine checks passed.");
