# React Native composition guide

`<ForgeSubmit>` works on React Native via `asChild`. The same package, the same strategies, the same `createAsyncValidator` — but the cloned-child prop injection branches at runtime so RN core `Pressable`, `react-native-gesture-handler`'s `Pressable`, and screen-reader semantics all stay in sync.

## What gets injected

On React Native, `<ForgeSubmit asChild>` injects **three props** onto the cloned child:

| Prop | Consumed by |
|---|---|
| `disabled` | RN core `Pressable` (`<Pressable disabled />`) |
| `accessibilityState.disabled` | Screen readers (both libs read this) |
| `enabled={!disabled}` | `react-native-gesture-handler`'s `Pressable` |

The child component picks up whichever prop it understands and ignores the rest. All three carry the **same boolean** — the strategy's `!canSubmit(state)`, OR-merged with the child's existing values.

## Examples

### RN core `Pressable`

```tsx
import { Pressable, Text } from "react-native";
import { ForgeValidation, ForgeSubmit } from "@adexdsamson/forge-validation";

function SignUpForm() {
  return (
    <ForgeValidation strategy="progressive">
      {/* Forge / Forger / etc. */}
      <ForgeSubmit asChild>
        <Pressable onPress={handleSubmit}>
          <Text>Sign up</Text>
        </Pressable>
      </ForgeSubmit>
    </ForgeValidation>
  );
}
```

RN core `Pressable` reads `disabled` and `accessibilityState.disabled`. Both get set. `enabled` is ignored by core Pressable.

### `react-native-gesture-handler` `Pressable`

```tsx
import { Pressable } from "react-native-gesture-handler";
import { ForgeValidation, ForgeSubmit } from "@adexdsamson/forge-validation";

<ForgeValidation strategy="progressive">
  <ForgeSubmit asChild>
    <Pressable onPress={handleSubmit}>
      <Text>Sign up</Text>
    </Pressable>
  </ForgeSubmit>
</ForgeValidation>
```

Gesture-handler's `Pressable` reads `enabled` (the *inverse* of disabled). It also honors `accessibilityState.disabled` for accessibility. `disabled` is ignored by this lib.

### Render-prop for unhandled cases

If you've got a custom gesture handler, an animated component, or anything `cloneElement` can't reach cleanly, drop down to the render-prop:

```tsx
import { Animated } from "react-native";

<ForgeSubmit>
  {({ disabled }) => (
    <Animated.View style={{ opacity: disabled ? 0.5 : 1 }}>
      <Pressable
        onPress={handleSubmit}
        disabled={disabled}
        accessibilityState={{ disabled }}
      >
        <Text>Sign up</Text>
      </Pressable>
    </Animated.View>
  )}
</ForgeSubmit>
```

You're responsible for wiring `disabled` into whichever props your component needs. The render-prop's `type: "submit"` field is web-only — ignore it on RN.

## OR-merge semantics

The injected `disabled` is **never** an override — it's OR'd with whatever the child already had. Three OR-merge channels are checked in order:

1. **`disabled`** on the child → contributes to the final disabled state.
2. **`accessibilityState.disabled`** on the child → contributes.
3. **`enabled={false}`** on the child (gesture-handler style) → contributes.

If any of these is truthy AND the strategy says `canSubmit === true`, the child stays disabled. The strategy's no-vote becomes a yes-vote only when nothing else is voting no.

```tsx
// All three of these are disabled when isPending is true,
// even if the strategy's canSubmit returns true.

<ForgeSubmit asChild><Pressable disabled={isPending}>...</Pressable></ForgeSubmit>
<ForgeSubmit asChild><Pressable accessibilityState={{ disabled: isPending }}>...</Pressable></ForgeSubmit>
<ForgeSubmit asChild><Pressable enabled={!isPending}>...</Pressable></ForgeSubmit>
```

Other keys in `accessibilityState` are preserved through spread. `accessibilityState={{ busy: true, selected: false }}` survives unchanged, with `disabled` merged on top.

## What's not on RN

**Default mode (`<ForgeSubmit>text</ForgeSubmit>` with no `asChild`)** renders an internal `<button>`. React Native treats `<button>` as an unhandled intrinsic — you'll see a clear error. Use `asChild` or the render-prop on RN.

**The render-prop's `type` field** is HTML-specific. On RN it has no meaning. Strip it from your destructure if you only care about `disabled`:

```tsx
<ForgeSubmit>
  {({ disabled }) => <Pressable disabled={disabled}>...</Pressable>}
</ForgeSubmit>
```

## Platform detection

`<ForgeSubmit>` calls an internal `isReactNative()` function on every render — cheap, no module-level constant. The detection is the conventional `navigator.product === "ReactNative"` check. Web bundlers that strip `navigator` (some SSR setups) get `false`, which is the right default.

You can spy on this in tests via `vi.spyOn(platform, "isReactNative")` — see `src/ForgeSubmit.rn.test.tsx` for the pattern.

## Real-device verification

The unit tests under `src/ForgeSubmit.rn.test.tsx` assert *what we inject* — they don't assert that RN core `Pressable` and gesture-handler `Pressable` actually honor those props in practice. We trust the documented public API of each library, but the only way to be sure is to run on a real device or simulator.

If you ship this package on RN and hit a case where one of the three props doesn't take effect, please [open an issue](https://github.com/adexdsamson/forge-validation/issues) with the specific component, its version, and a minimal repro.
