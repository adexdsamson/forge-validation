import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ForgeValidation, useForgeValidation } from "./ForgeValidation";
import { strategies } from "./strategies";

function StrategyProbe() {
  const ctx = useForgeValidation();
  const label =
    ctx === null
      ? "no-ctx"
      : ctx.strategy === null
        ? "no-strategy"
        : "has-strategy";
  return <span data-testid="probe">{label}</span>;
}

describe("ForgeValidation", () => {
  it("renders children unchanged", () => {
    render(
      <ForgeValidation>
        <div data-testid="child">hello</div>
      </ForgeValidation>
    );
    expect(screen.getByTestId("child")).toHaveTextContent("hello");
  });

  it("returns null from useForgeValidation outside a provider", () => {
    render(<StrategyProbe />);
    expect(screen.getByTestId("probe")).toHaveTextContent("no-ctx");
  });

  it("exposes a null strategy when none is passed", () => {
    render(
      <ForgeValidation>
        <StrategyProbe />
      </ForgeValidation>
    );
    expect(screen.getByTestId("probe")).toHaveTextContent("no-strategy");
  });

  it("resolves string sugar to a predicate object in context", () => {
    function StringSugarProbe() {
      const ctx = useForgeValidation();
      const sameAsProgressive = ctx?.strategy === strategies.progressive;
      return <span data-testid="probe">{String(sameAsProgressive)}</span>;
    }
    render(
      <ForgeValidation strategy="progressive">
        <StringSugarProbe />
      </ForgeValidation>
    );
    expect(screen.getByTestId("probe")).toHaveTextContent("true");
  });

  it("passes through a fully-specified Strategy object", () => {
    const custom = { ...strategies.strict, canSubmit: () => false };
    function CustomProbe() {
      const ctx = useForgeValidation();
      return (
        <span data-testid="probe">{String(ctx?.strategy === custom)}</span>
      );
    }
    render(
      <ForgeValidation strategy={custom}>
        <CustomProbe />
      </ForgeValidation>
    );
    expect(screen.getByTestId("probe")).toHaveTextContent("true");
  });
});
