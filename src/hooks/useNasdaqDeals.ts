import { error } from "@tauri-apps/plugin-log";
import { useEffect, useMemo } from "react";
import useSWR from "swr";
import { tauriFetcher } from "../api/http";
import useDebugStore from "../store/debug.store";
import { DealTableType, FutureIds } from "../types";

export default function useNasdaqDeals(isVisible: boolean = true) {
  const { data: hourlyData, mutate: mutateHourlyDeals } = useSWR(
    `https://query1.finance.yahoo.com/v8/finance/chart/${FutureIds.NASDAQ_FUTURE}?interval=1d&range=200d`,
    (url) => {
      useDebugStore.getState().increment("nasdaq");
      return tauriFetcher(url);
    },
    { isPaused: () => document.visibilityState !== "visible" },
  );

  // 檢查當前時間是否在台灣時間 9:00 AM 到 1:30 PM 之間
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

  useEffect(() => {
    const isInTime = checkTimeRange();
    if (!isInTime) return; // 如果不在時間範圍內，則不啟動定時器
    const interval = setInterval(() => {
      const isInTime = checkTimeRange();
      if (isInTime && document.visibilityState === "visible" && isVisible) {
        // 自動重新請求
        mutateHourlyDeals();
      }
    }, 10000); // 統一改為 10 秒

    return () => clearInterval(interval); // 清除定時器
  }, [mutateHourlyDeals, isVisible]);

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
