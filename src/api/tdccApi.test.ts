import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  from: vi.fn(),
}));

vi.mock("../supabase", () => ({ supabase: { from: state.from } }));

import { getTdccHolder, getTdccStockId } from "./tdccApi";

describe("TDCC API", () => {
  it("accepts numeric Taiwan symbols and rejects non-Taiwan symbols", () => {
    expect(getTdccStockId("2330")).toBe(2330);
    expect(getTdccStockId("2330.TW")).toBe(2330);
    expect(getTdccStockId("AAPL")).toBeNull();
  });

  it("queries only the needed TDCC fields for a numeric stock id", async () => {
    state.maybeSingle.mockResolvedValue({ data: null, error: null });
    state.eq.mockReturnValue({ maybeSingle: state.maybeSingle });
    state.select.mockReturnValue({ eq: state.eq });
    state.from.mockReturnValue({ select: state.select });

    await expect(getTdccHolder("2330.TW")).resolves.toBeNull();
    expect(state.from).toHaveBeenCalledWith("tdcc_holder");
    expect(state.select).toHaveBeenCalledWith(expect.stringContaining("holders_100"));
    expect(state.eq).toHaveBeenCalledWith("stock_id", 2330);
    expect(state.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("does not query Supabase for nonnumeric symbols", async () => {
    state.from.mockClear();
    await expect(getTdccHolder("AAPL")).resolves.toBeNull();
    expect(state.from).not.toHaveBeenCalled();
  });
});
