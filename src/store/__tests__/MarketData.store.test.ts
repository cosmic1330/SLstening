import { beforeEach, describe, expect, it, vi } from "vitest";
import { TickDealsType } from "../../types";
import useMarketDataStore from "../MarketData.store";

const createTick = (id: string, price: number): TickDealsType => ({
  id,
  name: id,
  ts: 1_700_000_000,
  price,
  avgPrices: [price],
  changePercent: 1.5,
  closes: [price],
  previousClose: price - 1,
  timestamps: [1_700_000_000],
  volume: 100,
});

describe("MarketData.store", () => {
  beforeEach(() => {
    useMarketDataStore.setState({
      ticks: new Map(),
      tickUpdatedAt: new Map(),
    });
    vi.useRealTimers();
  });

  it("updates one tick and records the local receive time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-22T10:00:00+08:00"));

    const previousTicks = useMarketDataStore.getState().ticks;
    const tick = createTick("2330", 100);

    useMarketDataStore.getState().updateTick(tick);

    const state = useMarketDataStore.getState();
    expect(state.getTick("2330")).toEqual(tick);
    expect(state.tickUpdatedAt.get("2330")).toBe(Date.now());
    expect(state.ticks).not.toBe(previousTicks);
  });

  it("batch updates ticks with one consistent receive time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-22T10:00:30+08:00"));

    const ticks = [createTick("2330", 101), createTick("2317", 202)];
    useMarketDataStore.getState().batchUpdateTicks(ticks);

    const state = useMarketDataStore.getState();
    expect(state.getTick("2330")?.price).toBe(101);
    expect(state.getTick("2317")?.price).toBe(202);
    expect(state.tickUpdatedAt.get("2330")).toBe(Date.now());
    expect(state.tickUpdatedAt.get("2317")).toBe(Date.now());
  });

  it("returns undefined for an unknown symbol", () => {
    expect(useMarketDataStore.getState().getTick("missing")).toBeUndefined();
  });
});
