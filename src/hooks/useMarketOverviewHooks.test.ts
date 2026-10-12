/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";
import useNasdaqDeals from "./useNasdaqDeals";
import useWtxDeals from "./useWtxDeals";

const marketApiMock = vi.hoisted(() => ({
  getHistoryData: vi.fn(),
}));

vi.mock("../api/marketApi", () => ({ marketApi: marketApiMock }));
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

  it.each([
    ["NASDAQ", useNasdaqDeals],
    ["WTX", useWtxDeals],
  ])("does not automatically retry a failed %s initial request", async (_, useOverview) => {
    const { rerender, unmount } = renderHook(() => useOverview(true), { wrapper });

    await waitFor(() => expect(marketApiMock.getHistoryData).toHaveBeenCalledTimes(1));
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 50));
    });
    rerender();

    expect(marketApiMock.getHistoryData).toHaveBeenCalledTimes(1);
    unmount();
  });
});
