/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useMarketDataStore from "../../store/MarketData.store";
import useConditionalDeals, {
  INITIAL_TICK_FALLBACK_DELAY_MS,
} from "../useConditionalDeals";

const marketApiMock = vi.hoisted(() => ({
  getTickData: vi.fn(),
  getHistoryData: vi.fn(),
}));

vi.mock("../../api/marketApi", () => ({
  marketApi: marketApiMock,
}));

vi.mock("../useMarketSession", () => ({
  useDocumentVisibility: () => true,
  useFreshnessNow: (updatedAt: number | undefined) => updatedAt ?? Date.now(),
  useMarketSession: () => "open",
}));

vi.mock("../../store/debug.store", () => ({
  default: {
    getState: () => ({
      increment: vi.fn(),
      updateActiveInstances: vi.fn(),
    }),
  },
}));

const tick = {
  id: "2330",
  name: "台積電",
  price: 1_000,
  changePercent: 1.2,
  ts: 1_700_000_000,
  closes: [990, 1_000],
  avgPrices: [990, 995],
  previousClose: 988,
  timestamps: [1_699_999_940, 1_700_000_000],
  volume: 10_000,
};

describe("useConditionalDeals initial tick policy", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
    marketApiMock.getTickData.mockReset();
    marketApiMock.getHistoryData.mockReset();
    marketApiMock.getHistoryData.mockResolvedValue(undefined);
    useMarketDataStore.setState({
      ticks: new Map(),
      tickUpdatedAt: new Map(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits for the subscription path before the one-shot fallback", async () => {
    marketApiMock.getTickData.mockResolvedValue(tick);
    const { unmount } = renderHook(() =>
      useConditionalDeals("2330", true, true, {
        fetchTick: true,
        fetchHistory: false,
      }),
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });
    act(() => {
      vi.advanceTimersByTime(INITIAL_TICK_FALLBACK_DELAY_MS - 1);
    });
    expect(marketApiMock.getTickData).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(marketApiMock.getTickData).toHaveBeenCalledOnce();

    unmount();
  });

  it("allows manual retry to bypass the initial fallback timeout", async () => {
    marketApiMock.getTickData.mockResolvedValue(tick);
    const { result, unmount } = renderHook(() =>
      useConditionalDeals("2317", true, true, {
        fetchTick: true,
        fetchHistory: false,
      }),
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(marketApiMock.getTickData).not.toHaveBeenCalled();

    act(() => {
      result.current.retryTick();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(marketApiMock.getTickData).toHaveBeenCalledOnce();
    expect(marketApiMock.getTickData).toHaveBeenCalledWith("2317");

    unmount();
  });

  it("does not fallback when the subscription store receives a tick first", () => {
    const { unmount } = renderHook(() =>
      useConditionalDeals("2330", true, true, {
        fetchTick: true,
        fetchHistory: false,
      }),
    );

    act(() => {
      vi.advanceTimersByTime(300);
      useMarketDataStore.getState().updateTick(tick);
    });
    act(() => {
      vi.advanceTimersByTime(INITIAL_TICK_FALLBACK_DELAY_MS);
    });

    expect(marketApiMock.getTickData).not.toHaveBeenCalled();
    unmount();
  });
});
