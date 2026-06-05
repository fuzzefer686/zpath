import assert from "node:assert/strict";
import { validateFTUEligibility } from "@/src/lib/admission";
import { createFTUInput } from "./ftuTestHelpers";

const invalidHsa = validateFTUEligibility(
  createFTUInput({
    method: "DOMESTIC_ASSESSMENT",
    programGroup: "STANDARD_INTEGRATED",
    assessment: {
      examType: "HSA",
      examScore: 95,
    },
  }),
);

assert.equal(invalidHsa.eligibilityStatus, "ineligible");
assert.ok(
  invalidHsa.warnings.some((warning) => warning.includes("HSA")),
  "HSA threshold warning is expected",
);

const unsupportedTsa = validateFTUEligibility(
  createFTUInput({
    method: "DOMESTIC_ASSESSMENT",
    programGroup: "STANDARD_INTEGRATED",
    assessment: {
      examType: "TSA",
      examScore: 85,
    },
  }),
);

assert.equal(unsupportedTsa.eligibilityStatus, "unknown");

console.log("ftuEligibility.test.ts passed");
