import { invoke } from "@tauri-apps/api/core";
import { TickDealsType } from "../types";
import { MarketEvent } from "../../src-tauri/bindings/MarketEvent";

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
export const validateTickPayload = (tick: any, symbol: string): TickDealsType => {
  if (!tick || tick.id !== symbol || (tick.name !== null && tick.name !== undefined && typeof tick.name !== "string") || !finite(tick.refreshed_ts) || !finite(tick.price) || !finite(tick.change_percent) || !finite(tick.previous_close) ||
    !Array.isArray(tick.avg_prices) || !Array.isArray(tick.closes) || !Array.isArray(tick.timestamps) ||
    !tick.avg_prices.every(finite) || !tick.closes.every(finite) || !tick.timestamps.every(finite) ||
    tick.closes.length !== tick.timestamps.length || tick.avg_prices.length !== tick.closes.length || (tick.volume !== null && tick.volume !== undefined && !finite(tick.volume))) {
    throw new Error(`Invalid tick payload for ${symbol}`);
  }
  return { id: tick.id, name: tick.name ?? undefined, ts: tick.refreshed_ts, price: tick.price, avgPrices: tick.avg_prices, changePercent: tick.change_percent, closes: tick.closes, previousClose: tick.previous_close, timestamps: tick.timestamps, volume: tick.volume ?? undefined };
};
export const validateHistoryPayload = (payload: any, symbol: string) => {
  if (!payload || payload.id !== symbol || (payload.name !== null && typeof payload.name !== "string") || !finite(payload.price) || (payload.change !== null && !finite(payload.change)) || !Array.isArray(payload.data)) throw new Error(`Invalid history payload for ${symbol}`);
  if (!payload.data.every((point: any) => point && [point.t, point.o, point.c, point.h, point.l, point.v].every(finite))) throw new Error(`Invalid history OHLC payload for ${symbol}`);
  return payload;
};

export interface ChipData {
  symbol: string;
  asOf: string;
  score: number;
  verdict: "stable_buying" | "distribution" | "mixed" | "retail_crowded";
  confidence: "high" | "medium";
  institutional: {
    foreign5d: number;
    trust5d: number;
    dealer5d: number;
    total5d: number;
    total20d: number;
    consecutiveDays: number;
  };
  margin: {
    marginBalance: number;
    marginChange5d: number;
    marginChangePercent5d: number;
    shortBalance: number;
    shortChange5d: number;
    shortMarginRatio: number;
  };
  history: Array<{
    date: string;
    close: number;
    foreign: number;
    trust: number;
    dealer: number;
    institutionalTotal: number;
    marginBalance: number;
  }>;
  signals: Array<
    | "price_down_institution_buy"
    | "price_up_institution_sell"
    | "margin_chasing"
    | "trust_streak"
  >;
  scoreBreakdown: Array<{
    factor:
      | "foreign_5d"
      | "trust_5d"
      | "dealer_5d"
      | "institutional_20d"
      | "margin_5d";
    points: number;
  }>;
  lights: {
    institutional: "buying" | "selling" | "neutral";
    foreignHolding: "increasing" | "decreasing" | "stable" | "unavailable";
    lendingPressure: "high" | "normal" | "easing" | "unavailable";
    summary: "favorable" | "cautious" | "mixed";
    foreignRatio: number | null;
    foreignChange5d: number | null;
    lendingVolume5d: number;
    lendingChangePercent: number | null;
  };
  source: string;
}

export const marketApi = {
  getChipData: async (symbol: string) =>
    await invoke<ChipData>("get_chip_data", { symbol }),
  /**
   * 獲取市場資料 (Tick 或 History)
   * 透過 Rust 後端中轉，具備緩存與流量控制功能。
   */
  getMarketData: async (
    symbol: string,
    dataType: "tick" | "history",
    period?: string,
  ): Promise<MarketEvent> => {
    return await invoke<MarketEvent>("get_market_data", {
      symbol,
      dataType,
      period,
    });
  },

  /**
   * 專門獲取 Tick 資料並轉換為前端格式
   */
  getTickData: async (symbol: string): Promise<TickDealsType> => {
    try {
      const event = await marketApi.getMarketData(symbol, "tick");
      if (event.type === "Tick") {
        return validateTickPayload(event.payload, symbol);
      }
      throw new Error(`Unexpected market event for tick ${symbol}`);
    } catch (e) {
      console.error(`[marketApi] Failed to get tick data for ${symbol}:`, e);
      throw e;
    }
  },

  /**
   * 獲取歷史資料
   */
  getHistoryData: async (symbol: string, period: string = "d") => {
    try {
      const event = await marketApi.getMarketData(symbol, "history", period);
      if (event.type === "History") {
        return validateHistoryPayload(event.payload, symbol);
      }
      throw new Error(`Unexpected market event for history ${symbol}`);
    } catch (e) {
      console.error(`[marketApi] Failed to get history data for ${symbol}:`, e);
      throw e;
    }
  },
};
