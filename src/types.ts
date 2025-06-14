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

export enum PromptType {
  BULLS = "bulls",
  BEAR = "bear",
}

export type StorePrompt = {
  day1: string;
  indicator1: string;
  operator: string;
  day2: string;
  indicator2: string;
};

export type Prompts = StorePrompt[];

export type PromptValue = {
  daily: Prompts;
  weekly: Prompts;
  hourly: Prompts;
};

export type PromptItem = {
  name: string;
  value: PromptValue;
};

export type PromptsMap = {
  [key: string]: PromptItem;
};

export type TrashPrompt = {
  time: number;
  id: string;
  type: PromptType;
  value: PromptItem;
};

export type QueryBuilderMappingItem = {
  key: string;
  group: string;
};

export type StockStoreType = {
  id: string;
  name: string;
  group: string;
  type: string;
};

export type StockTableType = {
  id: string;
  name: string;
  industry_group: string;
  market_type: string;
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

export type SkillsTableType = {
  stock_id: string;
  t: string;
  ma5: number;
  ma5_ded: number;
  ma10: number;
  ma10_ded: number;
  ma20: number;
  ma20_ded: number;
  ma60: number;
  ma60_ded: number;
  ma120: number;
  ma120_ded: number;
  macd: number;
  dif: number;
  osc: number;
  k: number;
  d: number;
  j: number;
  rsi5: number;
  rsi10: number;
  bollUb: number;
  bollMa: number;
  bollLb: number;
  obv: number;
  obv5: number;
};

export type TickDealsType = {
  id: string;
  ts: number;
  price: number;
  avgPrices: number[];
  changePercent: number;
  closes: number[];
  previousClose: number;
};

export type TimeSharingDealTableType = {
  stock_id: string;
  ts: number;
  c: number;
  o: number;
  h: number;
  l: number;
  v: number;
};

export type TimeSharingSkillsTableType = {
  stock_id: string;
  ts: number;
  ma5: number;
  ma5_ded: number;
  ma10: number;
  ma10_ded: number;
  ma20: number;
  ma20_ded: number;
  ma60: number;
  ma60_ded: number;
  ma120: number;
  ma120_ded: number;
  macd: number;
  dif: number;
  osc: number;
  k: number;
  d: number;
  j: number;
  rsi5: number;
  rsi10: number;
  bollUb: number;
  bollMa: number;
  bollLb: number;
  obv: number;
  obv5: number;
};

export enum DealTableOptions {
  DailyDeal = "daily_deal",
  WeeklyDeal = "weekly_deal",
}

export enum SkillsTableOptions {
  DailySkills = "daily_skills",
  WeeklySkills = "weekly_skills",
}

export enum TimeSharingDealTableOptions {
  HourlyDeal = "hourly_deal",
}

export enum TimeSharingSkillsTableOptions {
  HourlySkills = "hourly_skills",
}

export enum CsvDataType {
  Deal = "Deal",
  Skills = "Skills",
}

// 繼承 SkillsTableType但是不要bollUb, bollMa, bollLb改成 boll_ub, boll_ma, boll_lb
export type SkillsCsvDataType = Omit<
  SkillsTableType,
  "bollUb" | "bollMa" | "bollLb"
> & {
  boll_ub: number;
  boll_ma: number;
  boll_lb: number;
};

export type FundamentalTableType = {
  stock_id: string;
  pe: number;
  pb: number;
  dividend_yield: number;
  yoy: number;
  eps: number;
  dividend_yield_3y: number;
  dividend_yield_5y: number;
};

export type FilterStock = { id: string; name: string };

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