import { describe, expect, it } from "vitest";
import {
  nextSessionTransition,
  sanitizeNativeSessionError,
} from "../sessionTransition";

describe("nextSessionTransition", () => {
  it("starts a new WebView at its epoch-millisecond lower bound", () => {
    expect(nextSessionTransition(0, 1_725_000_000_000)).toBe(
      1_725_000_000_000,
    );
  });

  it("strictly increments when the clock does not advance", () => {
    expect(nextSessionTransition(500, 500)).toBe(501);
  });

  it("strictly increments when the clock moves backwards", () => {
    expect(nextSessionTransition(500, 100)).toBe(501);
  });
});

describe("sanitizeNativeSessionError", () => {
  it("keeps only known native diagnostic codes from wrapped errors", () => {
    expect(
      sanitizeNativeSessionError(
        new Error("invoke failed: STALE_SESSION_TRANSITION at C:\\secret"),
      ),
    ).toBe("STALE_SESSION_TRANSITION");
  });

  it("replaces arbitrary native errors with a generic code", () => {
    expect(sanitizeNativeSessionError("token=private /tmp/session")).toBe(
      "UNKNOWN_NATIVE_SESSION_ERROR",
    );
  });
});
