import {
  Children,
  cloneElement,
  isValidElement,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  useFormContext,
  useFormState,
  type FieldErrors,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";
import { useForgeValidation } from "./ForgeValidation";
import type { FieldState, ForgeState, Strategy } from "./types";

/**
 * Props delivered to the render-prop function. M2 ships web-only —
 * `type: "submit"` is HTML-specific. M3 will broaden the surface for RN.
 */
export interface ForgeSubmitRenderProps {
  disabled: boolean;
  type: "submit";
}

type RenderFn = (props: ForgeSubmitRenderProps) => ReactNode;

export interface ForgeSubmitProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "disabled" | "children"
> {
  /**
   * Clone the single child element and inject `type="submit"` plus an
   * OR-merged `disabled`. Required when wrapping a third-party Button.
   */
  asChild?: boolean;
  /**
   * - Default mode: text/JSX rendered inside an internal `<button type="submit">`.
   * - `asChild`: must be a single React element to clone.
   * - Render-prop: a function `({ disabled, type }) => ReactNode`.
   */
  children?: ReactNode | RenderFn;
}

/**
 * Submit gating that reads `canSubmit` from the active `<ForgeValidation>`
 * strategy and applies it to the rendered submit control. Three render
 * shapes are supported: default `<button>`, `asChild` cloneElement, and
 * a render-prop. Existing `disabled` props on the wrapped child are
 * OR-merged — never overridden.
 *
 * Outside a `<ForgeValidation>` provider (or inside one with no strategy
 * configured), submit is never gated — disabled is always `false`. Outside
 * an RHF `<FormProvider>` the same applies.
 *
 * Note: M2 is web-only. The render-prop's `type: "submit"` and the cloned
 * `type` injection are HTML-specific. RN composition lands in M3.
 */
export function ForgeSubmit(props: ForgeSubmitProps) {
  const formContext = useFormContext();
  const validationCtx = useForgeValidation();
  const strategy = validationCtx?.strategy ?? null;

  if (!formContext || !strategy) {
    return renderShape(props, false);
  }

  return <Gated {...props} formContext={formContext} strategy={strategy} />;
}

interface GatedProps extends ForgeSubmitProps {
  formContext: UseFormReturn<FieldValues>;
  strategy: Strategy;
}

function Gated({ formContext, strategy, ...rest }: GatedProps) {
  const formState = useFormState({ control: formContext.control });
  const values = formContext.getValues();
  const state = buildForgeState(values, formState);
  const disabled = !strategy.canSubmit(state);
  return renderShape(rest, disabled);
}

function renderShape(props: ForgeSubmitProps, disabled: boolean): ReactNode {
  const { asChild, children, ...rest } = props;

  if (typeof children === "function") {
    const renderProp = children as RenderFn;
    return <>{renderProp({ disabled, type: "submit" })}</>;
  }

  if (asChild) {
    if (!isValidElement(children)) {
      throw new Error("ForgeSubmit asChild requires a single React element child.");
    }
    const onlyChild = Children.only(children) as ReactElement<
      ButtonHTMLAttributes<HTMLButtonElement>
    >;
    const existing = Boolean(onlyChild.props.disabled);
    return cloneElement(onlyChild, {
      type: "submit",
      disabled: existing || disabled,
    });
  }

  return (
    <button type="submit" disabled={disabled} {...rest}>
      {children as ReactNode}
    </button>
  );
}

interface FormStateLike {
  errors: FieldErrors;
  touchedFields: Record<string, unknown>;
  dirtyFields: Record<string, unknown>;
  isDirty: boolean;
  isSubmitting: boolean;
  isValidating: boolean;
  submitCount: number;
}

function buildForgeState(values: FieldValues, formState: FormStateLike): ForgeState {
  const names = new Set<string>([
    ...Object.keys(values ?? {}),
    ...Object.keys(formState.errors ?? {}),
    ...Object.keys(formState.touchedFields ?? {}),
    ...Object.keys(formState.dirtyFields ?? {}),
  ]);

  const fields: Record<string, FieldState> = {};
  const errors: Record<string, string | undefined> = {};

  for (const name of names) {
    const errorMessage = readErrorMessage(formState.errors, name);
    fields[name] = {
      name,
      value: values?.[name],
      isDirty: Boolean(formState.dirtyFields?.[name]),
      isTouched: Boolean(formState.touchedFields?.[name]),
      isValidating: false,
      error: errorMessage,
    };
    if (errorMessage !== undefined) {
      errors[name] = errorMessage;
    }
  }

  return {
    values,
    fields,
    errors,
    isDirty: Boolean(formState.isDirty),
    isSubmitting: Boolean(formState.isSubmitting),
    isValidating: Boolean(formState.isValidating),
    submitCount: formState.submitCount ?? 0,
  };
}

function readErrorMessage(errors: FieldErrors, name: string): string | undefined {
  const entry = errors?.[name];
  if (entry && typeof entry === "object" && "message" in entry) {
    const msg = (entry as { message?: unknown }).message;
    return typeof msg === "string" ? msg : undefined;
  }
  return undefined;
}
