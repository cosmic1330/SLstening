import { describe, expect, it } from "vitest";
import { hasSamples, hasVolumeBaseline } from "../marketMetrics";

describe("market metric availability", () => {
  it("requires exact sample thresholds", () => {
    expect(hasSamples([{}], 5)).toBe(false);
    expect(hasSamples(Array(4).fill({}), 5)).toBe(false);
    expect(hasSamples(Array(5).fill({}), 5)).toBe(true);
  });
  it("requires an 11-row non-zero finite volume baseline", () => {
    expect(hasVolumeBaseline(Array(10).fill({ v: 1 }))).toBe(false);
    expect(hasVolumeBaseline(Array(11).fill({ v: 0 }))).toBe(false);
    expect(hasVolumeBaseline(Array(11).fill({ v: 1 }))).toBe(true);
  });
});
