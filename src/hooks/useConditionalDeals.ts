import { info } from "@tauri-apps/plugin-log";
import { useEffect, useMemo } from "react";
import useSWR from "swr";
import { tauriFetcher } from "../api/http";
import { TickDealsType, UrlTaPerdOptions, UrlType } from "../types";
import {
  analyzeIndicatorsData,
  IndicatorsDateTimeType,
} from "../utils/analyzeIndicatorsData";
import checkTimeRange from "../utils/checkTimeRange";
import generateDealDataDownloadUrl from "../utils/generateDealDataDownloadUrl";

export default function useConditionalDeals(
  id: string,
  enabled: boolean = true
) {
  const { data: tickData, mutate: mutateTickDeals } = useSWR(
    enabled
      ? generateDealDataDownloadUrl({
          type: UrlType.Tick,
          id,
        })
      : null,
    tauriFetcher
  );
  const { data: dailyData, mutate: mutateDailyDeals } = useSWR(
    enabled
      ? generateDealDataDownloadUrl({
          type: UrlType.Indicators,
          id,
          perd: UrlTaPerdOptions.Day,
        })
      : null,
    tauriFetcher
  );

  useEffect(() => {
    if (!enabled) return; // 如果未啟用，不啟動定時器

    const taiwanTime = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Taipei",
    });
    const isInTime = checkTimeRange(taiwanTime);
    if (!isInTime) return; // 如果不在時間範圍內，則不啟動定時器

    const interval = setInterval(() => {
      const taiwanTime = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Taipei",
      });
      const isInTime = checkTimeRange(taiwanTime);
      if (isInTime) {
        // 自動重新請求
        mutateDailyDeals();
        console.log("Mutate daily deals for stock:", id);
        mutateTickDeals();
      }
    }, 10000); // 每 10 秒檢查一次

    return () => clearInterval(interval); // 清除定時器
  }, [mutateDailyDeals, mutateTickDeals, enabled, id]);

  const tickDeals = useMemo(() => {
    try {
      if (!tickData) throw new Error("tickData is null");
      const data = JSON.parse(tickData);
      const closes = data[0].chart.indicators.quote[0].close.filter(
        (item: number | null) => item !== null
      );
      const highs = data[0].chart.indicators.quote[0].high.filter(
        (item: number | null) => item !== null
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
