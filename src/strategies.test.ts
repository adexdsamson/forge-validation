import { describe, expect, it } from "vitest";
import { resolveStrategy, strategies } from "./strategies";
import type { FieldState, ForgeState } from "./types";

function field(
  name: string,
  overrides: Partial<FieldState> = {}
): FieldState {
  return {
    name,
    value: undefined,
    isDirty: false,
    isTouched: false,
    isValidating: false,
    error: undefined,
    ...overrides,
  };
}

function state(overrides: Partial<ForgeState> = {}): ForgeState {
  return {
    values: {},
    fields: {},
    errors: {},
    isDirty: false,
    isSubmitting: false,
    isValidating: false,
    submitCount: 0,
    ...overrides,
  };
}

describe("strategies — strict", () => {
  const s = strategies.strict;

  it("blocks submit when any field has an error", () => {
    expect(s.canSubmit(state({ errors: { email: "required" } }))).toBe(false);
  });

  it("allows submit on clean form", () => {
    expect(s.canSubmit(state())).toBe(true);
  });

  it("blocks submit while submitting", () => {
    expect(s.canSubmit(state({ isSubmitting: true }))).toBe(false);
  });

  it("blocks submit while any async validation is in flight", () => {
    expect(s.canSubmit(state({ isValidating: true }))).toBe(false);
  });

  it("shows errors immediately, no touch required", () => {
    expect(s.shouldShowError(field("x", { error: "bad" }), state())).toBe(true);
  });

  it("validates on every trigger", () => {
    expect(s.shouldValidate(field("x"), "change")).toBe(true);
    expect(s.shouldValidate(field("x"), "blur")).toBe(true);
    expect(s.shouldValidate(field("x"), "submit")).toBe(true);
    expect(s.shouldValidate(field("x"), "manual")).toBe(true);
  });
});

describe("strategies — standard", () => {
  const s = strategies.standard;

  it("blocks submit when any field has an error", () => {
    expect(s.canSubmit(state({ errors: { email: "required" } }))).toBe(false);
  });

  it("allows submit during async validation (overlap is fine)", () => {
    expect(s.canSubmit(state({ isValidating: true }))).toBe(true);
  });

  it("hides errors on untouched, never-submitted fields", () => {
    expect(s.shouldShowError(field("x", { error: "bad" }), state())).toBe(
      false
    );
  });

  it("shows errors after touch", () => {
    expect(
      s.shouldShowError(field("x", { error: "bad", isTouched: true }), state())
    ).toBe(true);
  });

  it("shows errors after a submit attempt even when untouched", () => {
    expect(
      s.shouldShowError(field("x", { error: "bad" }), state({ submitCount: 1 }))
    ).toBe(true);
  });

  it("skips change-trigger validation, runs blur/submit/manual", () => {
    expect(s.shouldValidate(field("x"), "change")).toBe(false);
    expect(s.shouldValidate(field("x"), "blur")).toBe(true);
    expect(s.shouldValidate(field("x"), "submit")).toBe(true);
    expect(s.shouldValidate(field("x"), "manual")).toBe(true);
  });
});

describe("strategies — progressive", () => {
  const s = strategies.progressive;

  it("does not block submit on errors of untouched fields", () => {
    expect(
      s.canSubmit(
        state({
          errors: { email: "required" },
          fields: { email: field("email") },
        })
      )
    ).toBe(true);
  });

  it("blocks submit when a touched field has an error", () => {
    expect(
      s.canSubmit(
        state({
          errors: { email: "required" },
          fields: { email: field("email", { isTouched: true }) },
        })
      )
    ).toBe(false);
  });

  it("hides errors on untouched fields", () => {
    expect(s.shouldShowError(field("x", { error: "bad" }), state())).toBe(
      false
    );
  });

  it("shows errors after touch", () => {
    expect(
      s.shouldShowError(field("x", { error: "bad", isTouched: true }), state())
    ).toBe(true);
  });

  it("validates on change only when the field is already showing an error", () => {
    expect(s.shouldValidate(field("x"), "change")).toBe(false);
    expect(s.shouldValidate(field("x", { error: "bad" }), "change")).toBe(true);
  });

  it("always validates on blur, submit, manual", () => {
    expect(s.shouldValidate(field("x"), "blur")).toBe(true);
    expect(s.shouldValidate(field("x"), "submit")).toBe(true);
    expect(s.shouldValidate(field("x"), "manual")).toBe(true);
  });
});

describe("strategies — lenient", () => {
  const s = strategies.lenient;

  it("allows submit even with errors", () => {
    expect(s.canSubmit(state({ errors: { email: "required" } }))).toBe(true);
  });

  it("blocks submit while submitting", () => {
    expect(s.canSubmit(state({ isSubmitting: true }))).toBe(false);
  });

  it("hides errors until a submit attempt", () => {
    expect(
      s.shouldShowError(
        field("x", { error: "bad", isTouched: true }),
        state({ submitCount: 0 })
      )
    ).toBe(false);
  });

  it("shows errors after submit attempt", () => {
    expect(
      s.shouldShowError(field("x", { error: "bad" }), state({ submitCount: 1 }))
    ).toBe(true);
  });

  it("validates only on submit / manual", () => {
    expect(s.shouldValidate(field("x"), "change")).toBe(false);
    expect(s.shouldValidate(field("x"), "blur")).toBe(false);
    expect(s.shouldValidate(field("x"), "submit")).toBe(true);
    expect(s.shouldValidate(field("x"), "manual")).toBe(true);
  });
});

describe("resolveStrategy", () => {
  it("returns null for undefined", () => {
    expect(resolveStrategy(undefined)).toBeNull();
  });

  it("resolves string sugar to the matching preset", () => {
    expect(resolveStrategy("progressive")).toBe(strategies.progressive);
    expect(resolveStrategy("strict")).toBe(strategies.strict);
    expect(resolveStrategy("standard")).toBe(strategies.standard);
    expect(resolveStrategy("lenient")).toBe(strategies.lenient);
  });

  it("returns predicate objects unchanged", () => {
    const custom = strategies.progressive;
    expect(resolveStrategy(custom)).toBe(custom);
  });
});
