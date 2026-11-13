/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";
import useNasdaqDeals, { useYahooHistoryDeals } from "./useNasdaqDeals";
import useWtxDeals from "./useWtxDeals";
import { FutureIds } from "../types";

const marketApiMock = vi.hoisted(() => ({
  getHistoryData: vi.fn(),
}));

vi.mock("../api/marketApi", () => ({ marketApi: marketApiMock }));
vi.mock("./marketOverviewPolicy", () => ({
  MARKET_OVERVIEW_HISTORY_REFRESH_INTERVAL_MS: 100,
  MARKET_OVERVIEW_SWR_POLICY: {
    revalidateOnFocus: false,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    shouldRetryOnError: true,
    errorRetryInterval: 100,
  },
}));
vi.mock("../store/debug.store", () => ({
  default: { getState: () => ({ increment: vi.fn() }) },
}));
vi.mock("./useMarketSession", () => ({
  useDocumentVisibility: () => true,
  useFreshnessNow: (updatedAt: number | undefined) => updatedAt ?? Date.now(),
  useMarketSession: () => "open",
}));

const wrapper = ({ children }: { children: ReactNode }) => createElement(
  SWRConfig,
  { value: { provider: () => new Map(), dedupingInterval: 0 } },
  children,
);

describe("market overview hook retries", () => {
  beforeEach(() => {
    marketApiMock.getHistoryData.mockReset();
    marketApiMock.getHistoryData.mockRejectedValue(new Error("API_BLOCKED"));
  });

  it("loads SOX history for the semiconductor chart", async () => {
    marketApiMock.getHistoryData.mockResolvedValue({
      id: FutureIds.SOX,
      name: "PHLX Semiconductor",
      data: [{ t: 1, o: 1, h: 2, l: 1, c: 2, v: 0 }],
      price: 2,
      change: 1,
    });

    const { unmount } = renderHook(
      () => useYahooHistoryDeals(FutureIds.SOX, "conditional", true),
      { wrapper },
    );

    await waitFor(() => expect(marketApiMock.getHistoryData).toHaveBeenCalledWith(FutureIds.SOX, "d"));
    unmount();
  });

  it.each([
    ["NASDAQ", useNasdaqDeals],
    ["WTX", useWtxDeals],
  ])("does not immediately retry a failed %s initial request", async (_, useOverview) => {
    const { rerender, unmount } = renderHook(() => useOverview(true), { wrapper });

    await waitFor(() => expect(marketApiMock.getHistoryData).toHaveBeenCalledTimes(1));
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 50));
    });
    rerender();

    expect(marketApiMock.getHistoryData).toHaveBeenCalledTimes(1);
    unmount();
  });

  it.each([
    ["NASDAQ", useNasdaqDeals],
    ["WTX", useWtxDeals],
  ])("recovers %s on the next market interval after a transient error", async (_, useOverview) => {
    marketApiMock.getHistoryData.mockReset();
    marketApiMock.getHistoryData
      .mockRejectedValueOnce(new Error("TEMPORARY_FAILURE"))
      .mockResolvedValue({ id: "test", name: null, data: [{ t: 1, o: 1, h: 1, l: 1, c: 1, v: 1 }], price: 1, change: 0 });
    const { unmount } = renderHook(() => useOverview(true), { wrapper });
    await waitFor(() => expect(marketApiMock.getHistoryData).toHaveBeenCalledTimes(2));
    unmount();
  });
});
