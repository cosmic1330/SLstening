import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import { marketApi } from "../api/marketApi";
import useDebugStore from "../store/debug.store";
import { FutureIds } from "../types";
import { isWtxMarketOpen } from "../utils/marketUtils";

export default function useWtxDeals(isVisible: boolean = true) {
  const {
    data: historyData,
    mutate: mutateHourlyDeals,
    isValidating: isHourlyValidating,
  } = useSWR(
    isVisible ? `market/history/${FutureIds.WTX}` : null,
    async () => {
      useDebugStore.getState().increment("wtx");
      return await marketApi.getHistoryData(FutureIds.WTX, "d");
    },
    {
      isPaused: () => !isVisible || document.visibilityState !== "visible",
      refreshInterval: () => (isWtxMarketOpen() ? 30000 : 0),
      dedupingInterval: 10000,
    },
  );

  const hasFetched = useRef(false);
  useEffect(() => {
    if (isVisible && !hasFetched.current) {
      if (!isHourlyValidating) mutateHourlyDeals();
    }

    if (historyData) {
      hasFetched.current = true;
    }
  }, [isVisible, mutateHourlyDeals, historyData, isHourlyValidating]);

  const deals = useMemo(() => {
    if (!historyData) return null;
    
    let price = historyData.price;
    let change = historyData.change ?? 0;
    
    // 如果 price 為 0 且有歷史資料，則取最後一筆的收盤價
    if (price === 0 && historyData.data && historyData.data.length > 0) {
      price = historyData.data[historyData.data.length - 1].c;
    }
    
    // 如果 change 為 0 且有歷史資料，則嘗試計算漲跌
    if (change === 0 && historyData.data && historyData.data.length >= 2) {
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

  return { deals };
}
