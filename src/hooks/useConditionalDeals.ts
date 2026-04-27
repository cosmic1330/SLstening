import { dateFormat } from "@ch20026103/anysis";
import { Mode } from "@ch20026103/anysis/dist/esm/stockSkills/utils/dateFormat";
import { useEffect, useMemo } from "react";
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
) {
  // 決定是否應該啟動獲取邏輯：必須啟用、可見、且視窗處於焦點
  const shouldFetch =
    enabled &&
    isVisible &&
    typeof window !== "undefined" &&
    document.visibilityState === "visible";

  // --- Tick 資料 (即時價格與成交明細) ---
  const { data: tickDeals } = useSWR(
    shouldFetch ? `market/tick/${id}` : null,
    async () => {
      useDebugStore.getState().increment("conditional");
      return await marketApi.getTickData(id);
    },
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      dedupingInterval: 10000,
      refreshInterval: () => (isTaiwanMarketOpen() ? 20000 : 0),
    },
  );

  // --- Daily 資料 (日 K 線與技術指標) ---
  const { data: historyData } = useSWR(
    shouldFetch ? `market/history/${id}` : null,
    async () => {
      useDebugStore.getState().increment("conditional");
      return await marketApi.getHistoryData(id, "d");
    },
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      dedupingInterval: 60000,
      refreshInterval: () => (isTaiwanMarketOpen() ? 300000 : 0),
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
