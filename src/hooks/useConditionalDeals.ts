import { info, warn } from "@tauri-apps/plugin-log";
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

/**
 * useConditionalDeals Hook
 * 負責根據可見性與啟用狀態獲取股票資料。
 * 考慮到 Yahoo API 的 IP 封鎖風險，實施了嚴格的頻率限制與快取策略。
 */
export default function useConditionalDeals(
  id: string,
  enabled: boolean = true,
  isVisible: boolean = true,
) {
  const taiwanTimeStr = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Taipei",
  });
  const isMarketOpen = checkTimeRange(taiwanTimeStr);

  // 決定是否應該啟動獲取邏輯：必須啟用、可見、且視窗處於焦點
  const shouldFetch = 
    enabled && 
    isVisible && 
    typeof window !== "undefined" && 
    document.visibilityState === "visible";

  // --- Tick 資料 (即時價格與成交明細) ---
  const {
    data: tickData,
  } = useSWR(
    shouldFetch
      ? generateDealDataDownloadUrl({
          type: UrlType.Tick,
          id,
        })
      : null,
    async (url: string) => {
      try {
        useDebugStore.getState().increment("conditional");
        return await tauriFetcher(url);
      } catch (error: any) {
        if (error.message?.includes("429")) {
          warn(`Yahoo API Rate Limited (429) for ${id}. Slowing down...`);
        }
        throw error;
      }
    },
    {
      revalidateOnFocus: false, // 避免頻繁切換視窗導致請求
      revalidateOnMount: true,
      dedupingInterval: 10000, // 10秒內不重複請求相同 ID
      refreshInterval: () => {
        // 只有在開盤時間才進行輪詢，且頻率放寬至 20 秒以防封鎖
        return shouldFetch && isMarketOpen ? 20000 : 0;
      },
    },
  );

  // --- Daily 資料 (日 K 線與技術指標) ---
  const {
    data: dailyData,
  } = useSWR(
    shouldFetch
      ? generateDealDataDownloadUrl({
          type: UrlType.Indicators,
          id,
          perd: UrlTaPerdOptions.Day,
        })
      : null,
    async (url: string) => {
      try {
        useDebugStore.getState().increment("conditional");
        return await tauriFetcher(url);
      } catch (error: any) {
        throw error;
      }
    },
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      dedupingInterval: 60000, // 日K資料 1 分鐘內不重複請求
      refreshInterval: () => {
        // 日 K 線資料變化較慢，開盤時每 5 分鐘更新一次即可
        return shouldFetch && isMarketOpen ? 300000 : 0;
      },
    },
  );

  // 追蹤活躍執行個體 (Debug 用)
  useEffect(() => {
    if (enabled && isVisible) {
      useDebugStore.getState().updateActiveInstances(1);
      return () => useDebugStore.getState().updateActiveInstances(-1);
    }
  }, [enabled, isVisible]);

  // 資料解析邏輯 (保持原有邏輯並增強穩定性)
  const tickDeals = useMemo(() => {
    try {
      if (!tickData) return null;
      const data = JSON.parse(tickData);
      
      const chartData = data?.[0]?.chart;
      if (!chartData) return null;

      const indicators = chartData.indicators?.quote?.[0];
      const resultMeta = chartData.result?.[0]?.meta;
      const quote = resultMeta || chartData.quote || {};

      if (!indicators && !quote.price) return null;

      const closes = (indicators?.close || []).filter((item: number | null) => item !== null);
      const highs = (indicators?.high || []).filter((item: number | null) => item !== null);
      
      const price = quote.price || (closes.length > 0 ? closes[closes.length - 1] : 0);
      const changePercent = quote.changePercent || 0;
      const previousClose = quote.previousClose || 0;
      
      let pre = 0;
      const avgPrices = (highs || []).map((item: number, index: number) => {
        pre += item;
        return pre / (index + 1);
      });

      const ts = quote.refreshedTs || chartData.meta?.regularMarketTime || Date.now();
      
      return {
        id,
        ts,
        price,
        avgPrices,
        changePercent,
        closes,
        previousClose,
      } as TickDealsType;
    } catch (e) {
      info(`Error parsing tickData for ${id}: ${e}`);
      return null;
    }
  }, [tickData, id]);

  const deals = useMemo(() => {
    if (!dailyData) return [];
    return analyzeIndicatorsData(dailyData, IndicatorsDateTimeType.Date);
  }, [dailyData]);

  const name = useMemo(() => {
    let stockName = "null";
    if (!dailyData) return stockName;

    const match = dailyData.match(/name":"([^"]*)"/);
    if (match) {
      stockName = match[1];
    }
    return stockName;
  }, [dailyData]);

  return { deals, name, tickDeals };
}
