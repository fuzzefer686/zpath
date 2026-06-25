export {
  validateAdmissionConfig,
  type ConfigValidationResult,
  type GenericAdmissionConfig,
  type GenericMethodConfig,
  type GenericInputField,
  type GenericInputType,
  type GenericFormula,
  type GenericWeightedTerm,
  type GenericCertificateLevel,
  type GenericSelectOption,
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
  applyWeightedCombination,
  convertScale,
  tsaScale,
  satScale,
  convertCertificate,
  applyPriorityAndBonus,
} from "./primitives";
