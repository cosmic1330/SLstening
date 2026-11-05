import { useMemo } from "react";
import { TaType as TaListType, UrlTaPerdOptions } from "../types";
import {
  calculateMarketDeals, classifyMarketPower, classifyMarketTrend,
  collectTrendChanges, formatMarketTime,
} from "../utils/marketAnalysis";

interface UseMarketAnalysisOptions {
  ta: TaListType;
  perd: UrlTaPerdOptions;
}

export default function useMarketAnalysis({ ta, perd }: UseMarketAnalysisOptions) {
  const deals = useMemo(() => calculateMarketDeals(ta), [ta]);
  const trends = useMemo(
    () => deals.map(deal => ({ ...deal, trend: classifyMarketTrend(deal, perd) })),
    [deals, perd],
  );
  const power = useMemo(
    () => classifyMarketPower(deals.slice(-3).map(deal => deal.osc)),
    [deals],
  );
  const date = deals.length ? formatMarketTime(deals[deals.length - 1].t) : "";
  const trendChangePoints = useMemo(() => collectTrendChanges(trends), [trends]);
  return { trends, power, date, trendChangePoints };
}
