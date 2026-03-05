import { info } from "@tauri-apps/plugin-log";
import { useEffect, useMemo, useRef } from "react";
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
  const {
    data: tickData,
    mutate: mutateTickDeals,
    isValidating: isTickValidating,
  } = useSWR(
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
      isPaused: () =>
        !enabled || !isVisible || document.visibilityState !== "visible",
      refreshInterval: () => {
        const taiwanTime = new Date().toLocaleString("en-US", {
          timeZone: "Asia/Taipei",
        });
        return checkTimeRange(taiwanTime) ? 10000 : 0;
      },
    },
  );

  const {
    data: dailyData,
    mutate: mutateDailyDeals,
    isValidating: isDailyValidating,
  } = useSWR(
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
      isPaused: () =>
        !enabled || !isVisible || document.visibilityState !== "visible",
      refreshInterval: () => {
        const taiwanTime = new Date().toLocaleString("en-US", {
          timeZone: "Asia/Taipei",
        });
        return checkTimeRange(taiwanTime) ? 10000 : 0;
      },
    },
  );

  const hasFetched = useRef(false);
  useEffect(() => {
    // 當元件變成可見、未處於請求中、且尚未成功獲取過資料時，主動觸發一次請求
    if (enabled && isVisible && !hasFetched.current) {
      if (!isTickValidating) mutateTickDeals();
      if (!isDailyValidating) mutateDailyDeals();
    }

    // 如果資料已經成功回傳過，標記為已獲取，以防無限 mutate
    if (tickData || dailyData) {
      hasFetched.current = true;
    }
  }, [
    isVisible,
    enabled,
    mutateTickDeals,
    mutateDailyDeals,
    tickData,
    dailyData,
    isTickValidating,
    isDailyValidating,
  ]);

  useEffect(() => {
    if (enabled && isVisible) {
      useDebugStore.getState().updateActiveInstances(1);
      return () => useDebugStore.getState().updateActiveInstances(-1);
    }
  }, [enabled, isVisible]);

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
