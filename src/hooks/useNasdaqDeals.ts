import { useMemo, useState } from "react";
import useSWR from "swr";
import { marketApi } from "../api/marketApi";
import useDebugStore from "../store/debug.store";
import { DealTableType, FutureIds } from "../types";
import { deriveMarketResourceState } from "../utils/marketResourceState";
import { useDocumentVisibility, useFreshnessNow, useMarketSession } from "./useMarketSession";
import { MARKET_OVERVIEW_HISTORY_REFRESH_INTERVAL_MS, MARKET_OVERVIEW_SWR_POLICY } from "./marketOverviewPolicy";

export { MARKET_OVERVIEW_HISTORY_REFRESH_INTERVAL_MS } from "./marketOverviewPolicy";

export const parseNasdaqDeals = (hourlyData: string) => {
  const data = JSON.parse(hourlyData);
  const quote = data.chart?.result?.[0]?.indicators?.quote?.[0];
  const ts = data.chart?.result?.[0]?.timestamp;
  if (!quote || !Array.isArray(ts) || ![quote.open, quote.close, quote.high, quote.low].every(Array.isArray) || ![quote.open, quote.close, quote.high, quote.low, ts].every((array) => array.length === ts.length) || (quote.volume && (!Array.isArray(quote.volume) || quote.volume.length !== ts.length))) throw new Error("Malformed Nasdaq response");
  const res: (Omit<DealTableType, "stock_id" | "t"> & { t: number })[] = [];
  for (let i = 0; i < quote.open.length; i++) {
    const ohlc = [quote.open[i], quote.close[i], quote.high[i], quote.low[i]];
    const values = [...ohlc, ts[i]];
    if (ohlc.every((value) => value === null) && typeof ts[i] === "number" && Number.isFinite(ts[i])) continue;
    if (!values.every((value) => typeof value === "number" && Number.isFinite(value)) || (quote.volume && quote.volume[i] !== null && !Number.isFinite(quote.volume[i]))) throw new Error("Malformed Nasdaq OHLC response");
    res.push({ t: ts[i], o: quote.open[i], c: quote.close[i], h: quote.high[i], l: quote.low[i], v: Number.isFinite(quote.volume?.[i]) ? quote.volume[i] : 0 });
  }
  if (res.length === 0) return { data: [], price: null, change: null };
  const lastDeal = res[res.length - 1]; const prevDeal = res[res.length - 2] || lastDeal;
  return { data: res, price: Math.round(lastDeal.c), change: Math.round((lastDeal.c - prevDeal.c) * 100) / 100 };
};

/** Convert the native MarketHistory contract into the compact overview shape. */
export const normalizeNasdaqHistory = (history: {
  data: Array<{ t: number; o: number; c: number; h: number; l: number; v: number }>;
  price: number;
  change: number | null;
}) => {
  const data: (Omit<DealTableType, "stock_id" | "t"> & { t: number })[] = history.data.map((point) => ({ ...point }));
  const last = data[data.length - 1];
  const previous = data[data.length - 2] ?? last;
  return {
    data,
    price: data.length === 0 ? null : Number.isFinite(history.price) ? Math.round(history.price) : (last?.c ?? null),
    change: history.change ?? (last && previous ? Math.round((last.c - previous.c) * 100) / 100 : null),
  };
};

export default function useNasdaqDeals(isVisible: boolean = true) {
  const documentVisible = useDocumentVisibility();
  const shouldFetch = isVisible && documentVisible;
  const marketSession = useMarketSession(FutureIds.NASDAQ);

  const {
    data: hourlyData,
    isValidating: isHourlyValidating, isLoading, error: requestError, mutate,
  } = useSWR(
    shouldFetch ? `market/history/${FutureIds.NASDAQ_FUTURE}` : null,
    async () => {
      useDebugStore.getState().increment("nasdaq");
      return normalizeNasdaqHistory(await marketApi.getHistoryData(FutureIds.NASDAQ_FUTURE, "d"));
    },
    {
      ...MARKET_OVERVIEW_SWR_POLICY,
      refreshInterval: () => shouldFetch && marketSession === "open" ? MARKET_OVERVIEW_HISTORY_REFRESH_INTERVAL_MS : 0,
      dedupingInterval: MARKET_OVERVIEW_HISTORY_REFRESH_INTERVAL_MS,
      onSuccess: () => setUpdatedAt(Date.now()),
    },
  );

  const [updatedAt, setUpdatedAt] = useState<number>();
  const deals = hourlyData ?? null;
  const resourceError = requestError;
  const now = useFreshnessNow(updatedAt, MARKET_OVERVIEW_HISTORY_REFRESH_INTERVAL_MS, marketSession);
  const state = useMemo(() => deriveMarketResourceState({ enabled: isVisible, hasData: Boolean(deals?.data.length), resolved: hourlyData !== undefined, isLoading, isValidating: isHourlyValidating, error: resourceError, updatedAt, marketSession, staleAfterMs: MARKET_OVERVIEW_HISTORY_REFRESH_INTERVAL_MS, now }), [isVisible, deals, hourlyData, isLoading, isHourlyValidating, resourceError, updatedAt, marketSession, now]);
  return { deals, state, retry: mutate };
}
