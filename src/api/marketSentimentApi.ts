import { supabase } from "../supabase";

export const CNN_FEAR_AND_GREED_SOURCE = "cnn_fear_and_greed" as const;

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
    .limit(30);

  if (error) throw error;
  return (data as MarketSentimentRow[] | null) ?? [];
}
