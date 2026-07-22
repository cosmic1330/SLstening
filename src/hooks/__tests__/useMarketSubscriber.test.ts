/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useMarketSubscriber from "../useMarketSubscriber";

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

describe("useMarketSubscriber", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    invokeMock.mockReset();
    invokeMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("subscribes after the visibility debounce and unsubscribes on cleanup", () => {
    const { unmount } = renderHook(() =>
      useMarketSubscriber("2330", true, true),
    );

    act(() => {
      vi.advanceTimersByTime(1_499);
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
});
