/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { parseNasdaqDeals } from "./useNasdaqDeals";

const payload = (quote: Record<string, unknown>, timestamp: unknown[]) => JSON.stringify({
  chart: { result: [{ indicators: { quote: [quote] }, timestamp }] },
});

describe("parseNasdaqDeals", () => {
  it("treats timestamped all-null OHLC rows as a valid empty result", () => {
    expect(parseNasdaqDeals(payload({
      open: [null], close: [null], high: [null], low: [null], volume: [null],
    }, [1_700_000_000]))).toEqual({ data: [], price: null, change: null });
  });

  it("rejects partially null or misaligned rows", () => {
    expect(() => parseNasdaqDeals(payload({
      open: [1], close: [null], high: [1], low: [1], volume: [1],
    }, [1_700_000_000]))).toThrow("Malformed Nasdaq OHLC response");
    expect(() => parseNasdaqDeals(payload({
      open: [1], close: [1], high: [1], low: [], volume: [1],
    }, [1_700_000_000]))).toThrow("Malformed Nasdaq response");
  });
});
