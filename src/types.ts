import type { FieldValues } from "react-hook-form";

/**
 * Trigger that caused a validation request. Strategies use this to decide
 * whether to validate now or defer (e.g. progressive defers `change` until
 * the field has been touched).
 */
export type ValidationTrigger = "change" | "blur" | "submit" | "manual";

/**
 * Per-field state seen by strategy predicates. Derived from RHF's form state
 * at the point the predicate runs.
 */
export interface FieldState {
  name: string;
  value: unknown;
  isDirty: boolean;
  isTouched: boolean;
  isValidating: boolean;
  error: string | undefined;
}

/**
 * Form-wide state seen by strategy predicates. Mirrors RHF's `FormState`
 * but typed against this package's `FieldState` shape.
 */
export interface ForgeState<TValues extends FieldValues = FieldValues> {
  values: TValues;
  fields: Record<string, FieldState>;
  errors: Record<string, string | undefined>;
  isDirty: boolean;
  isSubmitting: boolean;
  isValidating: boolean;
  submitCount: number;
}

/**
 * A validation strategy is a bundle of three predicates. Each predicate is
 * a pure function of `ForgeState` / `FieldState` — no side effects, no storage
 * reads. See the package README and the RFC (adexdsamson/Forge#5) for the
 * SSR contract.
 */
export interface Strategy<TValues extends FieldValues = FieldValues> {
  canSubmit: (state: ForgeState<TValues>) => boolean;
  shouldShowError: (field: FieldState, state: ForgeState<TValues>) => boolean;
  shouldValidate: (field: FieldState, trigger: ValidationTrigger) => boolean;
}

/**
 * Names of built-in strategies. Used as string sugar for the `strategy` prop
 * on `<ForgeValidation>`; equivalent to passing `strategies.<name>`.
 */
export type StrategyName = "progressive" | "lenient" | "strict" | "standard";

/**
 * Context value exposed by `<ForgeValidation>`. M0 ships an empty shape;
 * later milestones populate `strategy` and validator-control surface.
 */
export interface ForgeValidationContextValue<
  TValues extends FieldValues = FieldValues,
> {
  strategy: Strategy<TValues> | null;
}

/**
 * Async validator signature. Validators making network calls must thread
 * `ctx.signal` into their fetch / axios / etc. call so in-flight requests
 * are cancelled when a new trigger fires. See M4 in the RFC.
 */
export type AsyncValidator<TValue = unknown> = (
  value: TValue,
  ctx: {
    signal: AbortSignal;
    field: string;
    formValues: unknown;
  }
) => Promise<string | undefined>;
