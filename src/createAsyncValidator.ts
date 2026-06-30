import type { AsyncValidator } from "./types";

export interface CreateAsyncValidatorOptions {
  /**
   * Milliseconds of no-new-trigger to wait before invoking the validator.
   * `0` (the default) still aborts in-flight controllers on new triggers
   * but runs the validator on the next tick.
   */
  debounceMs?: number;
  /**
   * Field name to thread into `ctx.field`. Optional — defaults to an empty
   * string. Pass the same field name you use in `register(...)` so consumers
   * who read `ctx.field` in their validator can route by it.
   */
  field?: string;
}

/**
 * RHF-compatible validate function — `(value, formValues) => Promise<...>`.
 * The return value follows RHF's validate contract: `undefined` for "valid",
 * a string for the error message.
 */
export type DebouncedValidator = (
  value: unknown,
  formValues?: unknown
) => Promise<string | undefined>;

/**
 * Wrap an `AsyncValidator` so RHF gets a debounced, abort-aware function.
 *
 * Each invocation:
 * 1. Settles the previous in-flight outer Promise with `undefined` (so RHF's
 *    `validate` contract never sees a hanging Promise).
 * 2. Cancels any pending debounce timer.
 * 3. Aborts the in-flight `AbortController` from the previous run.
 * 4. Bumps a generation counter.
 * 5. After `debounceMs`, fires the validator with a fresh `AbortController`.
 *
 * **Abort policy:**
 * - Cancelled invocations resolve to `undefined` — RHF treats this as
 *   "not invalid right now." The validator is expected to thread
 *   `ctx.signal` into its fetch / axios call so the underlying network
 *   request is cancelled too.
 * - `AbortError` thrown by `fetch` is swallowed; never surfaces as a
 *   validation failure.
 * - Non-abort errors thrown by the validator are surfaced to RHF as a
 *   string error message (`err.message` if `err` is an `Error`, otherwise
 *   `"Validation failed"`), with the original error logged in dev mode.
 *   The wrapper never rejects the outer Promise — RHF's `validate`
 *   contract is "resolve with `undefined` | `string` | `boolean`", and
 *   we stay inside it. Wrap your validator with your own try/catch if you
 *   want a custom error message.
 * - The generation counter is a belt-and-braces guard. If a misbehaving
 *   validator ignores the signal and resolves anyway *after* it was
 *   superseded, the stale result is dropped and a dev-mode warning is
 *   emitted ("validator resolved after abort — thread ctx.signal into your
 *   fetch call"). Production builds emit no warning.
 *
 * **Cross-field validation** is explicitly out of scope. If your validator
 * depends on other fields, express that in your resolver (Zod, Yup, etc.)
 * rather than as a field-level async validator — see RFC §5.
 */
export function createAsyncValidator<TValue = unknown>(
  fn: AsyncValidator<TValue>,
  opts: CreateAsyncValidatorOptions = {}
): DebouncedValidator {
  const debounceMs = opts.debounceMs ?? 0;
  const field = opts.field ?? "";

  let pendingResolve: ((value: string | undefined) => void) | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;
  let generation = 0;

  return function debouncedValidator(value, formValues) {
    // Settle the previously outstanding outer Promise (if any) with undefined.
    // RHF saw the previous call return a Promise; it must resolve eventually.
    // "Superseded by a new trigger" means we report no-error-for-now and let
    // the latest call produce the actual verdict.
    if (pendingResolve !== null) {
      pendingResolve(undefined);
      pendingResolve = null;
    }
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (controller !== null) {
      controller.abort();
      controller = null;
    }
    generation += 1;
    const myGen = generation;

    return new Promise<string | undefined>((resolve) => {
      pendingResolve = resolve;
      timer = setTimeout(() => {
        timer = null;
        const myController = new AbortController();
        controller = myController;
        void (async () => {
          try {
            const result = await fn(value as TValue, {
              signal: myController.signal,
              field,
              formValues,
            });
            if (myGen !== generation) {
              if (isDevMode()) {
                console.warn(
                  "[forge-validation] async validator resolved after abort — thread ctx.signal into your fetch call so in-flight requests are cancelled too."
                );
              }
              return;
            }
            if (controller === myController) controller = null;
            pendingResolve = null;
            resolve(result);
          } catch (err) {
            if (isAbortError(err)) return;
            if (myGen !== generation) return;
            if (controller === myController) controller = null;
            pendingResolve = null;
            if (isDevMode()) {
              console.error("[forge-validation] async validator threw:", err);
            }
            resolve(err instanceof Error ? err.message : "Validation failed");
          }
        })();
      }, debounceMs);
    });
  };
}

function isDevMode(): boolean {
  const g = globalThis as { process?: { env?: { NODE_ENV?: string } } };
  return g.process?.env?.NODE_ENV !== "production";
}

function isAbortError(err: unknown): boolean {
  if (err instanceof Error && err.name === "AbortError") return true;
  if (
    typeof DOMException !== "undefined" &&
    err instanceof DOMException &&
    err.name === "AbortError"
  ) {
    return true;
  }
  return false;
}
