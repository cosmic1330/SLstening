import { StockListType } from "@ch20026103/anysis/dist/esm/stockSkills/types";
import { useEffect, useMemo } from "react";
import useSWR from "swr";
import { tauriFetcher } from "../api/http";
import { dateFormat } from "@ch20026103/anysis";
import { Mode } from "@ch20026103/anysis/dist/esm/stockSkills/utils/dateFormat";

export type TodayDealsType = {
  id: string;
  t: string;
  price: number;
  avgPrices: number[];
  changePercent: number;
  closes: number[];
  previousClose: number;
};

export default function useDeals(id: string) {
  const { data: todayData, mutate: mutateTodayDeals } = useSWR(
    `https://tw.stock.yahoo.com/_td-stock/api/resource/FinanceChartService.ApacLibraCharts;autoRefresh=1743127325614;symbols=%5B%22${id}.TW%22%5D;type=tick?bkt=TW-Stock-Desktop-NewTechCharts-Rampup&device=desktop&ecma=modern&feature=enableGAMAds%2CenableGAMEdgeToEdge%2CenableEvPlayer%2CenableHighChart&intl=tw&lang=zh-Hant-TW&partner=none&prid=2k1gakljuc07h&region=TW&site=finance&tz=Asia%2FTaipei&ver=1.4.511&returnMeta=true`,
    tauriFetcher
  );
  const { data: dailyData, mutate: mutateDailyDeals } = useSWR(
    `https://tw.quote.finance.yahoo.net/quote/q?type=ta&perd=d&mkt=10&sym=${id}&v=1&callback=`,
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
    if(!isInTime) return; // 如果不在時間範圍內，則不啟動定時器
    const interval = setInterval(() => {
      const isInTime = checkTimeRange();
      if (isInTime) {
        // 自動重新請求
        mutateDailyDeals();
        mutateTodayDeals();
        console.log("listening");
      }
    }, 10000); // 每 10 秒檢查一次

    return () => clearInterval(interval); // 清除定時器
  }, [mutateDailyDeals, mutateTodayDeals]);

  const todayDeals = useMemo(() => {
    try {
      if (!todayData) throw new Error("todayData is null");
      const { data } = JSON.parse(todayData);
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

      let t = data[0].chart.quote.refreshedTs;
      t = dateFormat(t, Mode.TimeStampToString);
      const res: TodayDealsType = {
        id,
        t,
        price,
        avgPrices,
        changePercent,
        closes,
        previousClose,
      };
      return res;
    } catch (e) {
      return null;
    }
  }, [todayData]);

  const deals = useMemo(() => {
    if (!dailyData) return [];
    const ta_index = dailyData.indexOf('"ta":');
    const json_ta = "{" + dailyData.slice(ta_index).replace(");", "");
    const parse = JSON.parse(json_ta);
    const response = parse.ta as StockListType;
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

  return { deals, name, todayDeals };
}
