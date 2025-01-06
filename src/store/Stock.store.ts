import { load, Store } from "@tauri-apps/plugin-store";
import { create } from "zustand";

/**
 * zustand跨window沒有用
 * 僅能在同一個thread中進行
 **/

interface StocksState {
  stocks: string[];
  increase: (id: string) => void;
  remove: (id: string) => void;
  reload: () => void;
}

// todo: 使用(async ()=>())() 無法馬上取得store
let store:Store;
(async () => {
  store = await load("store.dat");
})();

const useStocksStore = create<StocksState>((set) => ({
  stocks: [],
  increase: async (id: string) => {
    set((state) => {
      // 去除重複
      const uniqueData = Array.from(new Set([...state.stocks, id]));
      console.log(uniqueData);
      (async () => {
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
      const data = state.stocks.filter((stock) => stock !== id);
      (async () => {
        await store.set("stocks", data);
        await store.save();
      })();
      return {
        stocks: data,
      };
    });
  },
  reload: async () => {
    const data = (await store.get("stocks")) as string[] || [];
    set({ stocks: data });
  }
}));

export default useStocksStore;
