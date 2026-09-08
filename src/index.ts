/**
 * `@rusl-labs/surface-shadcn` — shared, non-visual kit behavior consumed by the
 * registry-installed shadcn wrappers. No DOM, no UI imports; wrappers bring the
 * app's local shadcn components and compose these headless primitives.
 */
export { SHADCN_KIT_ID, SHADCN_TEXTAREA_ID } from "./constants";
export { isRecord } from "./is-record";
export { seedValue } from "./seed-value";
export { FieldScope, type FieldScopeProps } from "./field-scope";
export { useFieldState, type FieldState } from "./use-field-state";
export { useFormActions, type FormActions } from "./use-form-actions";
