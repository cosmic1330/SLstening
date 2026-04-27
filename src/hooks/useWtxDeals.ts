import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import { marketApi } from "../api/marketApi";
import useDebugStore from "../store/debug.store";
import { FutureIds } from "../types";
import { isTaiwanMarketOpen } from "../utils/marketUtils";

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
      refreshInterval: () => (isTaiwanMarketOpen() ? 30000 : 0),
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
    return {
      data: historyData.data,
      change: historyData.change ?? 0,
      price: historyData.price,
    };
  }, [historyData]);

  return { deals };
}
