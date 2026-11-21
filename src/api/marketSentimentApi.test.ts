import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  from: vi.fn(),
}));

vi.mock("../supabase", () => ({ supabase: { from: state.from } }));

import {
  getCnnFearAndGreedHistory,
  getTwMarginMaintenanceHistory,
  getUsdTwdExchangeRateHistory,
} from "./marketSentimentApi";

describe("market sentiment API", () => {
  it("queries the latest 10 CNN observations with the narrow field set", async () => {
    const data = [{
      source: "cnn_fear_and_greed",
      data_date: "2026-10-23",
      observed_at: "2026-10-23T23:59:44+00:00",
      score: 20.98,
      rating: "extreme fear",
      updated_at: "2026-10-24T09:40:07.810632+00:00",
    }];
    state.limit.mockResolvedValue({ data, error: null });
    state.order.mockReturnValue({ limit: state.limit });
    state.eq.mockReturnValue({ order: state.order });
    state.select.mockReturnValue({ eq: state.eq });
    state.from.mockReturnValue({ select: state.select });

    await expect(getCnnFearAndGreedHistory()).resolves.toEqual(data);
    expect(state.from).toHaveBeenCalledWith("market_sentiment");
    expect(state.select).toHaveBeenCalledWith("source,data_date,observed_at,score,rating,updated_at");
    expect(state.eq).toHaveBeenCalledWith("source", "cnn_fear_and_greed");
    expect(state.order).toHaveBeenCalledWith("data_date", { ascending: false });
    expect(state.limit).toHaveBeenCalledWith(10);
  });

  it("returns an empty history for an empty table result and throws query errors", async () => {
    state.limit.mockResolvedValueOnce({ data: null, error: null });
    await expect(getCnnFearAndGreedHistory()).resolves.toEqual([]);

    const error = new Error("offline");
    state.limit.mockResolvedValueOnce({ data: null, error });
    await expect(getCnnFearAndGreedHistory()).rejects.toThrow("offline");
  });

  it("reads FinLab percentages unchanged and keeps invalid values as gaps", async () => {
    state.limit.mockResolvedValue({ data: [
      { data_date: "2026-11-02", score: "170.60" },
      { data_date: "2026-10-30", score: null },
      { data_date: "2026-10-29", score: "" },
      { data_date: "2026-10-28", score: -1 },
      { data_date: "2026-02-30", score: 170 },
      { data_date: "bad", score: 170 },
    ], error: null });
    state.order.mockReturnValue({ limit: state.limit });
    state.eq.mockReturnValue({ order: state.order });
    state.select.mockReturnValue({ eq: state.eq });
    state.from.mockReturnValue({ select: state.select });
    await expect(getTwMarginMaintenanceHistory()).resolves.toEqual([
      { date: "2026-10-28", percent: null },
      { date: "2026-10-29", percent: null },
      { date: "2026-10-30", percent: null },
      { date: "2026-11-02", percent: 170.6 },
    ]);
    expect(state.eq).toHaveBeenLastCalledWith("source", "finlab_tw_margin_maintenance");
    expect(state.limit).toHaveBeenLastCalledWith(10);
  });

  it("reads the latest 14 valid USD/TWD rates from market_sentiment in chronological order", async () => {
    state.limit.mockResolvedValue({ data: [
      {
        data_date: "2026-11-20",
        score: "32.936000",
        rating: "台股偏利空",
        indicators: {
          trend: "twd_depreciating",
          trend_label: "台幣貶值",
          trend_window_days: 14,
          stock_market_impact: "bearish",
          stock_market_impact_label: "台股偏利空",
        },
        raw_data: {
          fourteen_day_change_percent: 0.4146,
          stock_market_impact_detail: "台幣貶值常伴隨外資賣超並匯出。",
          sector_note: "出口股可能有匯兌收益。",
        },
      },
      { data_date: "2026-11-19", score: 32.942, rating: null, indicators: null, raw_data: null },
      { data_date: "2026-11-18", score: null },
      { data_date: "2026-02-30", score: 31.5 },
      { data_date: "bad", score: 31.5 },
      { data_date: "2026-11-17", score: -1 },
    ], error: null });
    state.order.mockReturnValue({ limit: state.limit });
    state.eq.mockReturnValue({ order: state.order });
    state.select.mockReturnValue({ eq: state.eq });
    state.from.mockReturnValue({ select: state.select });

    await expect(getUsdTwdExchangeRateHistory()).resolves.toEqual([
      {
        date: "2026-11-19", rate: 32.942, rating: null, trend: null, trendLabel: null,
        stockMarketImpact: null, stockMarketImpactLabel: null, trendWindowDays: null, fourteenDayChangePercent: null,
        stockMarketImpactDetail: null, sectorNote: null,
      },
      {
        date: "2026-11-20", rate: 32.936, rating: "台股偏利空", trend: "twd_depreciating", trendLabel: "台幣貶值",
        stockMarketImpact: "bearish", stockMarketImpactLabel: "台股偏利空", trendWindowDays: 14, fourteenDayChangePercent: 0.4146,
        stockMarketImpactDetail: "台幣貶值常伴隨外資賣超並匯出。", sectorNote: "出口股可能有匯兌收益。",
      },
    ]);
    expect(state.from).toHaveBeenLastCalledWith("market_sentiment");
    expect(state.select).toHaveBeenLastCalledWith("data_date,score,rating,indicators,raw_data");
    expect(state.eq).toHaveBeenLastCalledWith("source", "twd_usd_exchange_rate");
    expect(state.order).toHaveBeenLastCalledWith("data_date", { ascending: false });
    expect(state.limit).toHaveBeenLastCalledWith(14);
  });

  it("throws USD/TWD query errors", async () => {
    state.limit.mockResolvedValue({ data: null, error: new Error("offline") });
    await expect(getUsdTwdExchangeRateHistory()).rejects.toThrow("offline");
  });
});
