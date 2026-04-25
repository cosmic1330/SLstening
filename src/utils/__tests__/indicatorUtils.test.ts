import { describe, expect, it } from "vitest";
import { IndicatorSettings } from "../../hooks/useIndicatorSettings";
import { TaType } from "../../types";
import { calculateIndicators } from "../indicatorUtils";

const mockSettings: IndicatorSettings = {
  ma5: 5,
  ma10: 10,
  ma20: 20,
  ma60: 60,
  boll: 20,
  kd: 9,
  mfi: 14,
  rsi: 5,
  ma120: 120,
  ma240: 240,
  emaShort: 5,
  emaLong: 10,
  cmf: 21,
  cmfEma: 5,
  hmaLength: 20,
  atrLen: 14,
  atrMult: 2.5,
  atrVolSwitch: 1,
  fastLookback: 10,
  trendFilter: 50,
  kcLength: 20,
  kcMult: 2.0,
};

const generateMockDeals = (count: number): TaType => {
  const deals: TaType = [];
  for (let i = 0; i < count; i++) {
    deals.push({
      t: 20240101 + i,
      o: 100 + i,
      h: 110 + i,
      l: 95 + i,
      c: 105 + i,
      v: 1000 + i * 100,
    });
  }
  return deals;
};

describe("indicatorUtils", () => {
  describe("calculateIndicators", () => {
    it("should return an empty array when deals is empty", () => {
      const result = calculateIndicators([], mockSettings);
      expect(result).toEqual([]);
    });

    it("should calculate basic indicators for a small dataset", () => {
      const deals = generateMockDeals(5);
      const result = calculateIndicators(deals, mockSettings);

      expect(result).toHaveLength(5);
      expect(result[0]).toHaveProperty("ma5");
      expect(result[0]).toHaveProperty("bollMa");
      expect(result[0]).toHaveProperty("obv");
    });

    it("should calculate MA5 correctly after 5 data points", () => {
      const deals = generateMockDeals(10);
      const result = calculateIndicators(deals, mockSettings);

      // Index 4 is the 5th data point
      expect(result[4].ma5).not.toBeNull();
      expect(result[3].ma5).toBeNull(); // Not enough data yet
    });

    it("should calculate trend correctly", () => {
      // Create a strong uptrend
      const count = 300;
      const deals: TaType = [];
      for (let i = 0; i < count; i++) {
        deals.push({
          t: 20240101 + i,
          o: 100 + i,
          h: 105 + i,
          l: 95 + i,
          c: 100 + i,
          v: 1000,
        });
      }

      const result = calculateIndicators(deals, mockSettings);
      const last = result[result.length - 1];

      expect(last.trend).toBe("多頭");
    });

    it("should handle missing data gracefully (null checks)", () => {
      // @ts-ignore
      const result = calculateIndicators(null, mockSettings);
      expect(result).toEqual([]);
    });

    it("should calculate MACD fields correctly", () => {
      const deals = generateMockDeals(40);
      const result = calculateIndicators(deals, mockSettings);
      const last = result[result.length - 1];

      expect(last.dif).not.toBeNull();
      expect(last.osc).not.toBeNull();
    });

    it("should calculate OBV and OBV EMA correctly", () => {
      const deals = generateMockDeals(30);
      const result = calculateIndicators(deals, mockSettings);
      const last = result[result.length - 1];

      expect(last.obv).toBeTypeOf("number");
      expect(last.obvEma).not.toBeNull();
      expect(last.obvMa20).not.toBeNull();
    });

    it("should calculate CMF correctly", () => {
      const deals = generateMockDeals(30);
      const result = calculateIndicators(deals, mockSettings);
      const last = result[result.length - 1];

      expect(last.cmf).not.toBeNull();
    });

    it("should not produce redundant ATR buy/exit signals (V7 Logic)", () => {
      // Create a scenario where conditions are met for multiple days
      const deals: TaType = [];
      // Need EMA 50 to be lower than price, so we start with some history
      for (let i = 0; i < 100; i++) {
        deals.push({
          t: 20240101 + i,
          o: 100 + i,
          h: 105 + i,
          l: 95 + i,
          c: 100 + i,
          v: 1000,
        });
      }

      const result = calculateIndicators(deals, {
        ...mockSettings,
        fastLookback: 5,
        trendFilter: 20,
      });

      const buySignals = result.filter((d) => d.buySignal !== null);

      // In a steady uptrend, breakout happens only once or twice depending on slope
      // But with state machine, we expect only ONE buy signal until exit.
      expect(buySignals.length).toBeLessThanOrEqual(1);
    });
  });
});
