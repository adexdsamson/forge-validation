import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { FieldValues } from "react-hook-form";
import { resolveStrategy } from "./strategies";
import type { ForgeValidationContextValue, Strategy, StrategyName } from "./types";

const Context = createContext<ForgeValidationContextValue | null>(null);

export interface ForgeValidationProps<TValues extends FieldValues = FieldValues> {
  /**
   * Validation strategy. Either a `StrategyName` string sugar
   * (`"progressive"`, `"standard"`, `"strict"`, `"lenient"`) or a
   * fully-specified `Strategy` predicate object.
   */
  strategy?: StrategyName | Strategy<TValues>;
  children: ReactNode;
}

/**
 * Provider for opt-in validation strategy. The resolved `Strategy` is
 * exposed via context; later milestones consume it from Forge core's
 * submit + error-display surface. Until then, `useForgeValidation()`
 * returns the resolved strategy for consumers who want to gate UI on
 * `canSubmit` / `shouldShowError` themselves.
 */
export function ForgeValidation<TValues extends FieldValues = FieldValues>({
  strategy,
  children,
}: ForgeValidationProps<TValues>) {
  const resolved = useMemo(() => resolveStrategy(strategy), [strategy]);
  const value = useMemo<ForgeValidationContextValue>(
    () => ({ strategy: resolved as Strategy | null }),
    [resolved]
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

/**
 * Read the active validation context. Returns `null` outside a
 * `<ForgeValidation>` — callers must handle the no-provider case.
 */
export function useForgeValidation(): ForgeValidationContextValue | null {
  return useContext(Context);
}
