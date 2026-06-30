# SSR contract

`@adexdsamson/forge-validation` is designed to survive server-rendering + client-hydration without the typical "form briefly disabled / briefly invalid / briefly errored" flicker. The rules below are what makes that work. **Strategies that violate them will hydrate inconsistently** — keep them in mind when writing custom predicates.

## The four rules

### 1. Strategies are pure of form state

`canSubmit`, `shouldShowError`, and `shouldValidate` must be deterministic functions of the `ForgeState` / `FieldState` argument they receive. They may read:

- `state.errors`
- `state.touched`
- `state.dirty`
- `state.isValidating`
- `state.isSubmitting`
- `state.submitCount`
- `state.values`
- `field.error` / `field.isTouched` / `field.isDirty` / `field.isValidating`

That's the whole surface. Anything else is out of bounds — see rule 3.

### 2. `isValidating` may flip on first client tick

Async validators only run client-side. On the server, `isValidating` is always `false` for every field, so a `strict` strategy returns the same `canSubmit` boolean on both sides. As soon as async resolvers spin up after hydration, `isValidating` flips to `true` for whichever fields are validating.

That flip is fine — the **disabled boolean stays stable** in the cases that matter (no field has *resolved* on either side, so neither side disables for a resolved error), so there's no hydration mismatch in the strict sense.

What *can* flicker visually: the rendered `<button>`'s `aria-busy` or "validating…" affordances. Strategies that branch on `isValidating` should expect a one-tick transition. **Don't** key your `disabled` boolean off `isValidating` alone — combine it with `state.errors` or `state.submitCount` so the transition doesn't change the disabled state.

### 3. Hints are client-only by design

Components that render "Username is required" / "Validating…" / "Looks good!" UI **must gate rendering on a `useEffect`** so they pre-render `null`:

```tsx
function ValidationHint({ message }: { message: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <span role="status">{message}</span>;
}
```

This is the conventional React pattern for any post-hydration-only UI (loading skeletons, time-since strings, theme-aware colors). The same applies to anything that surfaces async validation state.

The companion package itself follows this rule — `useForgeValidation()` returns the resolved strategy from context, but it's *your* component that decides whether to render hints.

### 4. Hard rule — no storage in strategies

**Strategy predicates must not read `localStorage`, `sessionStorage`, `IndexedDB`, cookies, or any global mutable state.** This is non-negotiable. Two reasons:

1. **Hydration safety.** Server doesn't have any of those. A strategy that reads `localStorage.lastSubmittedAt` returns one value on the server (undefined / null / throws) and a different value on the client — causing either an SSR exception or a hydration mismatch warning, depending on the framework.
2. **Predictability.** Strategies are functions of `ForgeState`. Side-channel reads make them opaque to anyone reading the source. If `progressive` actually consulted `sessionStorage`, you couldn't trust the [strategy table in the README](../README.md) at all.

If you need persistence in your validation logic, **wire it into your `canSubmit` override**, not into the strategy itself:

```tsx
function MyForm() {
  const [lastSubmittedAt, setLastSubmittedAt] = useState<number | null>(null);

  useEffect(() => {
    setLastSubmittedAt(Number(localStorage.getItem("lastSubmittedAt")) || null);
  }, []);

  const strategy = useMemo(
    () => ({
      ...strategies.progressive,
      canSubmit: (state) => {
        if (lastSubmittedAt && Date.now() - lastSubmittedAt < 5000) return false;
        return strategies.progressive.canSubmit(state);
      },
    }),
    [lastSubmittedAt]
  );

  return <ForgeValidation strategy={strategy}>...</ForgeValidation>;
}
```

The `useEffect` keeps `lastSubmittedAt` `null` on the server and the first render, and the strategy is a pure function of `(state, lastSubmittedAt)` from the component's perspective — both predictable.

## `createAsyncValidator` on SSR

Async validators never run server-side — `useForm()`'s submit / validate flow only triggers on user interaction. So `createAsyncValidator`'s `setTimeout` / `AbortController` machinery isolates to the client side automatically. No SSR consideration here.

But: **don't call your async validator from a strategy's `canSubmit`**. Strategies are pure (rule 1). Async validation belongs in RHF's `validate` option, plumbed through `createAsyncValidator`.

## What about `<ForgeSubmit>`?

`<ForgeSubmit>` is itself SSR-safe — it renders a stable `<button>` (or cloned child) with a `disabled` value derived from the strategy. As long as your strategy follows rules 1–4, the rendered HTML is identical on both sides.

The only exception: if you're using `useFormState({ control })` in custom code beneath `<ForgeSubmit>`, RHF's internals subscribe to client-only state. That's RHF's problem, not this package's — and RHF v7 handles SSR cleanly.

## TL;DR

| Rule | Verb |
|---|---|
| 1. Pure of state | **Must** |
| 2. `isValidating` flips OK | **Expected** |
| 3. Hints behind `useEffect` | **Must** |
| 4. No storage in strategies | **Must** |

Follow these, and `forge-validation` hydrates without flicker. Ignore them, and you'll get either silent UX bugs (rule 1) or hydration warnings (rule 4).
