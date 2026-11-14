import { describe, expect, it } from "vitest";
import {
  analyzeIchimokuAtPoint,
  IchimokuCombinedData,
} from "./ichimokuStrategy";

const row = (
  overrides: Partial<IchimokuCombinedData>,
): IchimokuCombinedData => ({
  t: 20260101,
  o: 100,
  h: 101,
  l: 99,
  c: 100,
  v: 1000,
  tenkan: 10,
  kijun: 11,
  senkouA: null,
  senkouB: null,
  chikou: null,
  osc: null,
  cmf: 0,
  cmfPrev: 0,
  cmfEma5: 0,
  atr14: 1,
  ...overrides,
});

describe("Ichimoku point analysis", () => {
  it("does not score a missing cloud as price above cloud", () => {
    const result = analyzeIchimokuAtPoint([row({})], 0);
    expect(result.score).toBe(0);
  });

  it("uses the latest real bar as context for a projected cloud row", () => {
    const result = analyzeIchimokuAtPoint(
      [
        row({ tenkan: 12, kijun: 10, cmf: 0.2, cmfEma5: 0.2 }),
        row({
          t: "future+1",
          o: null,
          h: null,
          l: null,
          c: null,
          v: null,
          tenkan: null,
          kijun: null,
          senkouA: 90,
          senkouB: 80,
          cmf: null,
          cmfEma5: null,
        }),
      ],
      1,
    );

    expect(result.score).toBe(90);
  });

  it("treats a projected cloud color change as uncertainty, not a bonus", () => {
    const result = analyzeIchimokuAtPoint(
      [
        row({}),
        row({ c: null, senkouA: 102, senkouB: 100 }),
        row({ c: null, senkouA: 99, senkouB: 101 }),
        row({ c: null, senkouA: 98, senkouB: 102 }),
      ],
      0,
    );

    expect(result.score).toBe(0);
  });
});
