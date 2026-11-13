import { useMemo, useState } from "react";
import useSWR from "swr";
import { marketApi } from "../api/marketApi";
import useDebugStore from "../store/debug.store";
import { FutureIds } from "../types";
import { deriveMarketResourceState } from "../utils/marketResourceState";
import { useDocumentVisibility, useFreshnessNow, useMarketSession } from "./useMarketSession";
import { MARKET_OVERVIEW_HISTORY_REFRESH_INTERVAL_MS, MARKET_OVERVIEW_SWR_POLICY } from "./marketOverviewPolicy";

export default function useWtxDeals(isVisible: boolean = true) {
  const documentVisible = useDocumentVisibility();
  const shouldFetch = isVisible && documentVisible;
  const marketSession = useMarketSession(FutureIds.WTX);
  const {
    data: historyData,
    isValidating: isHourlyValidating, isLoading, error, mutate,
  } = useSWR(
    shouldFetch ? `market/history/${FutureIds.WTX}` : null,
    async () => {
      useDebugStore.getState().increment("wtx");
      return await marketApi.getHistoryData(FutureIds.WTX, "d");
    },
    {
      ...MARKET_OVERVIEW_SWR_POLICY,
      refreshInterval: () => shouldFetch && marketSession === "open" ? MARKET_OVERVIEW_HISTORY_REFRESH_INTERVAL_MS : 0,
      dedupingInterval: MARKET_OVERVIEW_HISTORY_REFRESH_INTERVAL_MS,
      onSuccess: () => setUpdatedAt(Date.now()),
    },
  );

  const [updatedAt, setUpdatedAt] = useState<number>();
  const deals = useMemo(() => {
    if (!historyData) return null;
    
    let price = historyData.price;
    let change = historyData.change ?? null;
    
    // 如果 price 為 0 且有歷史資料，則取最後一筆的收盤價
    if (price === 0 && historyData.data && historyData.data.length > 0) {
      price = historyData.data[historyData.data.length - 1].c;
    }
    
    // 如果 change 為 0 且有歷史資料，則嘗試計算漲跌
    if (change === null && historyData.data && historyData.data.length >= 2) {
      const last = historyData.data[historyData.data.length - 1].c;
      const prev = historyData.data[historyData.data.length - 2].c;
      change = last - prev;
    }

    return {
      data: historyData.data,
      change,
      price,
    };
  }, [historyData]);

  const now = useFreshnessNow(updatedAt, MARKET_OVERVIEW_HISTORY_REFRESH_INTERVAL_MS, marketSession);
  const state = useMemo(() => deriveMarketResourceState({ enabled: isVisible, hasData: Boolean(deals?.data?.length), resolved: historyData !== undefined, isLoading, isValidating: isHourlyValidating, error, updatedAt, marketSession, staleAfterMs: MARKET_OVERVIEW_HISTORY_REFRESH_INTERVAL_MS, now }), [isVisible, deals, historyData, isLoading, isHourlyValidating, error, updatedAt, marketSession, now]);
  return { deals, state, retry: mutate };
}
