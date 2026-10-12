/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { normalizeNasdaqHistory, parseNasdaqDeals } from "./useNasdaqDeals";
import { MARKET_OVERVIEW_SWR_POLICY } from "./marketOverviewPolicy";

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

describe("normalizeNasdaqHistory", () => {
  it("keeps the native history shape and does not turn an empty price into zero", () => {
    expect(normalizeNasdaqHistory({ data: [], price: 0, change: null })).toEqual({
      data: [],
      price: null,
      change: null,
    });
    expect(normalizeNasdaqHistory({
      data: [{ t: 1_700_000_000, o: 1, c: 2, h: 3, l: 0.5, v: 10 }],
      price: 2,
      change: null,
    })).toEqual({
      data: [{ t: 1_700_000_000, o: 1, c: 2, h: 3, l: 0.5, v: 10 }],
      price: 2,
      change: 0,
    });
  });
});

describe("market overview request policy", () => {
  it("does not retry provider failures implicitly", () => {
    expect(MARKET_OVERVIEW_SWR_POLICY).toMatchObject({
      revalidateOnFocus: false,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      shouldRetryOnError: false,
    });
  });
});
