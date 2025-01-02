import { StockListType } from "@ch20026103/anysis/dist/esm/stockSkills/types";
import { useEffect, useMemo, useState } from "react";
import { tauriFetcher } from "../api/http";
import useSWR from "swr";
import ma from "../cls_tools/ma";
export default function useDeals(id: string) {
  const { data, error, isLoading, mutate } = useSWR(
    `https://tw.quote.finance.yahoo.net/quote/q?type=ta&perd=d&mkt=10&sym=${id}&v=1&callback=`,
    tauriFetcher
  );
  const [isInTimeRange, setIsInTimeRange] = useState(false);

  // 檢查當前時間是否在台灣時間 8:00 AM 到 1:30 PM 之間
  const checkTimeRange = () => {
    const taiwanTime = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Taipei",
    });
    const hours = new Date(taiwanTime).getHours();
    const minutes = new Date(taiwanTime).getMinutes();
    // 8:00 AM 至 1:30 PM 時間範圍
    return hours >= 8 && (hours < 13 || (hours === 13 && minutes <= 30));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const isInTime = checkTimeRange();
      setIsInTimeRange(isInTime);

      if (isInTime) {
        mutate(); // 自動重新請求
      }
    }, 10000); // 每 10 秒檢查一次

    return () => clearInterval(interval); // 清除定時器
  }, [mutate]);

  const deals = useMemo(() => {
    if (!data) return [];
    const ta_index = data.indexOf('"ta":');
    const json_ta = "{" + data.slice(ta_index).replace(");", "");
    const parse = JSON.parse(json_ta);
    return parse.ta as StockListType;
  }, [data]);

  return deals;
}
