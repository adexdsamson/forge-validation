# @adexdsamson/forge-validation

Opt-in validation strategy companion package for [`@adexdsamson/forge`](https://github.com/adexdsamson/Forge).

> **Status:** M4 — strategies + `<ForgeSubmit>` (web + RN) + `createAsyncValidator()` for debounced, abort-aware async field validation. The wrapper aborts in-flight `AbortController`s on new triggers, swallows `AbortError`, and drops stale resolutions from misbehaving validators with a dev-mode warning. Cross-field validation stays in the resolver layer (Zod/Yup). Only docs (M5) remain. Tracking: [adexdsamson/Forge#5](https://github.com/adexdsamson/Forge/issues/5).

## What this is

Validation strategies that layer on top of Forge core:

- **Strategies** — `progressive`, `lenient`, `strict`, `standard`. Predicate objects you can override per-field.
- **Submit gating** — `<ForgeSubmit>` with `asChild` and render-prop variants; OR-merges existing `disabled`.
- **Debounced async validation** — `AbortSignal`-aware, in-flight cancellation, generation-counter guard.

See the [RFC](https://github.com/adexdsamson/Forge/issues/5) for the full design.

## Install

Not yet published. When it lands:

```bash
npm install @adexdsamson/forge-validation
```

Peer deps: `@adexdsamson/forge >= 1.1.0`, `react >= 18`, `react-hook-form ^7.34.0`.

## License

MIT © adexdsamson
