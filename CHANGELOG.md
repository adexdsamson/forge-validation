# Changelog

All notable changes to `@adexdsamson/forge-validation` are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-06-30

Initial public release. Implements the design agreed in [`adexdsamson/Forge#5`](https://github.com/adexdsamson/Forge/issues/5).

### Added

- **`<ForgeValidation>` provider** — accepts either a `StrategyName` string (`"progressive"`, `"standard"`, `"strict"`, `"lenient"`) or a fully-specified `Strategy` predicate object. Resolves to a `Strategy` exposed via `useForgeValidation()` context.
- **Four built-in strategies** (`strategies.progressive`, `.standard`, `.strict`, `.lenient`) as plain predicate objects. Each is overridable by spreading: `{ ...strategies.progressive, canSubmit: myFn }`.
- **`<ForgeSubmit>` component** — submit gating that reads `canSubmit` from the active strategy. Three render shapes:
  - Default: internal `<button type="submit">`.
  - `asChild`: clones the child and injects `type="submit"` + OR-merged `disabled` on web; OR-merged `disabled` + `accessibilityState.disabled` + `enabled={!disabled}` on React Native.
  - Render-prop: `{({ disabled, type }) => ReactNode}` for composition cases the cloneElement path can't reach.
- **`createAsyncValidator(fn, opts)`** — wraps an `AsyncValidator` so RHF gets back a debounced, abort-aware function. Behavior:
  - Settles the previously outstanding outer Promise with `undefined` on each new call (RHF-contract-safe).
  - Threads `ctx.signal` (an `AbortSignal`) into the inner validator. Network validators are expected to forward this to `fetch` / `axios`.
  - Aborts the in-flight `AbortController` when a new trigger fires.
  - Swallows `AbortError` thrown by the inner validator.
  - Surfaces non-abort throws as a string message (`err.message` if `Error`, else `"Validation failed"`); logs the original in dev mode.
  - Generation counter drops stale resolutions from validators that ignore `ctx.signal`; emits a dev-mode warning instructing the author to forward the signal.
- **Public types** — `Strategy<TValues>`, `StrategyName`, `ForgeState<TValues>`, `FieldState`, `ValidationTrigger`, `AsyncValidator<TValue>`, `ForgeSubmitProps`, `ForgeSubmitRenderProps`, `CreateAsyncValidatorOptions`, `DebouncedValidator`, `ForgeValidationProps`, `ForgeValidationContextValue`.
- **Documentation** — comprehensive README plus `docs/SSR.md` (the four hydration-safety rules) and `docs/REACT_NATIVE.md` (triple-prop composition + OR-merge guide).

### Design constraints

- Strategies are **pure of form state**. No `localStorage` / `sessionStorage` / `IndexedDB` / cookie reads inside predicates — these break SSR.
- Cross-field validation belongs in the resolver layer (Zod, Yup, etc.), not in field-level async validators.

### Known follow-up items

- `data-forge-submit` attribute escape hatch (deferred from M2 — `asChild` + render-prop cover the realistic cases).
- Migration guide from a private validation fork (deferred from M5 until a representative private API is on hand).
- Optional higher-level `<ForgeFieldHints>` component (RFC open question — primitives shipped, wrapper TBD).
