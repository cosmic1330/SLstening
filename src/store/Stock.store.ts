import { Store } from "@tauri-apps/plugin-store";
import { create } from "zustand";
import { CategoryType, StockStoreType } from "../types";

export const DEFAULT_WATCHLIST_ID = "default-watchlist";
export const isDefaultCategory = (category: CategoryType) => category.id === DEFAULT_WATCHLIST_ID || category.isDefault === true;
const uniqueIds = (ids: string[]) => [...new Set(ids)];
const sameJson = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const defaultCategory = (stockIds: string[] = []): CategoryType => ({ id: DEFAULT_WATCHLIST_ID, name: "", stockIds: uniqueIds(stockIds), isDefault: true });

const normalizeCategories = (persisted: CategoryType[], stocks: StockStoreType[]): CategoryType[] => {
  const defaults = persisted.filter(isDefaultCategory);
  const custom = persisted.filter((category) => !isDefaultCategory(category));
  // Legacy settings had no categories. Do not reapply this migration after users edit memberships.
  const defaultIds = defaults.length ? defaults.flatMap((category) => category.stockIds || []) : stocks.map((stock) => stock.id);
  return [defaultCategory(defaultIds), ...custom.map((category) => ({ ...category, stockIds: uniqueIds(category.stockIds || []), isDefault: undefined }))];
};

const keepDefaultFirst = (categories: CategoryType[]) => {
  const existingDefault = categories.find(isDefaultCategory);
  return [defaultCategory(existingDefault?.stockIds), ...categories.filter((category) => !isDefaultCategory(category)).map((category) => ({ ...category, stockIds: uniqueIds(category.stockIds || []) }))];
};

const hasCategoryName = (categories: CategoryType[], name: string, exceptId?: string) => {
  const normalized = name.trim().toLocaleLowerCase();
  return categories.some((category) => category.id !== exceptId && !isDefaultCategory(category) && category.name.trim().toLocaleLowerCase() === normalized);
};

const withoutStocks = (categories: CategoryType[], ids: string[]) => categories.map((category) => ({ ...category, stockIds: category.stockIds.filter((stockId) => !ids.includes(stockId)) }));
const pruneUntrackedStocks = (stocks: StockStoreType[], categories: CategoryType[]) => {
  const trackedIds = new Set(categories.flatMap((category) => category.stockIds));
  return stocks.filter((stock) => trackedIds.has(stock.id));
};
const saveTracking = async (stocks: StockStoreType[], categories: CategoryType[]) => {
  const store = await Store.load("settings.json");
  await store.set("stocks", stocks);
  await store.set("categories", categories);
  await store.save();
};
let mutationQueue: Promise<void> = Promise.resolve();
const enqueueMutation = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = mutationQueue.then(operation, operation);
  mutationQueue = result.then(() => undefined, () => undefined);
  return result;
};

interface StocksState {
  stocks: StockStoreType[];
  menu: StockStoreType[];
  categories: CategoryType[];
  activeCategoryId: string;
  hydrated: boolean;
  pinnedCategoryIds: string[];
  recentCategoryIds: string[];
  increase: (stock: StockStoreType) => Promise<void>;
  remove: (id: string) => Promise<void>;
  removeStocks: (ids: string[]) => Promise<void>;
  reload: () => Promise<void>;
  clear: () => Promise<void>;
  update_menu: (stocks: StockStoreType[]) => Promise<void>;
  factory_reset: () => Promise<void>;
  fetchSupabaseWatchStock: () => Promise<StockStoreType[]>;
  addStocks: (stocks: StockStoreType[]) => Promise<void>;
  removeSupabaseWatchStock: (id: string) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  renameCategory: (id: string, name: string) => Promise<void>;
  addStockToCategory: (categoryId: string, stockId: string) => Promise<void>;
  removeStockFromCategory: (categoryId: string, stockId: string) => Promise<void>;
  setStockCategories: (stock: StockStoreType, categoryIds: string[]) => Promise<void>;
  updateStockOrder: (categoryId: string, stockIds: string[]) => Promise<void>;
  updateCategories: (categories: CategoryType[]) => Promise<void>;
  setActiveCategory: (id: string) => Promise<void>;
  togglePinnedCategory: (id: string) => Promise<void>;
  reorderPinnedCategories: (ids: string[]) => Promise<void>;
}

const useStocksStore = create<StocksState>((set, get) => ({
  stocks: [], menu: [], categories: [], activeCategoryId: DEFAULT_WATCHLIST_ID, hydrated: false, pinnedCategoryIds: [], recentCategoryIds: [],
  reload: () => enqueueMutation(async () => {
    const store = await Store.load("settings.json");
    const stocks = ((await store.get("stocks")) as StockStoreType[]) || [];
    const menu = ((await store.get("menu")) as StockStoreType[]) || [];
    const storedCategories = ((await store.get("categories")) as CategoryType[]) || [];
    const categories = normalizeCategories(storedCategories, stocks);
    const storedActiveId = (await store.get("activeCategoryId")) as string | undefined;
    const categoryIds = new Set(categories.map((category) => category.id));
    const pinnedCategoryIds = uniqueIds(((await store.get("pinnedCategoryIds")) as string[] || []).filter((id) => id !== DEFAULT_WATCHLIST_ID && categoryIds.has(id))).slice(0, 5);
    const recentCategoryIds = uniqueIds(((await store.get("recentCategoryIds")) as string[] || []).filter((id) => id !== DEFAULT_WATCHLIST_ID && categoryIds.has(id) && !pinnedCategoryIds.includes(id))).slice(0, 3);
    const activeCategoryId = categories.some((category) => category.id === storedActiveId) ? storedActiveId! : DEFAULT_WATCHLIST_ID;
    if (!sameJson(storedCategories, categories) || storedActiveId !== activeCategoryId || !sameJson(await store.get("pinnedCategoryIds"), pinnedCategoryIds) || !sameJson(await store.get("recentCategoryIds"), recentCategoryIds)) {
      await store.set("categories", categories);
      await store.set("activeCategoryId", activeCategoryId);
      await store.set("pinnedCategoryIds", pinnedCategoryIds);
      await store.set("recentCategoryIds", recentCategoryIds);
      await store.save();
    }
    set({ stocks, menu, categories, activeCategoryId, pinnedCategoryIds, recentCategoryIds, hydrated: true });
  }),
  increase: async (stock) => get().setStockCategories(stock, [DEFAULT_WATCHLIST_ID]),
  addStocks: (newStocks) => enqueueMutation(async () => {
    const current = get(); const knownIds = new Set(current.stocks.map((stock) => stock.id));
    const additions = newStocks.filter((stock) => !knownIds.has(stock.id));
    if (!additions.length) return;
    const stocks = [...additions, ...current.stocks];
    const sourceCategories = current.categories.length ? current.categories : [defaultCategory()];
    const categories = sourceCategories.map((category) => isDefaultCategory(category) ? { ...category, stockIds: uniqueIds([...additions.map((stock) => stock.id), ...category.stockIds]) } : category);
    await saveTracking(stocks, categories); set({ stocks, categories });
  }),
  remove: async (id) => get().removeStocks([id]),
  removeStocks: (ids) => enqueueMutation(async () => {
    const removedIds = uniqueIds(ids); const stocks = get().stocks.filter((stock) => !removedIds.includes(stock.id));
    const categories = withoutStocks(get().categories, removedIds);
    await saveTracking(stocks, categories); set({ stocks, categories });
  }),
  clear: () => enqueueMutation(async () => {
    const categories = get().categories.map((category) => ({ ...category, stockIds: [] }));
    await saveTracking([], categories); set({ stocks: [], categories });
  }),
  update_menu: (menu) => enqueueMutation(async () => { const store = await Store.load("settings.json"); await store.set("menu", menu); await store.save(); set({ menu }); }),
  factory_reset: () => enqueueMutation(async () => { const store = await Store.load("settings.json"); await store.clear(); }),
  fetchSupabaseWatchStock: async () => {
    const { supabase } = await import("../supabase"); const { data: { user } } = await supabase.auth.getUser(); if (!user) return [];
    const { data: watchStocks, error } = await supabase.from("watch_stock").select("stock_id").eq("user_id", user.id);
    if (error) { console.error("Error fetching watch_stock:", error); return []; }
    const { stocks, menu } = get();
    return (watchStocks || []).map((item: { stock_id: string }) => {
      const menuStock = menu.find((stock) => stock.id === item.stock_id);
      return { id: item.stock_id, name: menuStock?.name || "Unknown", group: menuStock?.group || "", type: menuStock?.type || "" };
    }).filter((stock) => !stocks.some((existing) => existing.id === stock.id));
  },
  removeSupabaseWatchStock: async (id) => {
    const { supabase } = await import("../supabase"); const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    const { error } = await supabase.from("watch_stock").delete().eq("user_id", user.id).eq("stock_id", id); if (error) throw error;
  },
  addCategory: (name) => enqueueMutation(async () => {
    const trimmedName = name.trim(); if (!trimmedName) throw new Error("CATEGORY_NAME_REQUIRED");
    if (hasCategoryName(get().categories, trimmedName)) throw new Error("CATEGORY_NAME_DUPLICATE");
    const categories = [...get().categories, { id: crypto.randomUUID(), name: trimmedName, stockIds: [] }];
    await saveTracking(get().stocks, categories); set({ categories });
  }),
  removeCategory: (id) => enqueueMutation(async () => {
    if (id === DEFAULT_WATCHLIST_ID) return;
    const categories = get().categories.filter((category) => category.id !== id); const stocks = pruneUntrackedStocks(get().stocks, categories);
    const activeCategoryId = get().activeCategoryId === id ? DEFAULT_WATCHLIST_ID : get().activeCategoryId;
    const pinnedCategoryIds = get().pinnedCategoryIds.filter((item) => item !== id); const recentCategoryIds = get().recentCategoryIds.filter((item) => item !== id);
    const store = await Store.load("settings.json"); await store.set("stocks", stocks); await store.set("categories", categories); await store.set("activeCategoryId", activeCategoryId); await store.set("pinnedCategoryIds", pinnedCategoryIds); await store.set("recentCategoryIds", recentCategoryIds); await store.save();
    set({ stocks, categories, activeCategoryId, pinnedCategoryIds, recentCategoryIds });
  }),
  renameCategory: (id, name) => enqueueMutation(async () => {
    if (id === DEFAULT_WATCHLIST_ID) return;
    const trimmedName = name.trim(); if (!trimmedName) throw new Error("CATEGORY_NAME_REQUIRED");
    if (hasCategoryName(get().categories, trimmedName, id)) throw new Error("CATEGORY_NAME_DUPLICATE");
    const categories = get().categories.map((category) => category.id === id ? { ...category, name: trimmedName } : category);
    await saveTracking(get().stocks, categories); set({ categories });
  }),
  addStockToCategory: (categoryId, stockId) => enqueueMutation(async () => {
    const current = get();
    const stock = current.menu.find((item) => item.id === stockId) ?? current.stocks.find((item) => item.id === stockId);
    if (!stock || !current.categories.some((category) => category.id === categoryId)) return;
    const categories = current.categories.map((category) => category.id === categoryId && !category.stockIds.includes(stockId) ? { ...category, stockIds: [stockId, ...category.stockIds] } : category);
    const stocks = current.stocks.some((item) => item.id === stockId) ? current.stocks : [stock, ...current.stocks];
    await saveTracking(stocks, categories); set({ stocks, categories });
  }),
  removeStockFromCategory: (categoryId, stockId) => enqueueMutation(async () => {
    const categories = get().categories.map((category) => category.id === categoryId ? { ...category, stockIds: category.stockIds.filter((id) => id !== stockId) } : category);
    const stocks = pruneUntrackedStocks(get().stocks, categories); await saveTracking(stocks, categories); set({ stocks, categories });
  }),
  setStockCategories: (stock, categoryIds) => enqueueMutation(async () => {
    const selectedIds = uniqueIds(categoryIds); if (!selectedIds.length) throw new Error("CATEGORY_SELECTION_REQUIRED");
    const before = get().categories.length ? get().categories : [defaultCategory()];
    if (!selectedIds.every((id) => before.some((category) => category.id === id))) throw new Error("CATEGORY_SELECTION_INVALID");
    const categories = before.map((category) => {
      if (selectedIds.includes(category.id)) {
        return category.stockIds.includes(stock.id)
          ? category
          : { ...category, stockIds: [stock.id, ...category.stockIds] };
      }
      return { ...category, stockIds: category.stockIds.filter((id) => id !== stock.id) };
    });
    const stocks = get().stocks.some((item) => item.id === stock.id) ? get().stocks : [stock, ...get().stocks];
    await saveTracking(stocks, categories); set({ stocks, categories });
  }),
  updateStockOrder: (categoryId, stockIds) => enqueueMutation(async () => {
    const category = get().categories.find((item) => item.id === categoryId);
    const orderedIds = uniqueIds(stockIds);
    if (!category || orderedIds.length !== category.stockIds.length || orderedIds.some((id) => !category.stockIds.includes(id))) return;
    const categories = get().categories.map((item) => item.id === categoryId ? { ...item, stockIds: orderedIds } : item);
    await saveTracking(get().stocks, categories); set({ categories });
  }),
  updateCategories: (categories) => enqueueMutation(async () => { const normalized = keepDefaultFirst(categories); await saveTracking(get().stocks, normalized); set({ categories: normalized }); }),
  setActiveCategory: (id) => enqueueMutation(async () => {
    const activeCategoryId = get().categories.some((category) => category.id === id) ? id : DEFAULT_WATCHLIST_ID;
    const recentCategoryIds = activeCategoryId === DEFAULT_WATCHLIST_ID || get().pinnedCategoryIds.includes(activeCategoryId)
      ? get().recentCategoryIds
      : uniqueIds([activeCategoryId, ...get().recentCategoryIds]).filter((recentId) => !get().pinnedCategoryIds.includes(recentId)).slice(0, 3);
    const store = await Store.load("settings.json"); await store.set("activeCategoryId", activeCategoryId); await store.set("recentCategoryIds", recentCategoryIds); await store.save(); set({ activeCategoryId, recentCategoryIds });
  }),
  togglePinnedCategory: (id) => enqueueMutation(async () => {
    if (id === DEFAULT_WATCHLIST_ID || !get().categories.some((category) => category.id === id)) return;
    const isPinned = get().pinnedCategoryIds.includes(id);
    if (!isPinned && get().pinnedCategoryIds.length >= 5) throw new Error("PIN_LIMIT_REACHED");
    const pinnedCategoryIds = isPinned ? get().pinnedCategoryIds.filter((item) => item !== id) : [...get().pinnedCategoryIds, id];
    const recentCategoryIds = get().recentCategoryIds.filter((item) => item !== id);
    const store = await Store.load("settings.json"); await store.set("pinnedCategoryIds", pinnedCategoryIds); await store.set("recentCategoryIds", recentCategoryIds); await store.save(); set({ pinnedCategoryIds, recentCategoryIds });
  }),
  reorderPinnedCategories: (ids) => enqueueMutation(async () => {
    const pinnedCategoryIds = uniqueIds(ids).filter((id) => get().pinnedCategoryIds.includes(id));
    if (pinnedCategoryIds.length !== get().pinnedCategoryIds.length) return;
    const store = await Store.load("settings.json"); await store.set("pinnedCategoryIds", pinnedCategoryIds); await store.save(); set({ pinnedCategoryIds });
  }),
}));

export default useStocksStore;
