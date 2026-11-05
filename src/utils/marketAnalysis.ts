import { Ma, Macd } from "@ch20026103/anysis";
import { TaType as TaListType, UrlTaPerdOptions } from "../types";
type TaType = TaListType[number];

export type MarketTrend = "多頭" | "空頭" | "震盪" | "資料不足" | "N/A";
export interface MarketDeal extends TaType {
  ma5: number | null;
  ma10: number | null;
  ma20: number | null;
  ma60: number | null;
  osc: number | null;
}

const finite = (value: number | null): value is number =>
  value !== null && Number.isFinite(value);

export function calculateMarketDeals(ta: TaListType): MarketDeal[] {
  if (ta.length === 0) return [];
  const ma = new Ma();
  const macd = new Macd();
  const periods = [5, 10, 20, 60] as const;
  let averages = periods.map(period => ma.init(ta[0], period));
  let momentum = macd.init(ta[0]);
  return ta.map((deal, index) => {
    if (index > 0) {
      averages = averages.map((state, i) => ma.next(deal, state, periods[i]));
      momentum = macd.next(deal, momentum);
    }
    const value = (i: number) => index + 1 >= periods[i] && finite(averages[i].ma)
      ? averages[i].ma : null;
    return {
      ...deal,
      ma5: value(0), ma10: value(1), ma20: value(2), ma60: value(3),
      // The installed calculator needs 26 bars for DIF and 9 DIF values for MACD.
      osc: index >= 33 && finite(momentum.osc) ? momentum.osc : null,
    };
  });
}

export function classifyMarketTrend(deal: MarketDeal, perd: UrlTaPerdOptions): MarketTrend {
  if (perd !== UrlTaPerdOptions.Day && perd !== UrlTaPerdOptions.Hour) return "N/A";
  const reference = perd === UrlTaPerdOptions.Day ? deal.ma20 : deal.ma60;
  const averages = perd === UrlTaPerdOptions.Day
    ? [deal.ma5, deal.ma10] : [deal.ma5, deal.ma10, deal.ma20];
  if (!finite(reference) || !averages.every(finite)) return "資料不足";
  if (averages.every(value => value > reference)) return "多頭";
  if (averages.every(value => value < reference)) return "空頭";
  return "震盪";
}

export function classifyMarketPower(values: Array<number | null>): string {
  const recent = values.slice(-3);
  if (recent.length < 3 || !recent.every(finite)) return "資料不足";
  const [oldest, previous, latest] = recent;
  if (oldest < previous && previous < latest) {
    if (latest > 0) return "多方力道漸強";
    if (latest < 0) return "空方力道漸弱";
  }
  if (oldest > previous && previous > latest) {
    if (latest < 0) return "空方力道漸強";
    if (latest > 0) return "多方力道漸弱";
  }
  return "無明顯力道";
}

export function collectTrendChanges<T extends { trend: MarketTrend }>(trends: T[]): T[] {
  const known = (trend: MarketTrend) => trend !== "資料不足" && trend !== "N/A";
  return trends.filter((deal, index) => index > 0 && known(deal.trend)
    && known(trends[index - 1].trend) && deal.trend !== trends[index - 1].trend);
}

export function formatMarketTime(time: number | string): string {
  const text = String(time);
  const date = `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
  return text.length === 12 ? `${date} ${text.slice(8, 10)}:${text.slice(10, 12)}` : date;
}
