/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import useMarketDataStore from "../../store/MarketData.store";
import useMarketWatcher from "../useMarketWatcher";

const listenMock = vi.hoisted(() => vi.fn());
const unlistenMock = vi.hoisted(() => vi.fn());
const frontendSubscriberCountMock = vi.hoisted(() => vi.fn());
let marketUpdateHandler: ((event: any) => void) | undefined;

vi.mock("@tauri-apps/api/event", () => ({
  listen: listenMock,
}));

vi.mock("../useMarketSubscriber", () => ({
  getFrontendSubscriberCount: frontendSubscriberCountMock,
}));

describe("useMarketWatcher", () => {
  beforeEach(() => {
    marketUpdateHandler = undefined;
    listenMock.mockReset();
    unlistenMock.mockReset();
    useMarketDataStore.setState({
      ticks: new Map(),
      tickUpdatedAt: new Map(),
    });
    frontendSubscriberCountMock.mockReturnValue(1);

    listenMock.mockImplementation(
      (_eventName: string, handler: (event: any) => void) => {
        marketUpdateHandler = handler;
        return Promise.resolve(unlistenMock);
      },
    );
  });

  it("maps a Rust Tick event into Zustand and removes the listener", async () => {
    const { unmount } = renderHook(() => useMarketWatcher());

    await waitFor(() => {
      expect(listenMock).toHaveBeenCalledWith(
        "market-update",
        expect.any(Function),
      );
    });

    act(() => {
      marketUpdateHandler?.({
        payload: {
          type: "Tick",
          payload: {
            id: "2330",
            name: "台積電",
            price: 1_000,
            change_percent: 2.5,
            refreshed_ts: 1_700_000_000,
            closes: [990, 1_000],
            avg_prices: [990, 995],
            previous_close: 975,
            timestamps: [1_699_999_940, 1_700_000_000],
            volume: 123_456,
          },
        },
      });
    });

    expect(useMarketDataStore.getState().getTick("2330")).toEqual({
      id: "2330",
      name: "台積電",
      price: 1_000,
      changePercent: 2.5,
      ts: 1_700_000_000,
      closes: [990, 1_000],
      avgPrices: [990, 995],
      previousClose: 975,
      timestamps: [1_699_999_940, 1_700_000_000],
      volume: 123_456,
    });
    expect(
      useMarketDataStore.getState().tickUpdatedAt.get("2330"),
    ).toBeTypeOf("number");

    unmount();
    expect(unlistenMock).toHaveBeenCalledOnce();
  });

  it("removes a listener that resolves after the component has unmounted", async () => {
    let resolveListen: ((unlisten: () => void) => void) | undefined;
    listenMock.mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveListen = resolve;
      }),
    );

    const { unmount } = renderHook(() => useMarketWatcher());
    unmount();

    await act(async () => {
      resolveListen?.(unlistenMock);
    });

    expect(unlistenMock).toHaveBeenCalledOnce();
  });

  it("ignores delayed native ticks after the final frontend subscriber leaves", async () => {
    const { unmount } = renderHook(() => useMarketWatcher());

    await waitFor(() => {
      expect(listenMock).toHaveBeenCalledOnce();
    });

    useMarketDataStore.getState().updateTick({
      id: "2330", name: "台積電", price: 999, changePercent: 0, ts: 1,
      closes: [], avgPrices: [], previousClose: 999, timestamps: [],
    });
    useMarketDataStore.getState().clearTick("2330");
    frontendSubscriberCountMock.mockReturnValue(0);

    act(() => {
      marketUpdateHandler?.({
        payload: {
          type: "Tick",
          payload: { id: "2330", price: 1_001 },
        },
      });
    });

    expect(useMarketDataStore.getState().getTick("2330")).toBeUndefined();
    unmount();
  });

  it("writes an event while a frontend subscriber still owns the symbol", async () => {
    renderHook(() => useMarketWatcher());

    await waitFor(() => {
      expect(listenMock).toHaveBeenCalledOnce();
    });
    frontendSubscriberCountMock.mockReturnValue(1);

    act(() => {
      marketUpdateHandler?.({
        payload: {
          type: "Tick",
          payload: {
            id: "2330", price: 1_000, change_percent: 2.5, refreshed_ts: 1,
            closes: [], avg_prices: [], previous_close: 975, timestamps: [],
          },
        },
      });
    });

    expect(useMarketDataStore.getState().getTick("2330")?.price).toBe(1_000);
  });

  it("absorbs native listener registration failures", async () => {
    listenMock.mockRejectedValueOnce(new Error("native listener unavailable"));

    renderHook(() => useMarketWatcher());

    await act(async () => undefined);
    expect(listenMock).toHaveBeenCalledOnce();
  });
});
