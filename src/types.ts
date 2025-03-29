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

export type PromptItem = {
  name: string;
  value: {
    daily: Prompts;
    weekly: Prompts;
  };
};

export type PromptsMap = {
  [key: string]: PromptItem;
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
