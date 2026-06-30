import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormProvider, useForm, type UseFormReturn } from "react-hook-form";
import type { ReactNode } from "react";
import { ForgeValidation } from "./ForgeValidation";
import { ForgeSubmit } from "./ForgeSubmit";
import { strategies } from "./strategies";
import type { Strategy } from "./types";

interface HarnessProps {
  strategy?: Strategy | "progressive" | "lenient" | "strict" | "standard";
  defaultValues?: Record<string, unknown>;
  seed?: (methods: UseFormReturn) => void;
  children: ReactNode;
}

function Harness({ strategy, defaultValues, seed, children }: HarnessProps) {
  const methods = useForm({ defaultValues });
  if (seed) seed(methods);
  return (
    <FormProvider {...methods}>
      <ForgeValidation strategy={strategy}>
        <form>{children}</form>
      </ForgeValidation>
    </FormProvider>
  );
}

describe("ForgeSubmit — default mode", () => {
  it("renders an internal <button type=submit>", () => {
    render(
      <Harness>
        <ForgeSubmit>Submit</ForgeSubmit>
      </Harness>
    );
    const btn = screen.getByRole("button", { name: "Submit" });
    expect(btn).toHaveAttribute("type", "submit");
    expect(btn).not.toBeDisabled();
  });

  it("is not gated when no strategy is set", () => {
    render(
      <Harness>
        <ForgeSubmit>Submit</ForgeSubmit>
      </Harness>
    );
    expect(screen.getByRole("button")).not.toBeDisabled();
  });

  it("is not gated when rendered outside a FormProvider", () => {
    render(
      <ForgeValidation strategy="strict">
        <ForgeSubmit>Submit</ForgeSubmit>
      </ForgeValidation>
    );
    expect(screen.getByRole("button")).not.toBeDisabled();
  });
});

describe("ForgeSubmit — strategy gating", () => {
  it("disables when the strategy's canSubmit returns false", () => {
    const blockAll: Strategy = { ...strategies.lenient, canSubmit: () => false };
    render(
      <Harness strategy={blockAll}>
        <ForgeSubmit>Submit</ForgeSubmit>
      </Harness>
    );
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("enables when the strategy's canSubmit returns true", () => {
    const allowAll: Strategy = { ...strategies.lenient, canSubmit: () => true };
    render(
      <Harness strategy={allowAll}>
        <ForgeSubmit>Submit</ForgeSubmit>
      </Harness>
    );
    expect(screen.getByRole("button")).not.toBeDisabled();
  });

  it("passes a populated ForgeState to canSubmit", () => {
    let observedFields: string[] = [];
    const probe: Strategy = {
      ...strategies.lenient,
      canSubmit: (state) => {
        observedFields = Object.keys(state.fields);
        return true;
      },
    };
    render(
      <Harness strategy={probe} defaultValues={{ email: "", name: "" }}>
        <ForgeSubmit>Submit</ForgeSubmit>
      </Harness>
    );
    expect(observedFields).toEqual(expect.arrayContaining(["email", "name"]));
  });
});

describe("ForgeSubmit — asChild mode", () => {
  it("clones the child and injects type=submit + disabled", () => {
    const blockAll: Strategy = { ...strategies.lenient, canSubmit: () => false };
    render(
      <Harness strategy={blockAll}>
        <ForgeSubmit asChild>
          <button data-testid="custom">Go</button>
        </ForgeSubmit>
      </Harness>
    );
    const btn = screen.getByTestId("custom");
    expect(btn).toHaveAttribute("type", "submit");
    expect(btn).toBeDisabled();
  });

  it("OR-merges existing disabled prop on the child", () => {
    const allowAll: Strategy = { ...strategies.lenient, canSubmit: () => true };
    render(
      <Harness strategy={allowAll}>
        <ForgeSubmit asChild>
          <button data-testid="custom" disabled>
            Go
          </button>
        </ForgeSubmit>
      </Harness>
    );
    expect(screen.getByTestId("custom")).toBeDisabled();
  });

  it("throws when asChild gets a non-element child", () => {
    const blockAll: Strategy = { ...strategies.lenient, canSubmit: () => false };
    expect(() =>
      render(
        <Harness strategy={blockAll}>
          <ForgeSubmit asChild>just a string</ForgeSubmit>
        </Harness>
      )
    ).toThrow(/single React element/);
  });
});

describe("ForgeSubmit — render-prop mode", () => {
  it("calls the function with disabled + type", () => {
    const blockAll: Strategy = { ...strategies.lenient, canSubmit: () => false };
    render(
      <Harness strategy={blockAll}>
        <ForgeSubmit>
          {({ disabled, type }) => (
            <button data-testid="rp" disabled={disabled} type={type}>
              Go
            </button>
          )}
        </ForgeSubmit>
      </Harness>
    );
    const btn = screen.getByTestId("rp");
    expect(btn).toHaveAttribute("type", "submit");
    expect(btn).toBeDisabled();
  });

  it("renders enabled when canSubmit returns true", () => {
    const allowAll: Strategy = { ...strategies.lenient, canSubmit: () => true };
    render(
      <Harness strategy={allowAll}>
        <ForgeSubmit>
          {({ disabled }) => (
            <button data-testid="rp" disabled={disabled}>
              Go
            </button>
          )}
        </ForgeSubmit>
      </Harness>
    );
    expect(screen.getByTestId("rp")).not.toBeDisabled();
  });
});

describe("ForgeSubmit — built-in strategies end-to-end", () => {
  it("lenient enables submit even with errors present", () => {
    render(
      <Harness strategy="lenient" defaultValues={{ email: "" }}>
        <ForgeSubmit>Submit</ForgeSubmit>
      </Harness>
    );
    expect(screen.getByRole("button")).not.toBeDisabled();
  });

  it("strict disables submit on clean form? no — clean form has no errors", () => {
    render(
      <Harness strategy="strict" defaultValues={{ email: "x" }}>
        <ForgeSubmit>Submit</ForgeSubmit>
      </Harness>
    );
    expect(screen.getByRole("button")).not.toBeDisabled();
  });
});
