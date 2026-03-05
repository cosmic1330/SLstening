import { error } from "@tauri-apps/plugin-log";
import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import { tauriFetcher } from "../api/http";
import useDebugStore from "../store/debug.store";
import { DealTableType, FutureIds, UrlTaPerdOptions, UrlType } from "../types";
import generateDealDataDownloadUrl from "../utils/generateDealDataDownloadUrl";

export default function useWtxDeals(isVisible: boolean = true) {
  const checkTimeRange = () => {
    const taiwanTime = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Taipei",
    });
    const now = new Date(taiwanTime);
    const hours = now.getHours();
    const minutes = now.getMinutes();

    return hours >= 9 && (hours < 13 || (hours === 13 && minutes <= 30));
  };

  const {
    data: hourlyData,
    mutate: mutateHourlyDeals,
    isValidating: isHourlyValidating,
  } = useSWR(
    generateDealDataDownloadUrl({
      type: UrlType.Indicators,
      id: FutureIds.WTX,
      perd: UrlTaPerdOptions.Day,
    }),
    (url) => {
      useDebugStore.getState().increment("wtx");
      return tauriFetcher(url);
    },
    {
      isPaused: () => !isVisible || document.visibilityState !== "visible",
      refreshInterval: () => (checkTimeRange() ? 10000 : 0),
    },
  );

  const hasFetched = useRef(false);
  useEffect(() => {
    if (isVisible && !hasFetched.current) {
      if (!isHourlyValidating) mutateHourlyDeals();
    }

    if (hourlyData) {
      hasFetched.current = true;
    }
  }, [isVisible, mutateHourlyDeals, hourlyData, isHourlyValidating]);

  const deals = useMemo(() => {
    try {
      if (!hourlyData) return null;
      const data = JSON.parse(hourlyData);
      const opens = data[0].chart.indicators.quote[0].open;
      const closes = data[0].chart.indicators.quote[0].close;
      const highs = data[0].chart.indicators.quote[0].high;
      const lows = data[0].chart.indicators.quote[0].low;
      const volumes = data[0].chart.indicators.quote[0].volume;
      const ts = data[0].chart.timestamp;
      const change = data[0].chart.quote.change;
      const price = data[0].chart.quote.price;

      const res: (Omit<DealTableType, "stock_id" | "t"> & { t: number })[] = [];
      for (let i = 0; i < opens.length; i++) {
        if (opens[i] !== null) {
          res.push({
            t: ts[i],
            o: opens[i],
            c: closes[i],
            h: highs[i],
            l: lows[i],
            v: volumes[i],
          });
        }
      }

      return { data: res, change, price };
    } catch (e) {
      error(`Error parsing hourlyData: ${e}`);
      return null;
    }
  }, [hourlyData]);

  return { deals };
}
