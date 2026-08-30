import { describe, expect, it } from "vitest";
import { isNasdaqMarketOpen, isTaiwanMarketOpen, isWtxMarketOpen } from "../marketUtils";

describe("market sessions (regular sessions; holidays excluded)", () => {
  it("excludes Taiwan weekends and observes 09:00-13:30", () => {
    expect(isTaiwanMarketOpen(new Date("2024-06-14T01:00:00Z"))).toBe(true);
    expect(isTaiwanMarketOpen(new Date("2024-06-15T01:00:00Z"))).toBe(false);
  });
  it("uses New York Nasdaq time across DST", () => {
    expect(isNasdaqMarketOpen(new Date("2024-07-01T13:30:00Z"))).toBe(true);
    expect(isNasdaqMarketOpen(new Date("2024-12-02T14:30:00Z"))).toBe(true);
    expect(isNasdaqMarketOpen(new Date("2024-07-01T13:29:00Z"))).toBe(false);
  });
  it("treats exact regular-session close as closed", () => {
    expect(isTaiwanMarketOpen(new Date("2024-06-14T05:29:00Z"))).toBe(true);
    expect(isTaiwanMarketOpen(new Date("2024-06-14T05:30:00Z"))).toBe(false);
    expect(isNasdaqMarketOpen(new Date("2024-07-01T19:59:00Z"))).toBe(true);
    expect(isNasdaqMarketOpen(new Date("2024-07-01T20:00:00Z"))).toBe(false);
  });
  it("handles WTX overnight and weekend boundary", () => {
    expect(isWtxMarketOpen(new Date("2024-06-14T18:00:00Z"))).toBe(true);
    expect(isWtxMarketOpen(new Date("2024-06-14T21:30:00Z"))).toBe(false);
  });
});
