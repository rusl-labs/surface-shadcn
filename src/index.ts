/**
 * `@rusl-labs/surface-shadcn` — shared, non-visual kit behavior consumed by the
 * registry-installed shadcn wrappers. No DOM, no UI imports; wrappers bring the
 * app's local shadcn components and compose these headless primitives.
 */
export * from "./constants";
export { isRecord } from "./is-record";
export { resolveMediaImage, type ResolvedMediaImage } from "./media";
export { seedValue } from "./seed-value";
export { FieldScope, type FieldScopeProps } from "./field-scope";
export { useFieldState, type FieldState } from "./use-field-state";
export { useFormActions, type FormActions } from "./use-form-actions";
export {
  SurfaceProvider,
  useSurfaceDefaults,
  type SurfaceDefaults,
} from "./surface-provider";
export { FormDraftScope, useDraftField, useFormDrafts } from "./form-drafts";
export { shadcnSchemas } from "./schemas";
export {
  formatCode,
  isObjectWire,
  isOpenMap,
  parseCode,
  type CodeParseResult,
} from "./code-value";
export {
  interpretPhoneDraft,
  parsePhoneValue,
  phoneCountryName,
  phoneCountryOptions,
  phoneFlagEmoji,
  resolvePhoneCountry,
  type CountryCode,
  type PhoneCountryOption,
  type PhoneInterpretation,
  type PhoneValueParts,
} from "./phone";
export {
  currencyUnit,
  currencySymbol,
  formatMinor,
  minorToEditString,
  parseMajorToMinor,
  readMoneyParts,
  type CurrencyUnit,
  type MoneyParts,
  type ParseAmountResult,
} from "./money";
