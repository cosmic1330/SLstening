import { Store } from "@tauri-apps/plugin-store";
import { create } from "zustand";
import { CategoryType, StockStoreType } from "../types";

/**
 * zustand跨window沒有用
 * 僅能在同一個thread中進行
 **/

interface StocksState {
  stocks: StockStoreType[];
  menu: StockStoreType[];
  increase: ({ id, name }: StockStoreType) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reload: () => Promise<void>;
  clear: () => Promise<void>;
  update_menu: (stocks: StockStoreType[]) => Promise<void>;
  factory_reset: () => Promise<void>;
  fetchSupabaseWatchStock: () => Promise<StockStoreType[]>;
  addStocks: (stocks: StockStoreType[]) => Promise<void>;
  removeSupabaseWatchStock: (id: string) => Promise<void>;
  categories: CategoryType[];
  addCategory: (name: string) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  renameCategory: (id: string, name: string) => Promise<void>;
  addStockToCategory: (categoryId: string, stockId: string) => Promise<void>;
  removeStockFromCategory: (
    categoryId: string,
    stockId: string,
  ) => Promise<void>;
}

const useStocksStore = create<StocksState>((set, get) => ({
  stocks: [],
  menu: [],
  categories: [],
  increase: async (stock: StockStoreType) => {
    const currentStocks = get().stocks;
    // 檢查是否已存在相同 ID 的股票
    const exists = currentStocks.some(
      (existingStock) => existingStock.id === stock.id,
    );

    if (!exists) {
      const updatedStocks = [...currentStocks, stock];
      const store = await Store.load("settings.json");
      await store.set("stocks", updatedStocks);
      await store.save();
      set(() => {
        return {
          stocks: updatedStocks,
        };
      });
    }
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
    const categories =
      ((await store.get("categories")) as CategoryType[]) || [];
    set(() => ({ stocks, menu, categories }));
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
  fetchSupabaseWatchStock: async () => {
    const { supabase } = await import("../supabase");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: watchStocks, error } = await supabase
      .from("watch_stock")
      .select("stock_id")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching watch_stock:", error);
      return [];
    }

    const { stocks, menu } = get();
    // Filter out stocks that already exist in the local store
    // And map them with name/group/type from the menu
    const newStocks = (watchStocks || [])
      .map((ws: any) => {
        const menuStock = menu.find((s) => s.id === ws.stock_id);
        return {
          id: ws.stock_id,
          name: menuStock?.name || "Unknown",
          group: menuStock?.group || "",
          type: menuStock?.type || "",
        };
      })
      .filter((ws) => !stocks.some((existing) => existing.id === ws.id));

    return newStocks;
  },
  addStocks: async (newStocks: StockStoreType[]) => {
    const currentStocks = get().stocks;
    const updatedStocks = [...currentStocks, ...newStocks];
    const store = await Store.load("settings.json");
    await store.set("stocks", updatedStocks);
    await store.save();
    set(() => ({
      stocks: updatedStocks,
    }));
  },
  removeSupabaseWatchStock: async (id: string) => {
    const { supabase } = await import("../supabase");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("watch_stock")
      .delete()
      .eq("user_id", user.id)
      .eq("stock_id", id);

    if (error) {
      console.error("Error deleting from watch_stock:", error);
      throw error;
    }
  },
  addCategory: async (name: string) => {
    const categories = get().categories;
    const newCategory: CategoryType = {
      id: Date.now().toString(),
      name,
      stockIds: [],
    };
    const updatedCategories = [...categories, newCategory];
    const store = await Store.load("settings.json");
    await store.set("categories", updatedCategories);
    await store.save();
    set({ categories: updatedCategories });
  },
  removeCategory: async (id: string) => {
    const updatedCategories = get().categories.filter((c) => c.id !== id);
    const store = await Store.load("settings.json");
    await store.set("categories", updatedCategories);
    await store.save();
    set({ categories: updatedCategories });
  },
  renameCategory: async (id: string, name: string) => {
    const updatedCategories = get().categories.map((c) =>
      c.id === id ? { ...c, name } : c,
    );
    const store = await Store.load("settings.json");
    await store.set("categories", updatedCategories);
    await store.save();
    set({ categories: updatedCategories });
  },
  addStockToCategory: async (categoryId: string, stockId: string) => {
    const updatedCategories = get().categories.map((c) => {
      if (c.id === categoryId) {
        if (!c.stockIds.includes(stockId)) {
          return { ...c, stockIds: [...c.stockIds, stockId] };
        }
      }
      return c;
    });
    const store = await Store.load("settings.json");
    await store.set("categories", updatedCategories);
    await store.save();
    set({ categories: updatedCategories });
  },
  removeStockFromCategory: async (categoryId: string, stockId: string) => {
    const updatedCategories = get().categories.map((c) => {
      if (c.id === categoryId) {
        return { ...c, stockIds: c.stockIds.filter((id) => id !== stockId) };
      }
      return c;
    });
    const store = await Store.load("settings.json");
    await store.set("categories", updatedCategories);
    await store.save();
    set({ categories: updatedCategories });
  },
}));

export default useStocksStore;
