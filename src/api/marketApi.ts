import { invoke } from "@tauri-apps/api/core";
import { TickDealsType } from "../types";
import { MarketEvent } from "../../src-tauri/bindings/MarketEvent";

export const marketApi = {
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
  getTickData: async (symbol: string): Promise<TickDealsType | null> => {
    try {
      const event = await marketApi.getMarketData(symbol, "tick");
      if (event.type === "Tick") {
        const tick = event.payload;
        return {
          id: tick.id,
          name: tick.name ?? undefined,
          ts: tick.refreshed_ts,
          price: tick.price,
          avgPrices: tick.avg_prices,
          changePercent: tick.change_percent,
          closes: tick.closes,
          previousClose: tick.previous_close,
          timestamps: tick.timestamps,
          volume: tick.volume ?? undefined,
        };
      }
      return null;
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
        return event.payload;
      }
      return null;
    } catch (e) {
      console.error(`[marketApi] Failed to get history data for ${symbol}:`, e);
      throw e;
    }
  },
};
