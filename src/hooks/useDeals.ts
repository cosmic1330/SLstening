import { info } from "@tauri-apps/plugin-log";
import { useEffect, useMemo } from "react";
import useSWR from "swr";
import { tauriFetcher } from "../api/http";
import { TaType, TickDealsType, UrlTaPerdOptions, UrlType } from "../types";
import generateDealDataDownloadUrl from "../utils/generateDealDataDownloadUrl";

export default function useDeals(id: string) {
  const { data: tickData, mutate: mutateTickDeals } = useSWR(
    generateDealDataDownloadUrl({
      type: UrlType.Tick,
      id,
    }),
    tauriFetcher
  );
  const { data: dailyData, mutate: mutateDailyDeals } = useSWR(
    generateDealDataDownloadUrl({
      type: UrlType.Ta,
      id,
      perd: UrlTaPerdOptions.Day,
    }),
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
        mutateDailyDeals();
        mutateTickDeals();
      }
    }, 10000); // 每 10 秒檢查一次

    return () => clearInterval(interval); // 清除定時器
  }, [mutateDailyDeals, mutateTickDeals]);

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
      const changePercent = data[0].chart.quote.changePercent;
      const price = data[0].chart.quote.price;
      const previousClose = data[0].chart.quote.previousClose;
      let pre = 0;
      const avgPrices = highs.map((item: number, index: number) => {
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
  }, [tickData]);

  const deals = useMemo(() => {
    if (!dailyData) return [];
    const ta_index = dailyData.indexOf('"ta":');
    const json_ta = "{" + dailyData.slice(ta_index).replace(");", "");
    const parse = JSON.parse(json_ta);
    const response = parse.ta as TaType;
    return response;
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
