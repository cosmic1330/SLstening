import { load } from "@tauri-apps/plugin-store";
import { create } from "zustand";

/**
 * zustand跨window沒有用
 * 僅能在同一個thread中進行
 **/

export type StockField = { id: string; name: string; type: string };

interface StocksState {
  stocks: StockField[];
  menu: StockField[];
  increase: ({ id, name }: StockField) => void;
  remove: (id: string) => void;
  reload: () => void;
  clear: () => void;
  update_menu: (stocks: StockField[]) => void;
}

const useStocksStore = create<StocksState>((set) => ({
  stocks: [],
  menu: [],
  increase: async (stock: StockField) => {
    set((state) => {
      // 去除重複
      const uniqueData = Array.from(new Set([...state.stocks, stock]));
      (async () => {
        const store = await load("store.dat");
        await store.set("stocks", uniqueData);
        await store.save();
      })();
      return {
        stocks: uniqueData,
      };
    });
  },
  remove: (id: string) => {
    set((state) => {
      const data = state.stocks.filter((stock) => stock.id !== id);
      (async () => {
        const store = await load("store.dat");
        await store.set("stocks", data);
        await store.save();
      })();
      return {
        stocks: data,
      };
    });
  },
  reload: async () => {
    const store = await load("store.dat");
    const stocks = ((await store.get("stocks")) as StockField[]) || [];
    const menu = ((await store.get("menu")) as StockField[]) || [];
    set({ stocks, menu });
  },
  clear: async () => {
    try {
      const store = await load("store.dat");
      await store.delete('stocks');
      set({ stocks: [] });
    } catch (error) {
      console.log(error);
    }
  },
  update_menu: async (stocks: StockField[]) => {
    set(() => {
      (async () => {
        const store = await load("store.dat");
        await store.set("menu", stocks);
        await store.save();
      })();
      return {
        menu: stocks,
      };
    });
  },
}));

export default useStocksStore;
