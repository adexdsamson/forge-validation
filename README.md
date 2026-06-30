# @adexdsamson/forge-validation

Opt-in validation strategy companion package for [`@adexdsamson/forge`](https://github.com/adexdsamson/Forge).

> **Status:** M1 — built-in strategies (`progressive`, `lenient`, `strict`, `standard`) are implemented as predicate objects and `<ForgeValidation strategy="...">` resolves string sugar. `<ForgeSubmit>` (M2/M3) and debounced async validation (M4) are not yet implemented. Tracking: [adexdsamson/Forge#5](https://github.com/adexdsamson/Forge/issues/5).

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
