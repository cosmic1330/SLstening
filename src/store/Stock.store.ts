import { Store } from "@tauri-apps/plugin-store";
import { create } from "zustand";
import { StockStoreType } from "../types";

/**
 * zustand跨window沒有用
 * 僅能在同一個thread中進行
 **/

interface StocksState {
  stocks: StockStoreType[];
  menu: StockStoreType[];
  increase: ({ id, name }: StockStoreType) =>  Promise<void>;
  remove: (id: string) => Promise<void>;
  reload: () => Promise<void>;
  clear: () =>  Promise<void>;
  update_menu: (stocks: StockStoreType[]) => Promise<void>;
  factory_reset: () =>  Promise<void>;
}

const useStocksStore = create<StocksState>((set, get) => ({
  stocks: [],
  menu: [],
  increase: async (stock: StockStoreType) => {
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
    const stocks = ((await store.get("stocks")) as StockStoreType[]) || [];
    const menu = ((await store.get("menu")) as StockStoreType[]) || [];
    set(() => ({ stocks, menu }));
  },
  clear: async () => {
    const store = await Store.load("settings.json");
    await store.delete("stocks");
    set({ stocks: [] });
  },
  update_menu: async (stocks: StockStoreType[]) => {
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
