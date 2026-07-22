import { create } from "zustand";
import { TickDealsType } from "../types";

// 定義市場資料狀態
interface MarketDataState {
  // 以股票 ID 為 Key，儲存即時報價數據
  ticks: Map<string, TickDealsType>;

  // 記錄每支股票最後一次在前端收到更新的時間
  tickUpdatedAt: Map<string, number>;
  
  // 更新單一股票的 Tick 數據
  updateTick: (tick: TickDealsType) => void;
  
  // 批次更新（可選，用於性能優化）
  batchUpdateTicks: (ticks: TickDealsType[]) => void;
  
  // 取得特定股票的數據
  getTick: (id: string) => TickDealsType | undefined;
}

const useMarketDataStore = create<MarketDataState>((set, get) => ({
  ticks: new Map(),
  tickUpdatedAt: new Map(),

  updateTick: (tick: TickDealsType) => {
    set((state) => {
      const newTicks = new Map(state.ticks);
      const newTickUpdatedAt = new Map(state.tickUpdatedAt);
      newTicks.set(tick.id, tick);
      newTickUpdatedAt.set(tick.id, Date.now());
      return { ticks: newTicks, tickUpdatedAt: newTickUpdatedAt };
    });
  },

  batchUpdateTicks: (ticks: TickDealsType[]) => {
    set((state) => {
      const newTicks = new Map(state.ticks);
      const newTickUpdatedAt = new Map(state.tickUpdatedAt);
      const updatedAt = Date.now();
      ticks.forEach((tick) => {
        newTicks.set(tick.id, tick);
        newTickUpdatedAt.set(tick.id, updatedAt);
      });
      return { ticks: newTicks, tickUpdatedAt: newTickUpdatedAt };
    });
  },

  getTick: (id: string) => {
    return get().ticks.get(id);
  },
}));

export default useMarketDataStore;
