import { StockListType } from "@ch20026103/anysis/dist/esm/stockSkills/types";
import { create } from "zustand";

/**  
 * zustand跨window沒有用
 * 僅能在同一個thread中進行
 **/
interface StockListState {
  deals: Record<string, StockListType>;
  increase: (id: string, deal: StockListType) => void;
}

const useStockListStore = create<StockListState>((set) => ({
  deals: {},
  increase: (id: string, deals: StockListType) =>
    set((state) => ({
      deals: { ...state.deals, [id]: deals },
    })),
}));

export default useStockListStore;
