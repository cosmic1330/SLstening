import { error } from "@tauri-apps/plugin-log";
import { useEffect, useMemo } from "react";
import useSWR from "swr";
import { tauriFetcher } from "../api/http";
import { DealTableType, UrlTaPerdOptions, UrlType } from "../types";
import generateFuturesDealDataDownloadUrl, { FutureIds } from "../utils/generateFuturesDealDataDownloadUrl";

export default function useWtxDeals() {
  const { data: hourlyData, mutate: mutateHourlyDeals } = useSWR(
    generateFuturesDealDataDownloadUrl({type:UrlType.Indicators, id: FutureIds.WTX, perd: UrlTaPerdOptions.Day}),
    tauriFetcher
  );

  // 檢查當前時間是否在台灣時間 8:00 AM 到 1:30 PM 之間
  const checkTimeRange = () => {
    const taiwanTime = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Taipei",
    });
    const hours = new Date(taiwanTime).getHours();
    const minutes = new Date(taiwanTime).getMinutes();
    // 9:00 AM 至 1:30 PM 時間範圍
    return hours >= 9 && (hours < 13 || (hours === 13 && minutes <= 30));
  };

  useEffect(() => {
    const isInTime = checkTimeRange();
    if (!isInTime) return; // 如果不在時間範圍內，則不啟動定時器
    const interval = setInterval(() => {
      const isInTime = checkTimeRange();
      if (isInTime) {
        // 自動重新請求
        mutateHourlyDeals();
      }
    }, 10000); // 每 10 秒檢查一次

    return () => clearInterval(interval); // 清除定時器
  }, [mutateHourlyDeals]);

  const deals = useMemo(() => {
    try {
      if (!hourlyData) throw new Error("hourlyData is null");
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
