# @adexdsamson/forge-validation

Opt-in validation strategy companion package for [`@adexdsamson/forge`](https://github.com/adexdsamson/Forge).

> **Status:** M3 — built-in strategies + `<ForgeSubmit>` on web *and* React Native. On RN, `asChild` injects `disabled`, `accessibilityState.disabled`, and `enabled` together — so RN core `Pressable`, `react-native-gesture-handler`'s `Pressable`, and screen-reader semantics all stay in sync. Each prop OR-merges with the child's existing value. Debounced async validation (M4) and docs (M5) remain. Tracking: [adexdsamson/Forge#5](https://github.com/adexdsamson/Forge/issues/5).

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
