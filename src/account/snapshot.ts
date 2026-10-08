import { Store } from "@tauri-apps/plugin-store";
import { DEFAULT_WATCHLIST_ID } from "./constants";
import type { CategoryType, StockStoreType } from "../types";
import type { AccountSnapshot, IndicatorSettings } from "./types";

export const DEFAULT_INDICATOR_SETTINGS: IndicatorSettings = {
  ma5: 5,
  ma10: 10,
  ma20: 30,
  ma60: 60,
  boll: 30,
  kd: 9,
  mfi: 14,
  rsi: 14,
  ma120: 120,
  ma240: 240,
  emaShort: 5,
  emaLong: 10,
  cmf: 21,
  cmfEma: 5,
  atrLen: 10,
  atrMult: 3,
  donchian: 20,
  cci: 26,
};

export const emptyAccountSnapshot = (): AccountSnapshot => ({
  stocks: [],
  categories: [{ id: DEFAULT_WATCHLIST_ID, name: "", stockIds: [], isDefault: true }],
  activeCategoryId: DEFAULT_WATCHLIST_ID,
  pinnedCategoryIds: [],
  recentCategoryIds: [],
  indicatorSettings: { ...DEFAULT_INDICATOR_SETTINGS },
});

export interface LegacySnapshotDetails {
  snapshot: AccountSnapshot;
  unresolvedStockIds: string[];
}

export interface LegacyRepairPlan {
  snapshot: AccountSnapshot;
  unresolvedStockIds: string[];
  missingCategoryIds: string[];
  missingMemberships: Array<{ categoryId: string; stockIds: string[] }>;
}

export function normalizeAccountSnapshot(value: AccountSnapshot): AccountSnapshot {
  const sourceStocks = Array.isArray(value.stocks) ? value.stocks : [];
  const stocks = sourceStocks.filter((stock, index, list) =>
    stock && typeof stock.id === "string" && list.findIndex((item) => item?.id === stock.id) === index,
  );
  const stockIds = new Set(stocks.map((stock) => stock.id));
  const sourceCategories = Array.isArray(value.categories)
    ? value.categories.filter((category) => category && typeof category.id === "string")
    : [];
  const defaultSource = sourceCategories.find((category) => category.id === DEFAULT_WATCHLIST_ID || category.isDefault === true);
  const categories: CategoryType[] = [
    { id: DEFAULT_WATCHLIST_ID, name: "", stockIds: unique(Array.isArray(defaultSource?.stockIds) ? defaultSource.stockIds : stocks.map((stock) => stock.id)), isDefault: true },
    ...sourceCategories
      .filter((category) => category.id !== DEFAULT_WATCHLIST_ID && category.isDefault !== true && typeof category.id === "string")
      .map((category) => ({
        id: category.id,
        name: typeof category.name === "string" ? category.name.trim() : "",
        stockIds: unique(Array.isArray(category.stockIds) ? category.stockIds.filter((id): id is string => typeof id === "string") : []),
      })),
  ].map((category) => ({
    ...category,
    stockIds: category.stockIds.filter((id) => stockIds.has(id)),
  }));
  const categoryIds = new Set(categories.map((category) => category.id));
  const pinned = unique((value.pinnedCategoryIds ?? []).filter((id) => id !== DEFAULT_WATCHLIST_ID && categoryIds.has(id))).slice(0, 5);
  const recent = unique((value.recentCategoryIds ?? []).filter((id) => id !== DEFAULT_WATCHLIST_ID && categoryIds.has(id) && !pinned.includes(id))).slice(0, 3);
  const settings = { ...DEFAULT_INDICATOR_SETTINGS, ...(value.indicatorSettings ?? {}) };
  return {
    stocks,
    categories,
    activeCategoryId: categoryIds.has(value.activeCategoryId) ? value.activeCategoryId : DEFAULT_WATCHLIST_ID,
    pinnedCategoryIds: pinned,
    recentCategoryIds: recent,
    indicatorSettings: settings,
  };
}

export function readLegacyIndicatorSettings(): IndicatorSettings {
  const settings = { ...DEFAULT_INDICATOR_SETTINGS };
  let migrated = false;
  if (typeof globalThis.localStorage === "undefined") return settings;
  const raw = globalThis.localStorage.getItem("slitenting-indicator-settings");
  if (raw) {
    try { Object.assign(settings, JSON.parse(raw)); } catch { /* keep safe defaults */ }
  }
  if (!globalThis.localStorage.getItem("slitenting-indicator-settings-ma30-migrated")) {
    if (settings.ma20 === 20) { settings.ma20 = 30; migrated = true; }
    if (settings.boll === 20) { settings.boll = 30; migrated = true; }
    globalThis.localStorage.setItem("slitenting-indicator-settings-ma30-migrated", "true");
  }
  if (!globalThis.localStorage.getItem("slitenting-indicator-settings-supertrend-10-3-migrated")) {
    settings.atrLen = 10;
    settings.atrMult = 3;
    migrated = true;
    globalThis.localStorage.setItem("slitenting-indicator-settings-supertrend-10-3-migrated", "true");
  }
  if (!globalThis.localStorage.getItem("slitenting-indicator-settings-cci-26-migrated")) {
    settings.cci = 26;
    migrated = true;
    globalThis.localStorage.setItem("slitenting-indicator-settings-cci-26-migrated", "true");
  }
  if (migrated) globalThis.localStorage.setItem("slitenting-indicator-settings", JSON.stringify(settings));
  return settings;
}

export async function readLegacySnapshot(): Promise<AccountSnapshot> {
  const details = await readLegacySnapshotDetails();
  return details.snapshot;
}

/**
 * Read the old, device-wide snapshot without serializing the shared menu.
 * Older versions persisted only the default category's stocks, while custom
 * categories retained IDs that can be resolved from the local menu catalog.
 */
export async function readLegacySnapshotDetails(): Promise<LegacySnapshotDetails> {
  const store = await Store.load("settings.json");
  const storedStocks = (await store.get("stocks")) as StockStoreType[] | undefined;
  const storedMenu = (await store.get("menu")) as StockStoreType[] | undefined;
  const storedCategories = (await store.get("categories")) as CategoryType[] | undefined;
  const legacyStocks = Array.isArray(storedStocks) ? storedStocks : [];
  const menu = Array.isArray(storedMenu) ? storedMenu : [];
  const categories = Array.isArray(storedCategories) ? storedCategories : [];
  const activeCategoryId = ((await store.get("activeCategoryId")) as string | undefined) || DEFAULT_WATCHLIST_ID;
  const pinnedCategoryIds = ((await store.get("pinnedCategoryIds")) as string[] | undefined) || [];
  const recentCategoryIds = ((await store.get("recentCategoryIds")) as string[] | undefined) || [];
  const knownStocks = new Set<string>();
  const stocks: StockStoreType[] = [];
  const isStockRecord = (stock: StockStoreType | undefined): stock is StockStoreType => Boolean(
    stock
    && typeof stock.id === "string"
    && stock.id.trim()
    && typeof stock.name === "string"
    && typeof stock.group === "string"
    && typeof stock.type === "string",
  );
  const addStock = (stock: StockStoreType | undefined) => {
    if (!isStockRecord(stock) || knownStocks.has(stock.id)) return;
    knownStocks.add(stock.id);
    stocks.push(stock);
  };
  // Keep the original order first, then append category members in category
  // order. This makes the repair deterministic and preserves existing UI
  // ordering as far as the old data allows.
  legacyStocks.forEach(addStock);
  const menuById = new Map(menu.filter(isStockRecord).map((stock) => [stock.id, stock]));
  const unresolvedStockIds: string[] = [];
  for (const category of categories) {
    const categoryStockIds = Array.isArray(category?.stockIds) ? category.stockIds : [];
    for (const stockId of categoryStockIds) {
      if (typeof stockId !== "string" || !stockId.trim()) continue;
      if (knownStocks.has(stockId)) continue;
      const resolved = menuById.get(stockId);
      if (resolved) addStock(resolved);
      else if (!unresolvedStockIds.includes(stockId)) unresolvedStockIds.push(stockId);
    }
  }
  const snapshot = normalizeAccountSnapshot({ stocks, categories, activeCategoryId, pinnedCategoryIds, recentCategoryIds, indicatorSettings: readLegacyIndicatorSettings() });
  return { snapshot, unresolvedStockIds };
}

/**
 * Build an explicit, local repair preview. The caller must perform the cloud
 * optimistic-lock write; this helper never mutates persisted or cloud state.
 */
export function buildLegacyRepairPlan(current: AccountSnapshot, legacy: LegacySnapshotDetails): LegacyRepairPlan {
  const currentSnapshot = normalizeAccountSnapshot(current);
  const legacySnapshot = normalizeAccountSnapshot(legacy.snapshot);
  const currentCategories = new Map(currentSnapshot.categories.map((category) => [category.id, category]));
  const missingCategoryIds: string[] = [];
  const missingMemberships: Array<{ categoryId: string; stockIds: string[] }> = [];
  for (const legacyCategory of legacySnapshot.categories) {
    const currentCategory = currentCategories.get(legacyCategory.id);
    if (!currentCategory) {
      if (legacyCategory.id !== DEFAULT_WATCHLIST_ID) missingCategoryIds.push(legacyCategory.id);
      continue;
    }
    const missing = legacyCategory.stockIds.filter((stockId) => !currentCategory.stockIds.includes(stockId));
    if (missing.length) missingMemberships.push({ categoryId: legacyCategory.id, stockIds: missing });
  }
  const mergedStocks = [...currentSnapshot.stocks];
  const stockIds = new Set(mergedStocks.map((stock) => stock.id));
  for (const stock of legacySnapshot.stocks) {
    if (!stockIds.has(stock.id)) {
      mergedStocks.push(stock);
      stockIds.add(stock.id);
    }
  }
  const mergedCategories = currentSnapshot.categories.map((category) => ({ ...category, stockIds: [...category.stockIds] }));
  for (const legacyCategory of legacySnapshot.categories) {
    const currentCategory = mergedCategories.find((category) => category.id === legacyCategory.id);
    if (currentCategory) {
      for (const stockId of legacyCategory.stockIds) {
        if (stockIds.has(stockId) && !currentCategory.stockIds.includes(stockId)) currentCategory.stockIds.push(stockId);
      }
    } else if (legacyCategory.id !== DEFAULT_WATCHLIST_ID) {
      // Native validation keeps custom names unique. If a user renamed a
      // current category to the old name, merge the recoverable memberships
      // into that existing category instead of creating an invalid duplicate.
      const sameName = mergedCategories.find((category) =>
        category.id !== DEFAULT_WATCHLIST_ID
        && category.name.trim().toLocaleLowerCase() === legacyCategory.name.trim().toLocaleLowerCase(),
      );
      const target = sameName ?? legacyCategory;
      if (sameName) {
        for (const stockId of legacyCategory.stockIds) {
          if (stockIds.has(stockId) && !sameName.stockIds.includes(stockId)) sameName.stockIds.push(stockId);
        }
      } else {
        mergedCategories.push({ ...target, stockIds: legacyCategory.stockIds.filter((stockId) => stockIds.has(stockId)) });
      }
    }
  }
  const snapshot = normalizeAccountSnapshot({ ...currentSnapshot, stocks: mergedStocks, categories: mergedCategories });
  return {
    snapshot,
    unresolvedStockIds: [...legacy.unresolvedStockIds],
    missingCategoryIds,
    missingMemberships,
  };
}

export function hasPersonalData(snapshot: AccountSnapshot) {
  const indicatorSettingsDiffer = (Object.keys(DEFAULT_INDICATOR_SETTINGS) as Array<keyof IndicatorSettings>)
    .some((key) => snapshot.indicatorSettings[key] !== DEFAULT_INDICATOR_SETTINGS[key]);
  return snapshot.stocks.length > 0
    || snapshot.categories.some((category) => category.id !== DEFAULT_WATCHLIST_ID || category.stockIds.length > 0)
    || indicatorSettingsDiffer;
}

const unique = (values: string[]) => [...new Set(values)];
