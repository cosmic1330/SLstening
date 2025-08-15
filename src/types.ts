/****
 * Data Example: [{"t":20241007,"o":199.0,"h":199.0,"l":195.0,"c":197.5,"v":83451}]
 ****/
export type TaType = {
  t: number; // 20241007
  o: number; // 199.0
  h: number; // 199.0
  l: number; // 195.0
  c: number; // 197.5
  v: number; // 83451
}[];

export type TickDealsType = {
  id: string;
  ts: number;
  price: number;
  avgPrices: number[];
  changePercent: number;
  closes: number[];
  previousClose: number;
};

export type StockStoreType = {
  id: string;
  name: string;
  group: string;
  type: string;
};

export type DealTableType = {
  stock_id: string;
  t: string;
  c: number;
  o: number;
  h: number;
  l: number;
  v: number;
};

export enum UrlType {
  Indicators = "indicators",
  Ta = "ta",
  Tick = "tick",
}
export enum UrlTaPerdOptions {
  OneMinute = "1m",
  FiveMinute = "5m",
  ThirtyMinute = "30m",
  Hour = "60m",
  Day = "d",
  Week = "w",
  Month = "m",
}

export enum FutureIds {
  WTX = "WTX%26.TW", // 台指期近一
  TWSE = "^TWII", // 台灣加權指數
}

export interface SignalType<T = string> {
  t: number;
  type: T;
  description: string;
}

export enum DivergenceSignalType {
  BEARISH_DIVERGENCE = "頂背離",
  BULLISH_DIVERGENCE = "底背離",
}
