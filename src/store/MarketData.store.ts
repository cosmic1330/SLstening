import { create } from "zustand";
import { TickDealsType } from "../types";

// 定義市場資料狀態
interface MarketDataState {
  // 以股票 ID 為 Key，儲存即時報價數據
  ticks: Map<string, TickDealsType>;
  
  // 更新單一股票的 Tick 數據
  updateTick: (tick: TickDealsType) => void;
  
  // 批次更新（可選，用於性能優化）
  batchUpdateTicks: (ticks: TickDealsType[]) => void;
  
  // 取得特定股票的數據
  getTick: (id: string) => TickDealsType | undefined;
}

const useMarketDataStore = create<MarketDataState>((set, get) => ({
  ticks: new Map(),

  updateTick: (tick: TickDealsType) => {
    set((state) => {
      const newTicks = new Map(state.ticks);
      newTicks.set(tick.id, tick);
      return { ticks: newTicks };
    });
  },

  batchUpdateTicks: (ticks: TickDealsType[]) => {
    set((state) => {
      const newTicks = new Map(state.ticks);
      ticks.forEach((tick) => newTicks.set(tick.id, tick));
      return { ticks: newTicks };
    });
  },

  getTick: (id: string) => {
    return get().ticks.get(id);
  },
}));

export default useMarketDataStore;
