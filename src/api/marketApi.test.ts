import { describe, expect, it } from "vitest";
import { validateHistoryPayload, validateTickPayload } from "./marketApi";

describe("market payload validation", () => {
  it("rejects unexpected tick shapes instead of treating them as empty", () => {
    expect(() => validateTickPayload({}, "2330")).toThrow("Invalid tick payload");
  });
  it("accepts a valid empty history but rejects malformed history", () => {
    expect(validateHistoryPayload({ id: "2330", name: null, data: [], price: 0, change: null }, "2330").data).toEqual([]);
    expect(() => validateHistoryPayload({ data: {} }, "2330")).toThrow("Invalid history payload");
  });
  it("rejects partial and all-invalid non-empty responses", () => {
    const base = { id: "2330", name: null, price: 1, change: 0 };
    expect(() => validateHistoryPayload({ ...base, data: [{ t: 1, o: 1, c: 1, h: 1, l: 1, v: 1 }, { t: null }] }, "2330")).toThrow("Invalid history OHLC");
    expect(() => validateHistoryPayload({ ...base, data: [{ t: null }] }, "2330")).toThrow("Invalid history OHLC");
  });
  it("rejects payloads for a different symbol", () => {
    expect(() => validateHistoryPayload({ id: "2317", name: null, data: [], price: 1, change: 0 }, "2330")).toThrow("Invalid history payload");
    expect(() => validateTickPayload({ id: "2317" }, "2330")).toThrow("Invalid tick payload");
  });
});
