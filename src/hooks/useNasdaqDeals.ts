import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { tauriFetcher } from "../api/http";
import useDebugStore from "../store/debug.store";
import { DealTableType, FutureIds } from "../types";
import { isNasdaqMarketOpen } from "../utils/marketUtils";
import { deriveMarketResourceState } from "../utils/marketResourceState";
import { useFreshnessNow, useMarketSession } from "./useMarketSession";

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

export default function useNasdaqDeals(isVisible: boolean = true) {


  const {
    data: hourlyData,
    mutate: mutateHourlyDeals,
    isValidating: isHourlyValidating, isLoading, error: requestError, mutate,
  } = useSWR(
    `https://query1.finance.yahoo.com/v8/finance/chart/${FutureIds.NASDAQ_FUTURE}?interval=1d&range=200d`,
    async (url) => {
      useDebugStore.getState().increment("nasdaq");
      return parseNasdaqDeals(await tauriFetcher(url));
    },
    {
      isPaused: () => !isVisible || document.visibilityState !== "visible",
      refreshInterval: () => (isNasdaqMarketOpen() ? 30000 : 0),
      onSuccess: () => setUpdatedAt(Date.now()),
    },
  );

  const hasFetched = useRef(false);
  const [updatedAt, setUpdatedAt] = useState<number>();
  useEffect(() => {
    if (isVisible && !hasFetched.current) {
      if (!isHourlyValidating) mutateHourlyDeals();
    }

    if (hourlyData) {
      hasFetched.current = true;
    }
  }, [isVisible, mutateHourlyDeals, hourlyData, isHourlyValidating]);

  const deals = hourlyData ?? null;
  const resourceError = requestError;
  const marketSession = useMarketSession(FutureIds.NASDAQ);
  const now = useFreshnessNow(updatedAt, 30_000, marketSession);
  const state = useMemo(() => deriveMarketResourceState({ enabled: isVisible, hasData: Boolean(deals?.data.length), resolved: hourlyData !== undefined, isLoading, isValidating: isHourlyValidating, error: resourceError, updatedAt, marketSession, staleAfterMs: 30_000, now }), [isVisible, deals, hourlyData, isLoading, isHourlyValidating, resourceError, updatedAt, marketSession, now]);
  return { deals, state, retry: mutate };
}
