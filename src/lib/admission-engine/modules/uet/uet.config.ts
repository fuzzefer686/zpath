import { uetSpec as rawUetSpec } from "./uet.spec";
import type { UetSpec } from "./uet.types";

function assertArray(value: unknown, label: string): asserts value is unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
}

export function parseUetSpec(input: unknown): UetSpec {
  if (typeof input !== "object" || input === null) {
    throw new Error("UET spec must be an object.");
  }
  const spec = input as UetSpec;
  assertArray(spec.admissionMethods, "admission_methods");
  assertArray(spec.programs, "programs");
  assertArray(spec.combinations, "combinations");
  return spec;
}

export const uetSpec = parseUetSpec(rawUetSpec);
