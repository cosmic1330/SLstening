import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import { tauriFetcher } from "../api/http";
import useDebugStore from "../store/debug.store";
import { FutureIds } from "../types";
import { isTaiwanMarketOpen, parseYahooHourlyData, parseYahooTickData } from "../utils/marketUtils";

export default function useYahooMarketIndex(
  id: FutureIds,
  tickUrl: string,
  hourlyUrl: string,
  debugKey: "otc" | "twse",
  isVisible: boolean = true,
) {
  const {
    data: tickData,
    mutate: mutateTickDeals,
    isValidating: isTickValidating,
  } = useSWR(
    tickUrl,
    (url) => {
      useDebugStore.getState().increment(debugKey);
      return tauriFetcher(url);
    },
    {
      isPaused: () => !isVisible || document.visibilityState !== "visible",
      refreshInterval: () => (isTaiwanMarketOpen() ? 10000 : 0),
    },
  );

  const {
    data: hourlyData,
    mutate: mutateHourlyDeals,
    isValidating: isHourlyValidating,
  } = useSWR(
    hourlyUrl,
    (url) => {
      useDebugStore.getState().increment(debugKey);
      return tauriFetcher(url);
    },
    {
      isPaused: () => !isVisible || document.visibilityState !== "visible",
      refreshInterval: () => (isTaiwanMarketOpen() ? 10000 : 0),
    },
  );

  const hasFetched = useRef(false);
  useEffect(() => {
    if (isVisible && !hasFetched.current) {
      if (!isTickValidating) mutateTickDeals();
      if (!isHourlyValidating) mutateHourlyDeals();
    }

    if (tickData || hourlyData) {
      hasFetched.current = true;
    }
  }, [
    isVisible,
    mutateTickDeals,
    mutateHourlyDeals,
    tickData,
    hourlyData,
    isTickValidating,
    isHourlyValidating,
  ]);

  const tickDeals = useMemo(() => {
    if (!tickData) return null;
    return parseYahooTickData(tickData, id);
  }, [tickData, id]);

  const deals = useMemo(() => {
    if (!hourlyData) return null;
    return parseYahooHourlyData(hourlyData);
  }, [hourlyData]);

  return { deals, tickDeals };
}
