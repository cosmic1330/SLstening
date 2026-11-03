import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  from: vi.fn(),
}));

vi.mock("../supabase", () => ({ supabase: { from: state.from } }));

import { getCnnFearAndGreedHistory, getTwMarginMaintenanceHistory } from "./marketSentimentApi";

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
});
