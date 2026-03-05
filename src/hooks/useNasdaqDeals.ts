import { error } from "@tauri-apps/plugin-log";
import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import { tauriFetcher } from "../api/http";
import useDebugStore from "../store/debug.store";
import { DealTableType, FutureIds } from "../types";

export default function useNasdaqDeals(isVisible: boolean = true) {
  const checkTimeRange = () => {
    const taiwanTime = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Taipei",
    });
    const now = new Date(taiwanTime);
    const hours = now.getHours();
    const minutes = now.getMinutes();
    // 9:00 AM 至 1:30 PM 時間範圍
    return hours >= 9 && (hours < 13 || (hours === 13 && minutes <= 30));
  };

  const {
    data: hourlyData,
    mutate: mutateHourlyDeals,
    isValidating: isHourlyValidating,
  } = useSWR(
    `https://query1.finance.yahoo.com/v8/finance/chart/${FutureIds.NASDAQ_FUTURE}?interval=1d&range=200d`,
    (url) => {
      useDebugStore.getState().increment("nasdaq");
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
      const opens = data.chart.result[0].indicators.quote[0].open;
      const closes = data.chart.result[0].indicators.quote[0].close;
      const highs = data.chart.result[0].indicators.quote[0].high;
      const lows = data.chart.result[0].indicators.quote[0].low;
      const volumes = data.chart.result[0].indicators.quote[0].volume;
      const ts = data.chart.result[0].timestamp;
      const change = Math.round((closes.at(-1) - closes.at(-2)) * 100) / 100;
      const price = Math.round(
        data.chart.result[0].indicators.quote[0].close.at(-1) || 0,
      );

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

      return { data: res, price, change };
    } catch (e) {
      error(`Error parsing hourlyData: ${e}`);
      return null;
    }
  }, [hourlyData]);

  return { deals };
}
