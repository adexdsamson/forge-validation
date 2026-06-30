import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAsyncValidator } from "./createAsyncValidator";
import type { AsyncValidator } from "./types";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => {
    queueMicrotask(resolve);
  });
}

type ValidatorFn = AsyncValidator<string>;

describe("createAsyncValidator — debouncing", () => {
  it("runs the underlying validator only once after rapid invocations within the debounce window", async () => {
    const inner = vi.fn<ValidatorFn>(async () => undefined);
    const validator = createAsyncValidator(inner, { debounceMs: 100 });

    void validator("a");
    void validator("ab");
    const final = validator("abc");

    expect(inner).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(50);
    expect(inner).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60);
    await final;
    expect(inner).toHaveBeenCalledTimes(1);
    expect(inner.mock.calls[0]?.[0]).toBe("abc");
  });

  it("threads field and formValues into ctx", async () => {
    const inner = vi.fn<ValidatorFn>(async () => undefined);
    const validator = createAsyncValidator(inner, { debounceMs: 0, field: "email" });

    const p = validator("v@example.com", { other: 1 });
    await vi.advanceTimersByTimeAsync(0);
    await p;

    const ctx = inner.mock.calls[0]?.[1];
    expect(ctx?.field).toBe("email");
    expect(ctx?.formValues).toEqual({ other: 1 });
    expect(ctx?.signal).toBeInstanceOf(AbortSignal);
  });

  it("resolves cancelled invocations to undefined (no false 'invalid' surfaced)", async () => {
    const inner = vi.fn<ValidatorFn>(async () => "error msg");
    const validator = createAsyncValidator(inner, { debounceMs: 50 });

    const first = validator("a");
    const second = validator("b");

    await vi.advanceTimersByTimeAsync(60);
    await expect(first).resolves.toBeUndefined();
    await expect(second).resolves.toBe("error msg");
  });
});

describe("createAsyncValidator — abort semantics", () => {
  it("aborts the previous in-flight controller when a new trigger fires", async () => {
    const signals: AbortSignal[] = [];
    const inner: AsyncValidator = async (_value, ctx) => {
      signals.push(ctx.signal);
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
      return undefined;
    };
    const validator = createAsyncValidator(inner, { debounceMs: 0 });

    const first = validator("a");
    await vi.advanceTimersByTimeAsync(0);
    expect(signals).toHaveLength(1);
    expect(signals[0].aborted).toBe(false);

    const second = validator("b");
    await vi.advanceTimersByTimeAsync(0);
    expect(signals[0].aborted).toBe(true);

    await vi.advanceTimersByTimeAsync(60);
    await first;
    await second;
  });

  it("swallows AbortError thrown by the inner validator", async () => {
    const inner: AsyncValidator = async (_value, ctx) => {
      if (ctx.signal.aborted) {
        const err = new Error("aborted");
        err.name = "AbortError";
        throw err;
      }
      await new Promise<void>((resolve, reject) => {
        ctx.signal.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
        setTimeout(resolve, 100);
      });
      return undefined;
    };
    const validator = createAsyncValidator(inner, { debounceMs: 0 });

    const first = validator("a");
    await vi.advanceTimersByTimeAsync(0);
    const second = validator("b");
    await vi.advanceTimersByTimeAsync(0);

    await expect(first).resolves.toBeUndefined();
    await vi.advanceTimersByTimeAsync(150);
    await second;
  });

  it("surfaces non-abort validator errors as a string message (RHF-friendly)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const inner: AsyncValidator = async () => {
      throw new Error("network down");
    };
    const validator = createAsyncValidator(inner, { debounceMs: 0 });

    const p = validator("a");
    await vi.advanceTimersByTimeAsync(0);
    await expect(p).resolves.toBe("network down");
    expect(errSpy).toHaveBeenCalledTimes(1);
  });

  it("falls back to 'Validation failed' for non-Error throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const inner: AsyncValidator = async () => {
      throw "string-throw";
    };
    const validator = createAsyncValidator(inner, { debounceMs: 0 });

    const p = validator("a");
    await vi.advanceTimersByTimeAsync(0);
    await expect(p).resolves.toBe("Validation failed");
  });
});

describe("createAsyncValidator — generation guard for misbehaving validators", () => {
  it("drops a stale resolution from a validator that ignored its abort signal", async () => {
    let resolveFirst!: (msg: string) => void;
    let callCount = 0;
    const inner: AsyncValidator = (_value) => {
      callCount += 1;
      if (callCount === 1) {
        return new Promise<string | undefined>((resolve) => {
          resolveFirst = resolve;
        });
      }
      return Promise.resolve(undefined);
    };
    const validator = createAsyncValidator(inner, { debounceMs: 0 });

    const first = validator("a");
    await vi.advanceTimersByTimeAsync(0);
    const second = validator("b");
    await vi.advanceTimersByTimeAsync(0);
    await second;

    resolveFirst("stale error — should be dropped");
    await flushMicrotasks();

    await expect(first).resolves.toBeUndefined();
  });

  it("emits a dev-mode warning when a stale resolution is dropped", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    let resolveFirst!: (msg: string) => void;
    let callCount = 0;
    const inner: AsyncValidator = () => {
      callCount += 1;
      if (callCount === 1) {
        return new Promise<string | undefined>((resolve) => {
          resolveFirst = resolve;
        });
      }
      return Promise.resolve(undefined);
    };
    const validator = createAsyncValidator(inner, { debounceMs: 0 });

    void validator("a");
    await vi.advanceTimersByTimeAsync(0);
    const second = validator("b");
    await vi.advanceTimersByTimeAsync(0);
    await second;

    resolveFirst("stale");
    await flushMicrotasks();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/thread ctx\.signal/);
  });
});

describe("createAsyncValidator — happy path", () => {
  it("returns the validator's resolved string as the error message", async () => {
    const inner: AsyncValidator = async (value) => {
      return value === "ok" ? undefined : "not ok";
    };
    const validator = createAsyncValidator(inner, { debounceMs: 0 });

    const p1 = validator("ok");
    await vi.advanceTimersByTimeAsync(0);
    await expect(p1).resolves.toBeUndefined();

    const p2 = validator("nope");
    await vi.advanceTimersByTimeAsync(0);
    await expect(p2).resolves.toBe("not ok");
  });
});
