/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useMarketSubscriber, { MARKET_SUBSCRIPTION_DEBOUNCE_MS } from "../useMarketSubscriber";
import useMarketDataStore from "../../store/MarketData.store";

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

describe("useMarketSubscriber", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    invokeMock.mockReset();
    invokeMock.mockResolvedValue(undefined);
    useMarketDataStore.setState({ ticks: new Map(), tickUpdatedAt: new Map() });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  });

  it("subscribes after the visibility debounce and unsubscribes on cleanup", () => {
    const { unmount } = renderHook(() =>
      useMarketSubscriber("2330", true, true),
    );

    act(() => {
      vi.advanceTimersByTime(MARKET_SUBSCRIPTION_DEBOUNCE_MS - 1);
    });
    expect(invokeMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(invokeMock).toHaveBeenNthCalledWith(1, "subscribe_stock", {
      symbol: "2330",
    });

    unmount();
    expect(invokeMock).toHaveBeenNthCalledWith(2, "unsubscribe_stock", {
      symbol: "2330",
    });
  });

  it.each([
    { enabled: false, visible: true },
    { enabled: true, visible: false },
  ])("does not subscribe when disabled or hidden", ({ enabled, visible }) => {
    renderHook(() => useMarketSubscriber("2330", enabled, visible));

    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("cancels a pending subscription when unmounted before debounce", () => {
    const { unmount } = renderHook(() =>
      useMarketSubscriber("2330", true, true),
    );

    unmount();
    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("unsubscribes when the document becomes hidden and resubscribes when visible", () => {
    let visibility: DocumentVisibilityState = "visible";
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibility,
    });
    renderHook(() => useMarketSubscriber("2330", true, true));

    act(() => vi.advanceTimersByTime(MARKET_SUBSCRIPTION_DEBOUNCE_MS));
    expect(invokeMock).toHaveBeenNthCalledWith(1, "subscribe_stock", { symbol: "2330" });

    act(() => {
      visibility = "hidden";
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(invokeMock).toHaveBeenNthCalledWith(2, "unsubscribe_stock", { symbol: "2330" });

    act(() => {
      visibility = "visible";
      document.dispatchEvent(new Event("visibilitychange"));
    });
    act(() => vi.advanceTimersByTime(MARKET_SUBSCRIPTION_DEBOUNCE_MS));
    expect(invokeMock).toHaveBeenNthCalledWith(3, "subscribe_stock", { symbol: "2330" });
  });

  it("clears the live store only after the final same-symbol subscriber leaves", () => {
    useMarketDataStore.getState().updateTick({
      id: "2330", name: "TSMC", ts: 1, price: 1, avgPrices: [],
      changePercent: 0, closes: [], previousClose: 1, timestamps: [],
    });
    const first = renderHook(() => useMarketSubscriber("2330", true, true));
    const second = renderHook(() => useMarketSubscriber("2330", true, true));
    act(() => vi.advanceTimersByTime(MARKET_SUBSCRIPTION_DEBOUNCE_MS));
    first.unmount();
    expect(useMarketDataStore.getState().getTick("2330")).toBeDefined();
    second.unmount();
    expect(useMarketDataStore.getState().getTick("2330")).toBeUndefined();
  });
});
