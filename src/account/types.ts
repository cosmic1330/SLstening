import type { CategoryType, StockStoreType } from "../types";

export interface IndicatorSettings {
  ma5: number;
  ma10: number;
  ma20: number;
  ma60: number;
  boll: number;
  kd: number;
  mfi: number;
  rsi: number;
  ma120: number;
  ma240: number;
  emaShort: number;
  emaLong: number;
  cmf: number;
  cmfEma: number;
  atrLen: number;
  atrMult: number;
  donchian: number;
  cci: number;
}

export interface AccountSnapshot {
  stocks: StockStoreType[];
  categories: CategoryType[];
  activeCategoryId: string;
  pinnedCategoryIds: string[];
  recentCategoryIds: string[];
  indicatorSettings: IndicatorSettings;
}

export interface NativeSessionResult {
  userId: string;
  epoch: number;
  expiresAt: number | null;
}

export interface NativeAccountState {
  userId: string;
  epoch: number;
  revision: number;
  schemaVersion: number;
  data: AccountSnapshot | null;
  updatedAt: string | null;
}

export interface NativeAccountWriteResult {
  userId: string;
  epoch: number;
  revision: number;
  updatedAt: string | null;
}

export interface LegacyImportResult {
  userId: string;
  epoch: number;
  revision: number;
  updatedAt: string | null;
}

