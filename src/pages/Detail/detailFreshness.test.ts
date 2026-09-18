import { describe, expect, it } from "vitest";
import { shouldShowDetailFreshness } from "./detailFreshness";

describe("shouldShowDetailFreshness", () => {
  it("hides the ready compact freshness overlay on Chip only", () => {
    expect(shouldShowDetailFreshness("chip", "ready")).toBe(false);
    expect(shouldShowDetailFreshness("macd", "ready")).toBe(true);
  });

  it("does not replace non-ready blocking states", () => {
    expect(shouldShowDetailFreshness("chip", "loading")).toBe(false);
    expect(shouldShowDetailFreshness("macd", "error")).toBe(false);
  });
});
