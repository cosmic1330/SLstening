import { describe, expect, it } from "vitest";
import { deriveMarketResourceState } from "../marketResourceState";

describe("deriveMarketResourceState", () => {
  it.each([
    [{ enabled: true, hasData: false, resolved: false }, "loading"],
    [{ enabled: true, hasData: false, resolved: true }, "empty"],
    [{ enabled: true, hasData: false, resolved: true, error: new Error("x") }, "error"],
    [{ enabled: true, hasData: true, resolved: true }, "ready"],
  ] as const)("derives %s", (input, phase) => expect(deriveMarketResourceState(input).phase).toBe(phase));

  it("keeps data during refresh failures and marks it stale", () => {
    const state = deriveMarketResourceState({ enabled: true, hasData: true, resolved: true, isValidating: true, error: new Error("offline"), marketSession: "open" });
    expect(state).toMatchObject({ phase: "ready", freshness: "stale", isRefreshing: true, error: expect.any(Error) });
  });

  it("treats no-data revalidation as loading", () => {
    expect(deriveMarketResourceState({ enabled: true, hasData: false, resolved: true, isValidating: true })).toMatchObject({ phase: "loading", isRefreshing: false });
  });

  it("keeps an error visible while its no-data retry is refreshing", () => {
    expect(deriveMarketResourceState({ enabled: true, hasData: false, resolved: true, isValidating: true, error: new Error("offline") })).toMatchObject({ phase: "error", isRefreshing: true, error: expect.any(Error) });
  });

  it("does not age last-close data while closed", () => {
    expect(deriveMarketResourceState({ enabled: true, hasData: true, resolved: true, updatedAt: 0, staleAfterMs: 1, now: 10, marketSession: "closed" }).freshness).toBe("fresh");
  });
  it("leaves untimestamped retained data freshness unknown and ages at threshold", () => {
    expect(deriveMarketResourceState({ enabled: true, hasData: true, resolved: true }).freshness).toBe("unknown");
    expect(deriveMarketResourceState({ enabled: true, hasData: true, resolved: true, updatedAt: 0, staleAfterMs: 10, now: 9, marketSession: "open" }).freshness).toBe("fresh");
    expect(deriveMarketResourceState({ enabled: true, hasData: true, resolved: true, updatedAt: 0, staleAfterMs: 10, now: 10, marketSession: "open" }).freshness).toBe("stale");
  });
});
