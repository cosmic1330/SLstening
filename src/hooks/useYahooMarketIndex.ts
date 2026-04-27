import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import { marketApi } from "../api/marketApi";
import useDebugStore from "../store/debug.store";
import { isTaiwanMarketOpen } from "../utils/marketUtils";

export default function useYahooMarketIndex(
  symbol: string,
  debugKey: "otc" | "twse",
  isVisible: boolean = true,
) {
  // 獲取 Tick 資料
  const {
    data: tickDeals,
    mutate: mutateTickDeals,
    isValidating: isTickValidating,
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
    },
  );

  // 獲取歷史資料
  const {
    data: historyData,
    mutate: mutateHourlyDeals,
    isValidating: isHourlyValidating,
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
    },
  );

  const hasFetched = useRef(false);
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
      change: historyData.change ?? 0, 
      price: historyData.price 
    };
  }, [historyData]);

  return { deals, tickDeals };
}
