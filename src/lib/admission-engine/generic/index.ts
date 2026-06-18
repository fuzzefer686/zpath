export {
  validateAdmissionConfig,
  type ConfigValidationResult,
  type GenericAdmissionConfig,
  type GenericMethodConfig,
  type GenericMethodSourceRef,
  type GenericInputField,
  type GenericInputType,
  type GenericFormula,
  type GenericWeightedTerm,
  type GenericCertificateLevel,
  type GenericSelectOption,
  type GenericProgramRef,
  type GenericSubjectCombination,
  type GenericSubjectSlot,
  type GenericBranding,
  type GenericEligibilityRule,
  type GenericPriorityRule,
  type GenericBonusRule,
  type GenericVisibilityRule,
  type GenericMethodUiTemplate,
  type GenericBenchmarkSource,
  type GenericProgramSource,
} from "./config-schema";
export {
  interpretAdmission,
  validateGenericPayload,
  listConfigMethods,
  type GenericAdmissionScoreResult,
  type GenericPayload,
  type GenericPayloadValue,
  type GenericCertificateValue,
  type PayloadValidationResult,
} from "./interpreter";
export {
  compareScoreWithCutoff,
  type ScoreComparisonResult,
  type ScoreComparisonStatus,
} from "./compareScoreWithCutoff";
export {
  evaluateGenericEligibility,
  type GenericEligibilityResult,
} from "./eligibility";
export {
  migrateAdmissionConfig,
  CURRENT_SCHEMA_VERSION,
} from "./migrate-config";
export {
  applyWeightedCombination,
  convertScale,
  tsaScale,
  satScale,
  convertCertificate,
  applyPriorityAndBonus,
  applyMaxOfInputs,
} from "./primitives";
