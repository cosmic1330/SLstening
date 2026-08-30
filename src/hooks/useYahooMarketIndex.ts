import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { marketApi } from "../api/marketApi";
import useDebugStore from "../store/debug.store";
import { isTaiwanMarketOpen } from "../utils/marketUtils";
import { deriveMarketResourceState } from "../utils/marketResourceState";
import { useFreshnessNow, useMarketSession } from "./useMarketSession";

export default function useYahooMarketIndex(
  symbol: string,
  debugKey: "otc" | "twse",
  isVisible: boolean = true,
) {
  // 獲取 Tick 資料
  const {
    data: tickDeals,
    mutate: mutateTickDeals,
    isValidating: isTickValidating, isLoading: tickLoading, error: tickError,
  } = useSWR(
    isVisible ? `market/tick/${symbol}` : null,
    async () => {
      useDebugStore.getState().increment(debugKey);
      return await marketApi.getTickData(symbol);
    },
    {
      isPaused: () => !isVisible || document.visibilityState !== "visible",
      refreshInterval: () => (isTaiwanMarketOpen() ? 20000 : 0), // 延長至 20 秒，減少後端負擔
      dedupingInterval: 5000,
      onSuccess: () => setTickUpdatedAt(Date.now()),
    },
  );

  // 獲取歷史資料
  const {
    data: historyData,
    mutate: mutateHourlyDeals,
    isValidating: isHourlyValidating, isLoading: historyLoading, error: historyError,
  } = useSWR(
    isVisible ? `market/history/${symbol}` : null,
    async () => {
      useDebugStore.getState().increment(debugKey);
      return await marketApi.getHistoryData(symbol, "60m");
    },
    {
      isPaused: () => !isVisible || document.visibilityState !== "visible",
      refreshInterval: () => (isTaiwanMarketOpen() ? 60000 : 0), // 指數歷史資料不需要頻繁更新
      dedupingInterval: 10000,
      onSuccess: () => setHistoryUpdatedAt(Date.now()),
    },
  );

  const hasFetched = useRef(false);
  const [tickUpdatedAt, setTickUpdatedAt] = useState<number>();
  const [historyUpdatedAt, setHistoryUpdatedAt] = useState<number>();
  useEffect(() => {
    if (isVisible && !hasFetched.current) {
      if (!isTickValidating) mutateTickDeals();
      if (!isHourlyValidating) mutateHourlyDeals();
    }

    if (tickDeals || historyData) {
      hasFetched.current = true;
    }
  }, [
    isVisible,
    mutateTickDeals,
    mutateHourlyDeals,
    tickDeals,
    historyData,
    isTickValidating,
    isHourlyValidating,
  ]);

  const deals = useMemo(() => {
    if (!historyData) return null;
    return { 
      id: historyData.id,
      name: historyData.name,
      data: historyData.data, 
      change: historyData.change ?? null,
      price: historyData.price 
    };
  }, [historyData]);

  const marketSession = useMarketSession(symbol);
  const tickNow = useFreshnessNow(tickUpdatedAt, 30_000, marketSession);
  const historyNow = useFreshnessNow(historyUpdatedAt, 60_000, marketSession);
  const tickState = useMemo(() => deriveMarketResourceState({ enabled: isVisible, hasData: Boolean(tickDeals), resolved: tickDeals !== undefined, isLoading: tickLoading, isValidating: isTickValidating, error: tickError, updatedAt: tickUpdatedAt, marketSession, staleAfterMs: 30_000, now: tickNow }), [isVisible, tickDeals, tickLoading, isTickValidating, tickError, tickUpdatedAt, marketSession, tickNow]);
  const historyState = useMemo(() => deriveMarketResourceState({ enabled: isVisible, hasData: Boolean(deals?.data?.length), resolved: historyData !== undefined, isLoading: historyLoading, isValidating: isHourlyValidating, error: historyError, updatedAt: historyUpdatedAt, marketSession, staleAfterMs: 60_000, now: historyNow }), [isVisible, deals, historyData, historyLoading, isHourlyValidating, historyError, historyUpdatedAt, marketSession, historyNow]);
  return { deals, tickDeals, tickState, historyState, retryTick: mutateTickDeals, retryHistory: mutateHourlyDeals };
}
