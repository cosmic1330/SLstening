import { info } from "@tauri-apps/plugin-log";
import { useEffect, useMemo } from "react";
import useSWR from "swr";
import { tauriFetcher } from "../api/http";
import useDebugStore from "../store/debug.store";
import { TickDealsType, UrlTaPerdOptions, UrlType } from "../types";
import {
  analyzeIndicatorsData,
  IndicatorsDateTimeType,
} from "../utils/analyzeIndicatorsData";
import checkTimeRange from "../utils/checkTimeRange";
import generateDealDataDownloadUrl from "../utils/generateDealDataDownloadUrl";

export default function useConditionalDeals(
  id: string,
  enabled: boolean = true,
  isVisible: boolean = true,
) {
  const { data: tickData, mutate: mutateTickDeals } = useSWR(
    enabled
      ? generateDealDataDownloadUrl({
          type: UrlType.Tick,
          id,
        })
      : null,
    (url: string) => {
      useDebugStore.getState().increment("conditional");
      return tauriFetcher(url);
    },
    {
      isPaused: () => !enabled || document.visibilityState !== "visible",
    },
  );
  const { data: dailyData, mutate: mutateDailyDeals } = useSWR(
    enabled
      ? generateDealDataDownloadUrl({
          type: UrlType.Indicators,
          id,
          perd: UrlTaPerdOptions.Day,
        })
      : null,
    (url: string) => {
      useDebugStore.getState().increment("conditional");
      return tauriFetcher(url);
    },
    {
      isPaused: () => !enabled || document.visibilityState !== "visible",
    },
  );

  useEffect(() => {
    if (!enabled) return; // 如果未啟用，不啟動定時器

    const taiwanTime = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Taipei",
    });
    const now = new Date(taiwanTime);
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const isInTime =
      hours >= 9 && (hours < 13 || (hours === 13 && minutes <= 30));

    if (!isInTime) return; // 如果不在時間範圍內，則不啟動定時器

    const interval = setInterval(() => {
      const taiwanTime = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Taipei",
      });
      const isInTime = checkTimeRange(taiwanTime);
      if (
        isInTime &&
        document.visibilityState === "visible" &&
        enabled &&
        isVisible
      ) {
        // 自動重新請求
        mutateDailyDeals();
        console.log("Mutate daily deals for stock:", id);
        mutateTickDeals();
      }
    }, 10000); // 統一改為 10 秒

    return () => clearInterval(interval); // 清除定時器
  }, [mutateDailyDeals, mutateTickDeals, enabled, id]);

  useEffect(() => {
    if (enabled) {
      useDebugStore.getState().updateActiveInstances(1);
      return () => useDebugStore.getState().updateActiveInstances(-1);
    }
  }, [enabled]);

  const tickDeals = useMemo(() => {
    try {
      if (!tickData) return null;
      const data = JSON.parse(tickData);
      const closes = data[0].chart.indicators.quote[0].close.filter(
        (item: number | null) => item !== null,
      );
      const highs = data[0].chart.indicators.quote[0].high.filter(
        (item: number | null) => item !== null,
      );
      const quote = data[0]?.chart?.quote || {};
      const changePercent = quote.changePercent;
      const price = quote.price;
      const previousClose = quote.previousClose;
      let pre = 0;
      const avgPrices = (highs || []).map((item: number, index: number) => {
        pre += item;
        return pre / (index + 1);
      });

      let ts = data[0].chart.quote.refreshedTs;
      const res: TickDealsType = {
        id,
        ts,
        price,
        avgPrices,
        changePercent,
        closes,
        previousClose,
      };
      return res;
    } catch (e) {
      info(`Error parsing tickData: ${e}`);
      return null;
    }
  }, [tickData, id]);

  const deals = useMemo(() => {
    if (!dailyData) return [];
    return analyzeIndicatorsData(dailyData, IndicatorsDateTimeType.Date);
  }, [dailyData]);

  const name = useMemo(() => {
    let name = "null";
    if (!dailyData) return name;

    const match = dailyData.match(/name":"([^"]*)"/);
    if (match) {
      name = match[1];
    }
    return name;
  }, [dailyData]);

  return { deals, name, tickDeals };
}
