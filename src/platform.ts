/**
 * Detect whether the current runtime is React Native (Hermes / JSC) vs a
 * browser / jsdom / Node web environment.
 *
 * Exposed as a function (not a module-level constant) so tests can stub it
 * via `vi.spyOn(platform, "isReactNative")` without resorting to module-
 * factory mocks. The check is cheap; calling per render is fine.
 */
export function isReactNative(): boolean {
  return typeof navigator !== "undefined" && navigator.product === "ReactNative";
}
