import { useEffect, useMemo } from "react";
import useSWR from "swr";
import { tauriFetcher } from "../api/http";
import { DealTableType, TickDealsType } from "../types";

export default function useTwseDeals() {
  const { data: tickData, mutate: mutateTickDeals } = useSWR(
    `https://tw.stock.yahoo.com/_td-stock/api/resource/FinanceChartService.ApacLibraCharts;autoRefresh=1743165248883;symbols=%5B%22%5ETWII%22%5D;type=tick?bkt=%5B%22TW-Stock-mWeb-NewTechCharts-Rampup%22%2C%22c00-stock-lumos-prod%22%5D&device=smartphone&ecma=modern&feature=enableGAMAds%2CenableGAMEdgeToEdge%2CenableEvPlayer%2CenableHighChart&intl=tw&lang=zh-Hant-TW&partner=none&prid=4ls9nghjud5o5&region=TW&site=finance&tz=Asia%2FTaipei&ver=1.4.511`,
    tauriFetcher
  );
  const { data: hourlyData, mutate: mutateHourlyDeals } = useSWR(
    `https://tw.stock.yahoo.com/_td-stock/api/resource/FinanceChartService.ApacLibraCharts;period=60m;symbols=%5B%22%5ETWII%22%5D?bkt=%5B%22TW-Stock-mWeb-NewTechCharts-Rampup%22%2C%22c00-stock-lumos-prod%22%5D&device=smartphone&ecma=modern&feature=enableGAMAds%2CenableGAMEdgeToEdge%2CenableEvPlayer%2CenableHighChart&intl=tw&lang=zh-Hant-TW&partner=none&prid=5l4ebc1jud6ac&region=TW&site=finance&tz=Asia%2FTaipei&ver=1.4.511`,
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
        mutateTickDeals();
        console.log("listening");
      }
    }, 10000); // 每 10 秒檢查一次

    return () => clearInterval(interval); // 清除定時器
  }, [mutateHourlyDeals, mutateTickDeals]);

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
      const res: Omit<TickDealsType, "id"> = {
        ts,
        price,
        avgPrices,
        changePercent,
        closes,
        previousClose,
      };
      return res;
    } catch (e) {
      console.log("Error parsing tickData:", e);
      return null;
    }
  }, [tickData]);

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
      console.log("Error parsing hourlyData:", e);
      return null;
    }
  }, [hourlyData]);

  return { deals, tickDeals };
}
