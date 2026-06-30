import type { FieldValues } from "react-hook-form";
import type {
  FieldState,
  ForgeState,
  Strategy,
  StrategyName,
  ValidationTrigger,
} from "./types";

function hasAnyError(state: ForgeState): boolean {
  for (const key in state.errors) {
    if (state.errors[key] !== undefined) return true;
  }
  return false;
}

function hasErrorOnTouchedField(state: ForgeState): boolean {
  for (const key in state.errors) {
    if (state.errors[key] === undefined) continue;
    if (state.fields[key]?.isTouched) return true;
  }
  return false;
}

/**
 * Strict — submit blocks on any error, on submitting, or on in-flight async
 * validation. Errors render the moment they exist (no waiting for touch).
 * Every trigger validates.
 *
 * Use when correctness matters more than typing UX (admin tools, money
 * forms, irreversible actions).
 */
const strict: Strategy = {
  canSubmit: (state) =>
    !hasAnyError(state) && !state.isSubmitting && !state.isValidating,
  shouldShowError: (field) => field.error !== undefined,
  shouldValidate: () => true,
};

/**
 * Standard — RHF-ish defaults. Submit blocks on any error or on submitting
 * (allows in-flight async validation to overlap). Errors render after the
 * field is touched (blurred) or after a submit attempt. Skip change-trigger
 * validation so we don't validate on every keystroke.
 *
 * The recommended default for most forms.
 */
const standard: Strategy = {
  canSubmit: (state) => !hasAnyError(state) && !state.isSubmitting,
  shouldShowError: (field, state) =>
    field.error !== undefined && (field.isTouched || state.submitCount > 0),
  shouldValidate: (_field, trigger) => trigger !== "change",
};

/**
 * Progressive — gentle UX. Submit blocks only when a *touched* field has
 * an error (untouched fields don't block submit until the user actually
 * tries). Errors only render after the field is touched. Once a field is
 * showing an error, change-trigger validation re-runs so the error clears
 * promptly while the user fixes it.
 *
 * Use for sign-up flows and any form where first-time correctness friction
 * is a conversion problem.
 */
const progressive: Strategy = {
  canSubmit: (state) => !hasErrorOnTouchedField(state) && !state.isSubmitting,
  shouldShowError: (field) =>
    field.error !== undefined && field.isTouched,
  shouldValidate: (field, trigger) =>
    trigger !== "change" || field.error !== undefined,
};

/**
 * Lenient — submit is always available unless currently submitting; errors
 * surface only after a submit attempt; fields only validate on submit.
 *
 * Use when the resolver is expensive or async, or when the user should
 * never be blocked from attempting to submit (e.g. retry flows).
 */
const lenient: Strategy = {
  canSubmit: (state) => !state.isSubmitting,
  shouldShowError: (field, state) =>
    field.error !== undefined && state.submitCount > 0,
  shouldValidate: (_field, trigger) =>
    trigger === "submit" || trigger === "manual",
};

/**
 * Built-in validation strategies. Each value is a fully-specified
 * `Strategy` predicate object — read the source to see exactly what
 * `progressive` (or any other preset) does, override one predicate by
 * spreading: `{ ...strategies.progressive, canSubmit: myFn }`.
 */
export const strategies: Record<StrategyName, Strategy> = {
  strict,
  standard,
  progressive,
  lenient,
};

/**
 * Resolve a `strategy` prop value: either a `StrategyName` string sugar
 * (looked up in `strategies`) or a fully-specified `Strategy` value
 * (returned as-is).
 */
export function resolveStrategy<TValues extends FieldValues = FieldValues>(
  value: StrategyName | Strategy<TValues> | undefined
): Strategy<TValues> | null {
  if (value === undefined) return null;
  if (typeof value === "string") {
    return strategies[value] as unknown as Strategy<TValues>;
  }
  return value;
}

export type { Strategy, StrategyName, FieldState, ForgeState, ValidationTrigger };
