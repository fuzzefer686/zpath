import type { GenericAdmissionConfig } from "./config-schema";

const CURRENT_SCHEMA_VERSION = 2;

/**
 * Upgrades legacy v1 configs to the current schema shape.
 * Safe to call on configs that are already at the latest version.
 */
export function migrateAdmissionConfig(
  raw: GenericAdmissionConfig,
): GenericAdmissionConfig {
  const version = raw.schemaVersion ?? 1;

  if (version >= CURRENT_SCHEMA_VERSION) {
    return { ...raw, schemaVersion: CURRENT_SCHEMA_VERSION };
  }

  let config: GenericAdmissionConfig = {
    ...raw,
    schemaVersion: 1,
    programSource: raw.programSource ?? (raw.programs?.length ? "inline" : "db"),
    benchmarkSource: raw.benchmarkSource ?? "method_default",
    benchmarkYear: raw.benchmarkYear ?? raw.year - 1,
  };

  if (version < 2) {
    config = {
      ...config,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      methods: config.methods.map((method) => ({
        ...method,
        uiTemplate: method.uiTemplate ?? "flat",
      })),
    };
  }

  return config;
}

export { CURRENT_SCHEMA_VERSION };
