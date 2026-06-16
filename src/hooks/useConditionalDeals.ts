import { dateFormat } from "@ch20026103/anysis";
import { Mode } from "@ch20026103/anysis/dist/esm/stockSkills/utils/dateFormat";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { marketApi } from "../api/marketApi";
import useDebugStore from "../store/debug.store";
import { TaType } from "../types";
import { isTaiwanMarketOpen } from "../utils/marketUtils";
import { IndicatorsDateTimeType } from "../utils/analyzeIndicatorsData";
import formatDateTime from "../utils/formatDateTime";

/**
 * useConditionalDeals Hook
 * 負責根據可見性與啟用狀態獲取股票資料。
 * 透過 Rust 後端中轉，具備緩存與流量控制功能。
 */
export default function useConditionalDeals(
  id: string,
  enabled: boolean = true,
  isVisible: boolean = true,
  options?: { fetchTick?: boolean; fetchHistory?: boolean }
) {
  const fetchTick = options?.fetchTick ?? true;
  const fetchHistory = options?.fetchHistory ?? true;

  // 實作可見性防抖，防止快速滑過時產生大量請求
  const [debouncedIsVisible, setDebouncedIsVisible] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setDebouncedIsVisible(false);
      return;
    }
    const handler = setTimeout(() => {
      setDebouncedIsVisible(true);
    }, 300); // 300ms 防抖
    return () => clearTimeout(handler);
  }, [isVisible]);

  // 決定是否應該啟動獲取邏輯：必須啟用、可見、且視窗處於焦點
  const shouldFetch =
    enabled &&
    debouncedIsVisible &&
    typeof window !== "undefined" &&
    document.visibilityState === "visible";

  const shouldFetchTick = shouldFetch && fetchTick;
  const shouldFetchHistory = shouldFetch && fetchHistory;

  // --- Tick 資料 (即時價格與成交明細) ---
  const { data: tickDeals } = useSWR(
    shouldFetchTick ? `market/tick/${id}` : null,
    async () => {
      console.log(`📡 [SWR Fetch] 真正發送 IPC 請求拉取 [TICK] 報價: ${id}`);
      useDebugStore.getState().increment("conditional");
      return await marketApi.getTickData(id);
    },
    {
      revalidateOnFocus: false,
      revalidateIfStale: false, // 有快取時直接使用，無快取時正常 fetch
      dedupingInterval: 15000, // 15秒內避免重複請求
      refreshInterval: () => (isTaiwanMarketOpen() ? 20000 : 0),
    },
  );

  const isMarketOpen = isTaiwanMarketOpen();

  // --- Daily 資料 (日 K 線與技術指標) ---
  const { data: historyData } = useSWR(
    shouldFetchHistory ? `market/history/${id}` : null,
    async () => {
      console.log(`📈 [SWR Fetch] 真正發送 IPC 請求拉取 [HISTORY] 日K: ${id}`);
      useDebugStore.getState().increment("conditional");
      return await marketApi.getHistoryData(id, "d");
    },
    {
      revalidateOnFocus: false,
      revalidateIfStale: false, // 有快取時直接使用，無快取時正常 fetch
      dedupingInterval: isMarketOpen ? 15000 : 300000, // 盤中快取15秒以利20秒更新；盤後快取5分鐘
      refreshInterval: isMarketOpen ? 20000 : 0, // 盤中每 20 秒輪詢一次最新資料，盤後不輪詢
    },
  );

  // 追蹤活躍執行個體 (Debug 用)
  useEffect(() => {
    if (enabled && isVisible) {
      useDebugStore.getState().updateActiveInstances(1);
      return () => useDebugStore.getState().updateActiveInstances(-1);
    }
  }, [enabled, isVisible]);

  // 資料解析邏輯
  const deals = useMemo(() => {
    if (!historyData || !historyData.data) return [];

    const timeType = IndicatorsDateTimeType.Date;

    const res: TaType = historyData.data.map((item: any) => {
      let t;
      if (timeType === IndicatorsDateTimeType.Date) {
        t = dateFormat(item.t * 1000, Mode.TimeStampToNumber);
      } else {
        t = formatDateTime(item.t * 1000);
      }

      return {
        t,
        o: item.o,
        c: item.c,
        h: item.h,
        l: item.l,
        v: item.v,
      };
    });

    return res;
  }, [historyData]);

  // 獲取股票名稱
  const name = useMemo(() => {
    const rawName = historyData?.name || tickDeals?.name;
    if (rawName === "null" || !rawName) return null;
    return rawName;
  }, [historyData, tickDeals]);

  return { deals, name, tickDeals };
}
