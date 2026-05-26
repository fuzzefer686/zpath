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
          combinationCode: "A00",
          scores: {
            math: 9,
            physics: 8,
          },
        },
      }),
    'score for required subject "chemistry" is missing',
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
      xttnScore: 90,
      scale: 100,
    },
  });
  assertEqual(xttn.normalizedScore30, 27, "HUST XTTN normalized score");

  const chance = evaluateAdmissionChance(28, 26);
  assertEqual(chance.level, "VERY_HIGH", "Admission chance level");
}

runAdmissionEngineChecks();
console.log("Admission engine checks passed.");
