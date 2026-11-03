import { supabase } from "../supabase";

export const CNN_FEAR_AND_GREED_SOURCE = "cnn_fear_and_greed" as const;

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
