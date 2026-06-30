# @adexdsamson/forge-validation

Opt-in validation strategy companion package for [`@adexdsamson/forge`](https://github.com/adexdsamson/Forge). Wraps RHF's validation surface with three concrete pieces:

- **Strategies** — `progressive`, `lenient`, `strict`, `standard` as plain predicate objects. Override one predicate by spreading.
- **`<ForgeSubmit>`** — submit gating that reads `canSubmit` from the active strategy. Web + React Native. `asChild`, render-prop, or default `<button>`.
- **`createAsyncValidator()`** — debounced async field validation with `AbortSignal` threading, `AbortError` swallow, and a generation-counter guard for validators that ignore the signal.

> **Status:** Stable surface, all five engineering milestones merged (M0–M4). Implementation tracked in [`adexdsamson/Forge#5`](https://github.com/adexdsamson/Forge/issues/5).

## Install

```bash
npm install @adexdsamson/forge-validation
```

Peer dependencies:

```bash
npm install @adexdsamson/forge react react-hook-form
```

Minimum versions: `@adexdsamson/forge` `>= 1.1.0`, `react` `>= 18`, `react-hook-form` `^7.34.0`.

## Quickstart

```tsx
import { useForge, Forge, Forger } from "@adexdsamson/forge";
import {
  ForgeValidation,
  ForgeSubmit,
  createAsyncValidator,
} from "@adexdsamson/forge-validation";

const checkUsername = createAsyncValidator(
  async (value, ctx) => {
    const res = await fetch(`/api/check?name=${value}`, { signal: ctx.signal });
    const data = await res.json();
    return data.available ? undefined : "Username already taken";
  },
  { debounceMs: 400, field: "username" }
);

function SignUpForm() {
  const { control } = useForge({ defaultValues: { username: "", password: "" } });

  return (
    <ForgeValidation strategy="progressive">
      <Forge control={control} onSubmit={(data) => console.log(data)}>
        <Forger
          name="username"
          component={TextInput}
          rules={{ required: "Username is required", validate: checkUsername }}
        />
        <Forger
          name="password"
          component={TextInput}
          rules={{ required: "Password is required", minLength: 8 }}
        />
        <ForgeSubmit asChild>
          <Button>Sign up</Button>
        </ForgeSubmit>
      </Forge>
    </ForgeValidation>
  );
}
```

The four pieces:

1. **`strategy="progressive"`** — submit is enabled until a *touched* field has an error. Errors only render after the user has blurred the field.
2. **`createAsyncValidator(fn, opts)`** — wraps your async check with debouncing (400ms here) and abort-on-new-keystroke. The `ctx.signal` is threaded into your `fetch` call so cancelled requests don't hit your backend twice.
3. **`<ForgeSubmit asChild>`** — clones `<Button>` and injects `type="submit"` + a `disabled` value derived from the strategy's `canSubmit`. Web-only here; the same component works on React Native — see [`docs/REACT_NATIVE.md`](./docs/REACT_NATIVE.md).
4. **`Forge` / `Forger` / `useForge`** — the core package. This companion doesn't reinvent any of that.

## API

### `<ForgeValidation>`

Provider that exposes a resolved `Strategy` to descendants.

```tsx
<ForgeValidation strategy={"progressive" | "lenient" | "strict" | "standard"}>
  {children}
</ForgeValidation>

// or with a fully-specified Strategy object
<ForgeValidation strategy={strategies.progressive}>{children}</ForgeValidation>

// or with an override
<ForgeValidation strategy={{
  ...strategies.progressive,
  canSubmit: (state) => state.errors.email === undefined,
}}>
  {children}
</ForgeValidation>
```

| Prop | Type | Default |
|---|---|---|
| `strategy` | `StrategyName \| Strategy \| undefined` | `undefined` (no gating) |
| `children` | `ReactNode` | required |

### `useForgeValidation()`

```ts
const ctx = useForgeValidation();
// → { strategy: Strategy | null } | null
```

Returns `null` outside a `<ForgeValidation>`. Use this in custom field components if you want to gate error rendering or per-field UI on `ctx.strategy.shouldShowError(...)`.

### `strategies`

Built-in predicate objects. Read the source for exact semantics — no mystery enums.

| Preset | `canSubmit` blocks on | `shouldShowError` after | `shouldValidate` on |
|---|---|---|---|
| `strict` | any error · submitting · in-flight async | error exists | every trigger |
| `standard` | any error · submitting | touch OR submit attempt | blur, submit, manual (no change) |
| `progressive` | error on a *touched* field · submitting | touch | blur, submit, manual + change *only when field already errors* |
| `lenient` | submitting | submit attempt | submit, manual only |

```ts
import { strategies } from "@adexdsamson/forge-validation";

strategies.progressive; // → Strategy object
```

### `<ForgeSubmit>`

Submit gating that reads `canSubmit` from the active strategy.

```tsx
// 1. Default — internal <button type="submit">
<ForgeSubmit>Sign up</ForgeSubmit>

// 2. asChild — clones the child and injects type/disabled (web) or
//    disabled/accessibilityState.disabled/enabled (RN)
<ForgeSubmit asChild>
  <Button isLoading={isPending}>Sign up</Button>
</ForgeSubmit>

// 3. Render-prop — for hairy composition
<ForgeSubmit>
  {({ disabled, type }) => <FancyButton disabled={disabled} type={type} />}
</ForgeSubmit>
```

**Composition rules:**

- `asChild` **OR**s the child's existing `disabled` prop. Never overrides. `<ForgeSubmit asChild><Button disabled={isPending} /></ForgeSubmit>` disables on `isPending || !canSubmit`.
- Same rule for `accessibilityState.disabled` and gesture-handler's `enabled={false}` on React Native — see [`docs/REACT_NATIVE.md`](./docs/REACT_NATIVE.md).
- Outside a `<ForgeValidation>` (or with no strategy), and outside an RHF `<FormProvider>`, submit is never gated — `disabled` defaults to `false`. No throws.

### `createAsyncValidator(fn, opts)`

Wrap an async field validator so RHF gets a debounced, `AbortSignal`-threading function.

```ts
const checkUsername = createAsyncValidator(
  async (value: string, ctx) => {
    const res = await fetch(`/api/check?name=${value}`, { signal: ctx.signal });
    const data = await res.json();
    return data.available ? undefined : "Username already taken";
  },
  { debounceMs: 400, field: "username" }
);

// Plugs into RHF's validate option as-is:
<Forger name="username" rules={{ validate: checkUsername }} ... />
```

`opts.debounceMs` (default `0`) — milliseconds of no-new-trigger to wait before invoking. `0` still aborts in-flight on new triggers.

`opts.field` (default `""`) — field name threaded into `ctx.field`.

**Behavior:**

| Event | Outcome |
|---|---|
| Rapid invocations within debounce window | All but the latest are settled with `undefined`; the latest runs the validator. |
| In-flight `fetch` superseded | `controller.abort()` fires. Caller must forward `ctx.signal`. |
| Inner validator throws `AbortError` | Swallowed. Resolves to `undefined`. |
| Inner validator throws any other error | Surfaced as a string (`err.message` or `"Validation failed"`). Logged in dev mode. |
| Validator ignores `ctx.signal` and resolves anyway after abort | Stale result dropped. Dev-mode warning: *"validator resolved after abort — thread ctx.signal into your fetch call"*. Production silent. |

See [`docs/SSR.md`](./docs/SSR.md) for the constraints on what strategies and async validators may read.

## Documentation

- [SSR contract](./docs/SSR.md) — pure-of-state rules, hydration behavior, hard "no storage in strategies" constraint.
- [React Native composition](./docs/REACT_NATIVE.md) — `<ForgeSubmit asChild>` with RN core `Pressable` vs `react-native-gesture-handler`, OR-merge details.
- *Migration from a private validation fork* — coming once a representative private API surfaces; see RFC §5 of [`adexdsamson/Forge#5`](https://github.com/adexdsamson/Forge/issues/5).

## TypeScript

All exports ship with `.d.ts`. Strategies are generic in `TValues extends FieldValues` — passing your form's value type into `useForge<MyValues>()` propagates to the `Strategy<MyValues>` consumed by `<ForgeValidation>`.

```ts
import type {
  Strategy,
  StrategyName,
  ForgeState,
  FieldState,
  ValidationTrigger,
  AsyncValidator,
} from "@adexdsamson/forge-validation";
```

## License

MIT © adexdsamson
