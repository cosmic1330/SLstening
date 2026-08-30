/** @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { marketSessionForSymbol, useDocumentVisibility, useFreshnessNow, useMarketSession } from "../useMarketSession";
import { FutureIds } from "../../types";

afterEach(() => vi.useRealTimers());

describe("marketSessionForSymbol", () => {
  it("selects the exchange calendar by symbol", () => {
    const date = new Date("2024-07-01T13:30:00Z");
    expect(marketSessionForSymbol(FutureIds.NASDAQ, date)).toBe("open");
    expect(marketSessionForSymbol("2330", date)).toBe("closed");
    expect(marketSessionForSymbol(FutureIds.WTX, new Date("2024-06-14T18:00:00Z"))).toBe("open");
  });

  it("reacts when the session boundary is crossed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-07-01T13:29:45Z"));
    const { result } = renderHook(() => useMarketSession(FutureIds.NASDAQ));
    expect(result.current).toBe("closed");
    act(() => vi.advanceTimersByTime(30_000));
    expect(result.current).toBe("open");
  });

  it("rerenders at the exact freshness threshold", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    const { result } = renderHook(() => useFreshnessNow(1_000, 100, "open"));
    expect(result.current).toBe(1_000);
    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe(1_100);
  });

  it("reacts when a hidden document becomes visible", () => {
    let visibility = "hidden";
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
    const { result } = renderHook(() => useDocumentVisibility());
    expect(result.current).toBe(false);
    act(() => {
      visibility = "visible";
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current).toBe(true);
  });
});
