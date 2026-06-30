import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ForgeValidation, useForgeValidation } from "./ForgeValidation";

function ContextProbe() {
  const ctx = useForgeValidation();
  return <span data-testid="probe">{ctx === null ? "no-ctx" : "ctx"}</span>;
}

describe("ForgeValidation (M0 scaffold)", () => {
  it("renders children unchanged", () => {
    render(
      <ForgeValidation>
        <div data-testid="child">hello</div>
      </ForgeValidation>
    );
    expect(screen.getByTestId("child")).toHaveTextContent("hello");
  });

  it("provides a context to descendants", () => {
    render(
      <ForgeValidation>
        <ContextProbe />
      </ForgeValidation>
    );
    expect(screen.getByTestId("probe")).toHaveTextContent("ctx");
  });

  it("returns null from useForgeValidation outside a provider", () => {
    render(<ContextProbe />);
    expect(screen.getByTestId("probe")).toHaveTextContent("no-ctx");
  });

  it("accepts a `strategy` string prop without throwing (M0: not yet applied)", () => {
    render(
      <ForgeValidation strategy="progressive">
        <span>ok</span>
      </ForgeValidation>
    );
    expect(screen.getByText("ok")).toBeInTheDocument();
  });
});
