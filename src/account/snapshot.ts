import type { CategoryType, StockStoreType } from "../types";
import type { AccountSnapshot, IndicatorSettings } from "./types";

export const EMPTY_CATEGORY_ID = "";

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
  categories: [],
  activeCategoryId: EMPTY_CATEGORY_ID,
  pinnedCategoryIds: [],
  recentCategoryIds: [],
  indicatorSettings: { ...DEFAULT_INDICATOR_SETTINGS },
});

const unique = (values: string[]) => [...new Set(values)];

/**
 * Normalize only the current in-memory projection. This function deliberately
 * does not perform any legacy migration.
 */
export function normalizeAccountSnapshot(value: Partial<AccountSnapshot>): AccountSnapshot {
  const sourceStocks = Array.isArray(value.stocks) ? value.stocks : [];
  const stocks = sourceStocks.filter((stock, index, list): stock is StockStoreType => Boolean(
    stock
    && typeof stock.id === "string"
    && stock.id.trim()
    && list.findIndex((item) => item?.id === stock.id) === index,
  )).map((stock) => ({
    id: stock.id.trim(),
    name: typeof stock.name === "string" ? stock.name : "",
    group: typeof stock.group === "string" && stock.group ? stock.group : inferMarketGroup(stock.id),
    type: typeof stock.type === "string" && stock.type ? stock.type : "stock",
  }));
  const stockIds = new Set(stocks.map((stock) => stock.id));
  const sourceCategories = Array.isArray(value.categories) ? value.categories : [];
  const categories: CategoryType[] = sourceCategories
    .filter((category) => category && typeof category.id === "string" && category.id.trim())
    .map((category) => ({
      id: category.id.trim(),
      name: typeof category.name === "string" ? category.name.trim() : "",
      stockIds: unique(Array.isArray(category.stockIds)
        ? category.stockIds.filter((id): id is string => typeof id === "string" && stockIds.has(id))
        : []),
    }))
    .filter((category, index, list) => list.findIndex((item) => item.id === category.id) === index);
  const categoryIds = new Set(categories.map((category) => category.id));
  const pinned = unique(Array.isArray(value.pinnedCategoryIds) ? value.pinnedCategoryIds.filter((id) => categoryIds.has(id)) : []).slice(0, 5);
  const recent = unique(Array.isArray(value.recentCategoryIds)
    ? value.recentCategoryIds.filter((id) => categoryIds.has(id) && !pinned.includes(id))
    : []).slice(0, 3);
  const activeCategoryId = typeof value.activeCategoryId === "string" && categoryIds.has(value.activeCategoryId)
    ? value.activeCategoryId
    : categories[0]?.id ?? EMPTY_CATEGORY_ID;
  const indicatorSettings = { ...DEFAULT_INDICATOR_SETTINGS, ...(value.indicatorSettings ?? {}) };
  return {
    stocks,
    categories,
    activeCategoryId,
    pinnedCategoryIds: pinned,
    recentCategoryIds: recent,
    indicatorSettings,
  };
}

export function inferMarketGroup(symbol: string): "TW" | "US" {
  const value = symbol.trim().toUpperCase();
  return value.startsWith("TW:") || value.startsWith("TW-") || /^\d+$/.test(value) || value.endsWith(".TW") || value.endsWith(".TWO")
    ? "TW"
    : "US";
}

export function hasPersonalData(snapshot: AccountSnapshot) {
  const indicatorSettingsDiffer = (Object.keys(DEFAULT_INDICATOR_SETTINGS) as Array<keyof IndicatorSettings>)
    .some((key) => snapshot.indicatorSettings[key] !== DEFAULT_INDICATOR_SETTINGS[key]);
  return snapshot.stocks.length > 0 || snapshot.categories.length > 0 || indicatorSettingsDiffer;
}
