import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { type HTMLAttributes, type ReactNode } from "react";
import { ForgeValidation } from "./ForgeValidation";
import { ForgeSubmit } from "./ForgeSubmit";
import { strategies } from "./strategies";
import * as platform from "./platform";
import type { Strategy } from "./types";

interface HarnessProps {
  strategy?: Strategy | "progressive" | "lenient" | "strict" | "standard";
  children: ReactNode;
}

function Harness({ strategy, children }: HarnessProps) {
  const methods = useForm();
  return (
    <FormProvider {...methods}>
      <ForgeValidation strategy={strategy}>{children}</ForgeValidation>
    </FormProvider>
  );
}

// Stand-in for an RN-style component the consumer passes via asChild. Reflects
// every prop ForgeSubmit might inject so we can assert against data-* attrs.
interface RNButtonProps extends HTMLAttributes<HTMLSpanElement> {
  disabled?: boolean;
  enabled?: boolean;
  accessibilityState?: { disabled?: boolean } & Record<string, unknown>;
  testID?: string;
}

function RNButton({
  disabled,
  enabled,
  accessibilityState,
  children,
  testID = "rn-btn",
}: RNButtonProps) {
  return (
    <span
      data-testid={testID}
      data-disabled={String(Boolean(disabled))}
      data-enabled={String(enabled === undefined ? "undefined" : enabled)}
      data-a11y-disabled={String(Boolean(accessibilityState?.disabled))}
    >
      {children}
    </span>
  );
}

describe("ForgeSubmit — RN asChild composition", () => {
  beforeEach(() => {
    vi.spyOn(platform, "isReactNative").mockReturnValue(true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("injects disabled, accessibilityState.disabled, and enabled together", () => {
    const blockAll: Strategy = { ...strategies.lenient, canSubmit: () => false };
    render(
      <Harness strategy={blockAll}>
        <ForgeSubmit asChild>
          <RNButton>Go</RNButton>
        </ForgeSubmit>
      </Harness>
    );
    const btn = screen.getByTestId("rn-btn");
    expect(btn).toHaveAttribute("data-disabled", "true");
    expect(btn).toHaveAttribute("data-a11y-disabled", "true");
    expect(btn).toHaveAttribute("data-enabled", "false");
  });

  it("does NOT inject type=submit on RN (web-only prop)", () => {
    const blockAll: Strategy = { ...strategies.lenient, canSubmit: () => false };
    render(
      <Harness strategy={blockAll}>
        <ForgeSubmit asChild>
          <RNButton>Go</RNButton>
        </ForgeSubmit>
      </Harness>
    );
    expect(screen.getByTestId("rn-btn")).not.toHaveAttribute("type");
  });

  it("OR-merges with child's existing disabled prop", () => {
    const allowAll: Strategy = { ...strategies.lenient, canSubmit: () => true };
    render(
      <Harness strategy={allowAll}>
        <ForgeSubmit asChild>
          <RNButton disabled>Pending</RNButton>
        </ForgeSubmit>
      </Harness>
    );
    const btn = screen.getByTestId("rn-btn");
    expect(btn).toHaveAttribute("data-disabled", "true");
    expect(btn).toHaveAttribute("data-a11y-disabled", "true");
    expect(btn).toHaveAttribute("data-enabled", "false");
  });

  it("OR-merges with child's existing accessibilityState.disabled", () => {
    const allowAll: Strategy = { ...strategies.lenient, canSubmit: () => true };
    render(
      <Harness strategy={allowAll}>
        <ForgeSubmit asChild>
          <RNButton accessibilityState={{ disabled: true }}>Locked</RNButton>
        </ForgeSubmit>
      </Harness>
    );
    const btn = screen.getByTestId("rn-btn");
    expect(btn).toHaveAttribute("data-disabled", "true");
    expect(btn).toHaveAttribute("data-a11y-disabled", "true");
    expect(btn).toHaveAttribute("data-enabled", "false");
  });

  it("OR-merges with child's existing enabled={false} (gesture-handler style)", () => {
    const allowAll: Strategy = { ...strategies.lenient, canSubmit: () => true };
    render(
      <Harness strategy={allowAll}>
        <ForgeSubmit asChild>
          <RNButton enabled={false}>Locked</RNButton>
        </ForgeSubmit>
      </Harness>
    );
    const btn = screen.getByTestId("rn-btn");
    expect(btn).toHaveAttribute("data-disabled", "true");
    expect(btn).toHaveAttribute("data-a11y-disabled", "true");
    expect(btn).toHaveAttribute("data-enabled", "false");
  });

  it("preserves other accessibilityState keys via spread", () => {
    const blockAll: Strategy = { ...strategies.lenient, canSubmit: () => false };
    function ProbeButton({
      accessibilityState,
      children,
    }: {
      accessibilityState?: Record<string, unknown>;
      children?: ReactNode;
    }) {
      return (
        <span data-testid="probe" data-a11y={JSON.stringify(accessibilityState)}>
          {children}
        </span>
      );
    }
    render(
      <Harness strategy={blockAll}>
        <ForgeSubmit asChild>
          <ProbeButton accessibilityState={{ busy: true, selected: false }}>x</ProbeButton>
        </ForgeSubmit>
      </Harness>
    );
    const raw = screen.getByTestId("probe").getAttribute("data-a11y");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as Record<string, unknown>;
    expect(parsed).toEqual({ busy: true, selected: false, disabled: true });
  });

  it("enables the child when canSubmit returns true and no existing disable", () => {
    const allowAll: Strategy = { ...strategies.lenient, canSubmit: () => true };
    render(
      <Harness strategy={allowAll}>
        <ForgeSubmit asChild>
          <RNButton>Go</RNButton>
        </ForgeSubmit>
      </Harness>
    );
    const btn = screen.getByTestId("rn-btn");
    expect(btn).toHaveAttribute("data-disabled", "false");
    expect(btn).toHaveAttribute("data-a11y-disabled", "false");
    expect(btn).toHaveAttribute("data-enabled", "true");
  });
});

describe("ForgeSubmit — platform detection sanity", () => {
  it("isReactNative() returns false in jsdom by default", () => {
    expect(platform.isReactNative()).toBe(false);
  });
});
