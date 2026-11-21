import { supabase } from "../supabase";

export const CNN_FEAR_AND_GREED_SOURCE = "cnn_fear_and_greed" as const;
export const USD_TWD_EXCHANGE_RATE_SOURCE = "twd_usd_exchange_rate" as const;

export type TwdTrend = "twd_depreciating" | "twd_appreciating" | "twd_flat";
export type StockMarketImpact = "bearish" | "bullish" | "neutral";

export interface ExchangeRatePoint {
  date: string;
  rate: number;
  rating: string | null;
  trend: TwdTrend | null;
  trendLabel: string | null;
  stockMarketImpact: StockMarketImpact | null;
  stockMarketImpactLabel: string | null;
  trendWindowDays: number | null;
  fourteenDayChangePercent: number | null;
  stockMarketImpactDetail: string | null;
  sectorNote: string | null;
}

export async function getUsdTwdExchangeRateHistory(): Promise<ExchangeRatePoint[]> {
  const { data, error } = await supabase
    .from("market_sentiment")
    .select("data_date,score,rating,indicators,raw_data")
    .eq("source", USD_TWD_EXCHANGE_RATE_SOURCE)
    .order("data_date", { ascending: false })
    .limit(14);

  if (error) throw error;
  return ((data ?? []) as { data_date: unknown; score: unknown; rating: unknown; indicators: unknown; raw_data: unknown }[]).flatMap((row) => {
    if (typeof row.data_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.data_date)) return [];
    const date = new Date(`${row.data_date}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== row.data_date) return [];
    const rate = typeof row.score === "number" || (typeof row.score === "string" && row.score.trim() !== "")
      ? Number(row.score) : Number.NaN;
    if (!Number.isFinite(rate) || rate <= 0) return [];
    const indicators = typeof row.indicators === "object" && row.indicators !== null && !Array.isArray(row.indicators)
      ? row.indicators as Record<string, unknown> : {};
    const rawData = typeof row.raw_data === "object" && row.raw_data !== null && !Array.isArray(row.raw_data)
      ? row.raw_data as Record<string, unknown> : {};
    const trend: TwdTrend | null = indicators.trend === "twd_depreciating" || indicators.trend === "twd_appreciating" || indicators.trend === "twd_flat"
      ? indicators.trend : null;
    const stockMarketImpact: StockMarketImpact | null = indicators.stock_market_impact === "bearish" || indicators.stock_market_impact === "bullish" || indicators.stock_market_impact === "neutral"
      ? indicators.stock_market_impact : null;
    const rawTrendWindowDays = typeof indicators.trend_window_days === "number" || (typeof indicators.trend_window_days === "string" && indicators.trend_window_days.trim() !== "")
      ? Number(indicators.trend_window_days) : Number.NaN;
    const rawChangePercent = typeof rawData.fourteen_day_change_percent === "number" || (typeof rawData.fourteen_day_change_percent === "string" && rawData.fourteen_day_change_percent.trim() !== "")
      ? Number(rawData.fourteen_day_change_percent) : Number.NaN;
    return [{
      date: row.data_date,
      rate,
      rating: typeof row.rating === "string" ? row.rating : null,
      trend,
      trendLabel: typeof indicators.trend_label === "string" ? indicators.trend_label : null,
      stockMarketImpact,
      stockMarketImpactLabel: typeof indicators.stock_market_impact_label === "string" ? indicators.stock_market_impact_label : null,
      trendWindowDays: Number.isInteger(rawTrendWindowDays) && rawTrendWindowDays > 0 ? rawTrendWindowDays : null,
      fourteenDayChangePercent: Number.isFinite(rawChangePercent) ? rawChangePercent : null,
      stockMarketImpactDetail: typeof rawData.stock_market_impact_detail === "string" ? rawData.stock_market_impact_detail : null,
      sectorNote: typeof rawData.sector_note === "string" ? rawData.sector_note : null,
    }];
  }).sort((left, right) => left.date.localeCompare(right.date));
}

export interface MarginMaintenancePoint {
  date: string;
  percent: number | null;
}

/** Scores are already percentages in Supabase, not FinLab's raw multiples. */
export async function getTwMarginMaintenanceHistory(): Promise<MarginMaintenancePoint[]> {
  const { data, error } = await supabase
    .from("market_sentiment")
    .select("data_date,score")
    .eq("source", "finlab_tw_margin_maintenance")
    .order("data_date", { ascending: false })
    .limit(10);

  if (error) throw error;
  return ((data ?? []) as { data_date: unknown; score: unknown }[]).flatMap((row) => {
    if (typeof row.data_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.data_date)) return [];
    const date = new Date(`${row.data_date}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== row.data_date) return [];
    const value = typeof row.score === "number" || (typeof row.score === "string" && row.score.trim() !== "")
      ? Number(row.score) : Number.NaN;
    return [{ date: row.data_date, percent: Number.isFinite(value) && value > 0 ? value : null }];
  }).sort((a, b) => a.date.localeCompare(b.date));
}

export interface MarketSentimentRow {
  source: string;
  data_date: string | null;
  observed_at: string | null;
  score: number | string | null;
  rating: string | null;
  updated_at: string | null;
}

/** Fetch the latest persisted CNN Fear & Greed observations for the compact trend. */
export async function getCnnFearAndGreedHistory(): Promise<MarketSentimentRow[]> {
  const { data, error } = await supabase
    .from("market_sentiment")
    .select("source,data_date,observed_at,score,rating,updated_at")
    .eq("source", CNN_FEAR_AND_GREED_SOURCE)
    .order("data_date", { ascending: false })
    .limit(10);

  if (error) throw error;
  return (data as MarketSentimentRow[] | null) ?? [];
}
