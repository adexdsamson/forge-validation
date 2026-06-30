import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { FieldValues } from "react-hook-form";
import type {
  ForgeValidationContextValue,
  Strategy,
  StrategyName,
} from "./types";

const Context = createContext<ForgeValidationContextValue | null>(null);

export interface ForgeValidationProps<
  TValues extends FieldValues = FieldValues,
> {
  /**
   * Validation strategy. Either a built-in name (M1 will resolve these to
   * predicate objects) or a fully-specified `Strategy` value. M0 accepts
   * the prop but does not yet apply it.
   */
  strategy?: StrategyName | Strategy<TValues>;
  children: ReactNode;
}

/**
 * Provider for opt-in validation strategy. M0 ships an empty pass-through:
 * children render unchanged, the context exposes `strategy: null`. M1 will
 * resolve string sugar and wire `canSubmit` / `shouldShowError` into Forge
 * core's submit + error-display surface.
 */
export function ForgeValidation<TValues extends FieldValues = FieldValues>({
  strategy: _strategy,
  children,
}: ForgeValidationProps<TValues>) {
  const value = useMemo<ForgeValidationContextValue>(
    () => ({ strategy: null }),
    []
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
