import { Store } from "@tauri-apps/plugin-store";
import { create } from "zustand";

/**
 * zustand跨window沒有用
 * 僅能在同一個thread中進行
 **/

export type StockField = {
  id: string;
  name: string;
  type: string;
  group: string;
};

interface StocksState {
  stocks: StockField[];
  menu: StockField[];
  increase: ({ id, name }: StockField) => void;
  remove: (id: string) => void;
  reload: () => void;
  clear: () => void;
  update_menu: (stocks: StockField[]) => void;
  factory_reset: () => void;
}

const useStocksStore = create<StocksState>((set, get) => ({
  stocks: [],
  menu: [],
  increase: async (stock: StockField) => {
    // 去除重複
    const uniqueData = Array.from(new Set([...get().stocks, stock]));
    const store = await Store.load("settings.json");
    await store.set("stocks", uniqueData);
    await store.save();
    set(() => {
      return {
        stocks: uniqueData,
      };
    });
  },
  remove: async (id: string) => {
    const data = get().stocks.filter((stock) => stock.id !== id);
    const store = await Store.load("settings.json");
    await store.set("stocks", data);
    await store.save();
    set(() => {
      return {
        stocks: data,
      };
    });
  },
  reload: async () => {
    const store = await Store.load("settings.json");
    const stocks = ((await store.get("stocks")) as StockField[]) || [];
    const menu = ((await store.get("menu")) as StockField[]) || [];
    set(() => ({ stocks, menu }));
  },
  clear: async () => {
    const store = await Store.load("settings.json");
    await store.delete("stocks");
    set({ stocks: [] });
  },
  update_menu: async (stocks: StockField[]) => {
    const store = await Store.load("settings.json");
    await store.set("menu", stocks);
    await store.save();
    set(() => ({
      menu: stocks,
    }));
  },
  factory_reset: async () => {
    const store = await Store.load("settings.json");
    await store.clear();
  },
}));

export default useStocksStore;
