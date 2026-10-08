import { Store } from "@tauri-apps/plugin-store";
import { create } from "zustand";
import { CategoryType, StockStoreType } from "../types";
import { DEFAULT_WATCHLIST_ID as ACCOUNT_DEFAULT_WATCHLIST_ID } from "../account/constants";
import { getNativeAccountState, importNativeLegacyState, isNativeRuntime, updateNativeAccountState } from "../account/native";
import { buildLegacyRepairPlan, emptyAccountSnapshot, hasPersonalData, normalizeAccountSnapshot, readLegacySnapshotDetails, DEFAULT_INDICATOR_SETTINGS } from "../account/snapshot";
import type { LegacySnapshotDetails } from "../account/snapshot";
import type { AccountSnapshot, IndicatorSettings } from "../account/types";

export const DEFAULT_WATCHLIST_ID = ACCOUNT_DEFAULT_WATCHLIST_ID;
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
const saveAccountCache = async (userId: string, snapshot: AccountSnapshot) => {
  const store = await Store.load("settings.json");
  await store.set(`account:${userId}:snapshot`, snapshot);
  await store.save();
};
const legacySnapshotKey = (userId: string) => `account:${userId}:legacy-snapshot`;
const legacyRepairKey = (userId: string) => `account:${userId}:legacy-repaired`;
const legacyRepairDispositionKey = (userId: string) => `account:${userId}:legacy-repair-disposition`;
const LEGACY_CLAIM_KEY = "slstening-legacy-import-claim";
const LEGACY_PENDING_KEY = "slstening-legacy-import-pending";
export type LegacyRepairDisposition = "repaired" | "keep-current";
interface LegacyImportClaim {
  userId: string;
  operationId?: string;
}
interface LegacyImportReservation extends LegacySnapshotDetails {
  userId: string;
  operationId: string;
}
const accountSnapshotFrom = (state: Pick<StocksState, "stocks" | "categories" | "activeCategoryId" | "pinnedCategoryIds" | "recentCategoryIds" | "indicatorSettings">): AccountSnapshot => ({
  stocks: state.stocks,
  categories: state.categories,
  activeCategoryId: state.activeCategoryId,
  pinnedCategoryIds: state.pinnedCategoryIds,
  recentCategoryIds: state.recentCategoryIds,
  indicatorSettings: state.indicatorSettings,
});
const operationId = (prefix: string) => `${prefix}-${typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`}`;
const randomIdentifier = (prefix: string) => `${prefix}-${typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`}`;

const readRetainedLegacy = async (store: Store, userId: string): Promise<LegacySnapshotDetails | null> => {
  const value = await store.get(legacySnapshotKey(userId)) as Partial<LegacySnapshotDetails> | undefined;
  if (!value?.snapshot || !Array.isArray(value.unresolvedStockIds)) return null;
  return { snapshot: normalizeAccountSnapshot(value.snapshot), unresolvedStockIds: [...new Set(value.unresolvedStockIds.filter((id): id is string => typeof id === "string"))] };
};
const readLegacyReservation = async (store: Store): Promise<LegacyImportReservation | null> => {
  const value = await store.get(LEGACY_PENDING_KEY) as Partial<LegacyImportReservation> | undefined;
  if (!value?.userId || !value.operationId || !value.snapshot || !Array.isArray(value.unresolvedStockIds)) return null;
  return {
    userId: value.userId,
    operationId: value.operationId,
    snapshot: normalizeAccountSnapshot(value.snapshot),
    unresolvedStockIds: [...new Set(value.unresolvedStockIds.filter((id): id is string => typeof id === "string"))],
  };
};
const readLegacyRepairDisposition = async (store: Store, userId: string): Promise<LegacyRepairDisposition | null> => {
  const value = await store.get(legacyRepairDispositionKey(userId));
  if (value === "repaired" || value === "keep-current") return value;
  // Versions before the typed disposition stored a boolean marker. Treat a
  // completed repair as the equivalent typed state during migration.
  return (await store.get(legacyRepairKey(userId))) === true ? "repaired" : null;
};
const safeSyncError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const redacted = message.replace(/(access[_-]?token|authorization|bearer|token)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]");
  return (redacted || "UNKNOWN_ERROR").slice(0, 240);
};
const commitAccountSnapshot = async (
  get: () => StocksState,
  set: (partial: Partial<StocksState>) => void,
  next: AccountSnapshot,
) => {
  const normalized = normalizeAccountSnapshot(next);
  const current = get();
  const native = isNativeRuntime();
  if (native) {
    if (!current.accountUserId || current.accountEpoch === null) throw new Error("ACCOUNT_REQUIRED");
    const userId = current.accountUserId;
    const epoch = current.accountEpoch;
    const isCurrent = () => {
      const latest = get();
      return latest.accountUserId === userId && latest.accountEpoch === epoch;
    };
    if (!isCurrent()) return;
    set({ syncStatus: "loading", syncError: null });
    try {
      const result = await updateNativeAccountState(epoch, current.cloudRevision, normalized, operationId("ui"));
      if (!isCurrent()) return;
      await saveAccountCache(userId, normalized);
      if (!isCurrent()) return;
      set({ ...normalized, hydrated: true, cloudRevision: result.revision, syncStatus: "synced", syncError: null });
    } catch (error) {
      if (!isCurrent()) return;
      const message = error instanceof Error ? error.message : String(error);
      set({ syncStatus: message.includes("REVISION_CONFLICT") ? "conflict" : "error", syncError: message });
      throw error;
    }
    return;
  }
  await saveTracking(normalized.stocks, normalized.categories);
  set({ ...normalized, hydrated: true, syncStatus: "local", syncError: null });
};
let mutationQueue: Promise<void> = Promise.resolve();
let mutationGeneration = 0;

/**
 * Invalidate work that was queued for a previous account projection.  We keep
 * the promise chain intact so a currently running request can finish its
 * cleanup, but every queued operation will fail its identity check before it
 * can read or write the newly selected account.
 */
const invalidateMutationQueue = () => {
  mutationGeneration += 1;
};

const enqueueMutation = <T>(get: () => StocksState, operation: () => Promise<T>): Promise<T> => {
  const captured = {
    generation: mutationGeneration,
    accountUserId: get().accountUserId,
    accountEpoch: get().accountEpoch,
  };
  const guardedOperation = async () => {
    const current = get();
    if (
      captured.generation !== mutationGeneration
      || captured.accountUserId !== current.accountUserId
      || captured.accountEpoch !== current.accountEpoch
    ) {
      throw new Error("SESSION_CHANGED");
    }
    return operation();
  };
  const result = mutationQueue.then(guardedOperation, guardedOperation);
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
  indicatorSettings: IndicatorSettings;
  accountUserId: string | null;
  accountEpoch: number | null;
  cloudRevision: number;
  syncStatus: "local" | "loading" | "repairing" | "synced" | "importable" | "conflict" | "error";
  syncError: string | null;
  legacyImportAvailable: boolean;
  legacyRepairAvailable: boolean;
  legacyRepairMissingCount: number;
  legacyUnresolvedStockIds: string[];
  legacyRepairDisposition: LegacyRepairDisposition | null;
  increase: (stock: StockStoreType) => Promise<void>;
  remove: (id: string) => Promise<void>;
  removeStocks: (ids: string[]) => Promise<void>;
  reload: () => Promise<void>;
  hydrateAccount: (userId: string, epoch: number) => Promise<void>;
  importLegacy: () => Promise<void>;
  repairLegacy: () => Promise<void>;
  keepLegacyCurrent: () => Promise<void>;
  clearAccountProjection: () => Promise<void>;
  setAccountSyncError: (message: string) => void;
  syncCurrent: () => Promise<void>;
  updateIndicatorSettings: (settings: IndicatorSettings) => Promise<void>;
  updateIndicatorSetting: (key: keyof IndicatorSettings, value: number) => Promise<void>;
  resetIndicatorSettings: () => Promise<void>;
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
  indicatorSettings: { ...DEFAULT_INDICATOR_SETTINGS }, accountUserId: null, accountEpoch: null, cloudRevision: 0,
  syncStatus: "local", syncError: null, legacyImportAvailable: false, legacyRepairAvailable: false, legacyRepairMissingCount: 0, legacyUnresolvedStockIds: [], legacyRepairDisposition: null,
  reload: () => enqueueMutation(get, async () => {
    if (isNativeRuntime()) {
      const { accountUserId, accountEpoch } = get();
      if (accountUserId && accountEpoch !== null) await get().hydrateAccount(accountUserId, accountEpoch);
      else {
        const store = await Store.load("settings.json");
        const menu = ((await store.get("menu")) as StockStoreType[]) || [];
        set({ menu });
      }
      return;
    }
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
    set({ stocks, menu, categories, activeCategoryId, pinnedCategoryIds, recentCategoryIds, hydrated: true, syncStatus: "local", syncError: null });
  }),
  hydrateAccount: async (userId, epoch) => {
    if (!isNativeRuntime()) return;
    const before = get();
    if (before.accountUserId && (before.accountUserId !== userId || before.accountEpoch !== epoch)) return;
    const isCurrent = () => {
      const latest = get();
      return latest.accountUserId === userId && latest.accountEpoch === epoch;
    };
    set({ accountUserId: userId, accountEpoch: epoch, hydrated: false, syncStatus: "loading", syncError: null, legacyImportAvailable: false, legacyRepairAvailable: false, legacyRepairMissingCount: 0, legacyUnresolvedStockIds: [], legacyRepairDisposition: null });
    try {
      // The shared menu is device data, while the account snapshot is cloud
      // data. Load it first so a native restart never renders an empty
      // AddStockDialog while the account request is in flight.
      const store = await Store.load("settings.json");
      const menu = ((await store.get("menu")) as StockStoreType[]) || [];
      if (!isCurrent()) return;
      set({ menu });
      const pendingReservation = await readLegacyReservation(store);
      if (!isCurrent()) return;
      const result = await getNativeAccountState(epoch);
      if (!result || result.userId !== userId || result.epoch !== epoch) throw new Error("SESSION_CHANGED");
      if (result.revision > 0 && !result.data) throw new Error("INVALID_CLOUD_STATE");
      if (result.data) {
        const snapshot = normalizeAccountSnapshot(result.data);
        let claim = (await store.get(LEGACY_CLAIM_KEY)) as LegacyImportClaim | undefined;
        if (pendingReservation?.userId === userId && (!claim || claim.userId === userId)) {
          if (!isCurrent()) return;
          await store.set(legacySnapshotKey(userId), pendingReservation);
          if (!isCurrent()) return;
          await store.set(`account:${userId}:legacy-imported`, true);
          if (!isCurrent()) return;
          await store.set(LEGACY_CLAIM_KEY, { userId, operationId: pendingReservation.operationId });
          if (!isCurrent()) return;
          await store.delete(LEGACY_PENDING_KEY);
          if (!isCurrent()) return;
          await store.save();
          if (!isCurrent()) return;
          claim = { userId, operationId: pendingReservation.operationId };
        }
        let legacyRepairAvailable = false;
        let legacyRepairMissingCount = 0;
        let legacyUnresolvedStockIds: string[] = [];
        let legacyRepairDisposition: LegacyRepairDisposition | null = null;
        if (claim?.userId === userId) {
          const retained = await readRetainedLegacy(store, userId) ?? pendingReservation ?? await readLegacySnapshotDetails();
          legacyUnresolvedStockIds = retained.unresolvedStockIds;
          legacyRepairDisposition = await readLegacyRepairDisposition(store, userId);
          if (!legacyRepairDisposition) {
            const plan = buildLegacyRepairPlan(snapshot, retained);
            legacyRepairAvailable = plan.missingCategoryIds.length > 0 || plan.missingMemberships.length > 0;
            legacyRepairMissingCount = plan.missingMemberships.reduce((total, item) => total + item.stockIds.length, 0)
              + plan.missingCategoryIds.reduce((total, categoryId) => total + (retained.snapshot.categories.find((category) => category.id === categoryId)?.stockIds.length ?? 0), 0);
          }
        }
        if (!isCurrent()) return;
        await saveAccountCache(userId, snapshot);
        if (!isCurrent()) return;
        set({ ...snapshot, accountUserId: userId, accountEpoch: epoch, cloudRevision: result.revision, hydrated: true, syncStatus: "synced", syncError: null, legacyImportAvailable: false, legacyRepairAvailable, legacyRepairMissingCount, legacyUnresolvedStockIds, legacyRepairDisposition });
        return;
      }
      const claim = (await store.get(LEGACY_CLAIM_KEY)) as LegacyImportClaim | undefined;
      const legacyOwner = claim?.userId ?? pendingReservation?.userId;
      const legacyDetails = legacyOwner && legacyOwner !== userId
        ? null
        : pendingReservation?.userId === userId
          ? pendingReservation
          : await readLegacySnapshotDetails();
      const legacy = legacyDetails?.snapshot ?? emptyAccountSnapshot();
      const importable = Boolean(legacyDetails) && (!claim || claim.userId === userId)
        ? hasPersonalData(legacy) || legacyDetails!.unresolvedStockIds.length > 0
        : false;
      if (!isCurrent()) return;
      set({ ...emptyAccountSnapshot(), accountUserId: userId, accountEpoch: epoch, cloudRevision: 0, hydrated: true, syncStatus: importable ? "importable" : "synced", syncError: null, legacyImportAvailable: importable, legacyRepairAvailable: false, legacyRepairMissingCount: 0, legacyUnresolvedStockIds: legacyDetails?.unresolvedStockIds ?? [], legacyRepairDisposition: null });
    } catch (error) {
      if (!isCurrent()) return;
      const message = error instanceof Error ? error.message : String(error);
      set({ hydrated: false, syncStatus: "error", syncError: message });
      throw error;
    }
  },
  importLegacy: async () => {
    const current = get();
    if (!current.accountUserId || current.accountEpoch === null || !current.legacyImportAvailable || !isNativeRuntime()) throw new Error("LEGACY_IMPORT_UNAVAILABLE");
    const userId = current.accountUserId;
    const epoch = current.accountEpoch;
    const isCurrent = () => {
      const latest = get();
      return latest.accountUserId === userId && latest.accountEpoch === epoch;
    };
    const store = await Store.load("settings.json");
    const claim = await store.get(LEGACY_CLAIM_KEY) as LegacyImportClaim | undefined;
    const pending = await readLegacyReservation(store);
    if (!isCurrent()) return;
    if (claim?.userId && claim.userId !== userId) throw new Error("LEGACY_IMPORT_RESERVED");
    if (pending && pending.userId !== userId) throw new Error("LEGACY_IMPORT_RESERVED");
    const legacyDetails = pending ?? await readLegacySnapshotDetails();
    if (!isCurrent()) return;
    const legacy = legacyDetails.snapshot;
    const key = `account:${userId}:legacy-import-operation-id`;
    const storedOperationId = (await store.get(key)) as string | undefined;
    const importOperationId = pending?.operationId || storedOperationId || operationId("legacy-import");
    if (!pending) {
      const reservation: LegacyImportReservation = {
        userId,
        operationId: importOperationId,
        snapshot: legacy,
        unresolvedStockIds: legacyDetails.unresolvedStockIds,
      };
      if (!isCurrent()) return;
      await store.set(key, importOperationId);
      if (!isCurrent()) return;
      await store.set(LEGACY_PENDING_KEY, reservation);
      if (!isCurrent()) return;
      await store.save();
      if (!isCurrent()) return;
    } else if (storedOperationId !== importOperationId) {
      if (!isCurrent()) return;
      await store.set(key, importOperationId);
      if (!isCurrent()) return;
      await store.save();
      if (!isCurrent()) return;
    }
    if (!isCurrent()) return;
    set({ syncStatus: "loading", syncError: null });
    try {
      if (!isCurrent()) return;
      const result = await importNativeLegacyState(epoch, legacy, importOperationId);
      if (!isCurrent()) return;
      await saveAccountCache(userId, legacy);
      if (!isCurrent()) return;
      await store.set(legacySnapshotKey(userId), legacyDetails);
      if (!isCurrent()) return;
      await store.set(`account:${userId}:legacy-imported`, true);
      if (!isCurrent()) return;
      await store.set(LEGACY_CLAIM_KEY, { userId, operationId: importOperationId });
      if (!isCurrent()) return;
      await store.delete(LEGACY_PENDING_KEY);
      if (!isCurrent()) return;
      await store.save();
      if (!isCurrent()) return;
      set({ ...legacy, accountUserId: userId, accountEpoch: epoch, cloudRevision: result.revision, hydrated: true, syncStatus: "synced", syncError: null, legacyImportAvailable: false, legacyRepairAvailable: false, legacyRepairMissingCount: 0, legacyUnresolvedStockIds: legacyDetails.unresolvedStockIds, legacyRepairDisposition: null });
    } catch (error) {
      if (!isCurrent()) return;
      const message = error instanceof Error ? error.message : String(error);
      set({ syncStatus: message.includes("REFUSED") ? "error" : "conflict", syncError: message });
      throw error;
    }
  },
  repairLegacy: async () => {
    const current = get();
    if (!current.accountUserId || current.accountEpoch === null || !current.legacyRepairAvailable || !isNativeRuntime()) throw new Error("LEGACY_REPAIR_UNAVAILABLE");
    const userId = current.accountUserId;
    const epoch = current.accountEpoch;
    const isCurrent = () => {
      const latest = get();
      return latest.accountUserId === userId && latest.accountEpoch === epoch;
    };
    if (!isCurrent()) return;
    set({ syncStatus: "repairing", syncError: null });
    try {
      if (!isCurrent()) return;
      const store = await Store.load("settings.json");
      if (!isCurrent()) return;
      const claim = await store.get(LEGACY_CLAIM_KEY) as LegacyImportClaim | undefined;
      if (!isCurrent()) return;
      if (claim?.userId !== userId) throw new Error("LEGACY_REPAIR_UNAVAILABLE");
      const retained = await readRetainedLegacy(store, userId) ?? await readLegacySnapshotDetails();
      if (!isCurrent()) return;
      const plan = buildLegacyRepairPlan(accountSnapshotFrom(current), retained);
      if (!isCurrent()) return;
      const result = await updateNativeAccountState(epoch, current.cloudRevision, plan.snapshot, operationId("legacy-repair"));
      if (!isCurrent()) return;
      await saveAccountCache(userId, plan.snapshot);
      if (!isCurrent()) return;
      await store.set(legacySnapshotKey(userId), retained);
      if (!isCurrent()) return;
      await store.set(legacyRepairDispositionKey(userId), "repaired");
      if (!isCurrent()) return;
      await store.set(legacyRepairKey(userId), true);
      if (!isCurrent()) return;
      await store.save();
      if (!isCurrent()) return;
      set({ ...plan.snapshot, accountUserId: userId, accountEpoch: epoch, cloudRevision: result.revision, hydrated: true, syncStatus: "synced", syncError: null, legacyRepairAvailable: false, legacyRepairMissingCount: 0, legacyUnresolvedStockIds: plan.unresolvedStockIds, legacyRepairDisposition: "repaired" });
    } catch (error) {
      if (!isCurrent()) return;
      const message = safeSyncError(error);
      set({ syncStatus: message.includes("REVISION_CONFLICT") ? "conflict" : "error", syncError: message, legacyRepairAvailable: true });
      throw error;
    }
  },
  keepLegacyCurrent: async () => {
    const current = get();
    if (!current.accountUserId || current.accountEpoch === null || !current.legacyRepairAvailable || !isNativeRuntime()) throw new Error("LEGACY_REPAIR_UNAVAILABLE");
    const userId = current.accountUserId;
    const epoch = current.accountEpoch;
    const isCurrent = () => {
      const latest = get();
      return latest.accountUserId === userId && latest.accountEpoch === epoch;
    };
    if (!isCurrent()) return;
    set({ syncStatus: "repairing", syncError: null });
    try {
      if (!isCurrent()) return;
      const store = await Store.load("settings.json");
      if (!isCurrent()) return;
      const claim = await store.get(LEGACY_CLAIM_KEY) as LegacyImportClaim | undefined;
      if (!isCurrent()) return;
      if (claim?.userId !== userId) throw new Error("LEGACY_REPAIR_UNAVAILABLE");
      await store.set(legacyRepairDispositionKey(userId), "keep-current");
      if (!isCurrent()) return;
      await store.save();
      if (!isCurrent()) return;
      set({ syncStatus: "synced", syncError: null, legacyRepairAvailable: false, legacyRepairDisposition: "keep-current" });
    } catch (error) {
      if (!isCurrent()) return;
      set({ syncStatus: "error", syncError: safeSyncError(error), legacyRepairAvailable: true });
      throw error;
    }
  },
  clearAccountProjection: async () => {
    invalidateMutationQueue();
    set({ ...emptyAccountSnapshot(), accountUserId: null, accountEpoch: null, cloudRevision: 0, hydrated: false, syncStatus: "local", syncError: null, legacyImportAvailable: false, legacyRepairAvailable: false, legacyRepairMissingCount: 0, legacyUnresolvedStockIds: [], legacyRepairDisposition: null });
  },
  setAccountSyncError: (message) => {
    // Keep the account projection fail-closed while retaining an actionable
    // error for AccountSyncNotice. The native UserContext retry will
    // establish a fresh session and hydrate it again.
    set({ hydrated: false, syncStatus: "error", syncError: message, legacyImportAvailable: false, legacyRepairAvailable: false, legacyRepairMissingCount: 0, legacyUnresolvedStockIds: [], legacyRepairDisposition: null });
  },
  syncCurrent: () => enqueueMutation(get, async () => {
    const current = get();
    if (!current.accountUserId || current.accountEpoch === null || !isNativeRuntime()) return;
    await commitAccountSnapshot(get, set, accountSnapshotFrom(current));
  }),
  updateIndicatorSettings: (indicatorSettings) => enqueueMutation(get, async () => {
    await commitAccountSnapshot(get, set, accountSnapshotFrom({ ...get(), indicatorSettings }));
  }),
  updateIndicatorSetting: (key, value) => enqueueMutation(get, async () => {
    const current = get();
    const indicatorSettings = { ...current.indicatorSettings, [key]: value };
    await commitAccountSnapshot(get, set, accountSnapshotFrom({ ...current, indicatorSettings }));
  }),
  resetIndicatorSettings: () => enqueueMutation(get, async () => {
    await commitAccountSnapshot(get, set, accountSnapshotFrom({ ...get(), indicatorSettings: { ...DEFAULT_INDICATOR_SETTINGS } }));
  }),
  increase: async (stock) => get().setStockCategories(stock, [DEFAULT_WATCHLIST_ID]),
  addStocks: (newStocks) => enqueueMutation(get, async () => {
    const current = get(); const knownIds = new Set(current.stocks.map((stock) => stock.id));
    const additions = newStocks.filter((stock) => !knownIds.has(stock.id));
    if (!additions.length) return;
    const stocks = [...additions, ...current.stocks];
    const sourceCategories = current.categories.length ? current.categories : [defaultCategory()];
    const categories = sourceCategories.map((category) => isDefaultCategory(category) ? { ...category, stockIds: uniqueIds([...additions.map((stock) => stock.id), ...category.stockIds]) } : category);
    await commitAccountSnapshot(get, set, accountSnapshotFrom({ ...get(), stocks, categories }));
  }),
  remove: async (id) => get().removeStocks([id]),
  removeStocks: (ids) => enqueueMutation(get, async () => {
    const removedIds = uniqueIds(ids); const stocks = get().stocks.filter((stock) => !removedIds.includes(stock.id));
    const categories = withoutStocks(get().categories, removedIds);
    await commitAccountSnapshot(get, set, accountSnapshotFrom({ ...get(), stocks, categories }));
  }),
  clear: () => enqueueMutation(get, async () => {
    const categories = get().categories.map((category) => ({ ...category, stockIds: [] }));
    await commitAccountSnapshot(get, set, accountSnapshotFrom({ ...get(), stocks: [], categories }));
  }),
  update_menu: (menu) => enqueueMutation(get, async () => { const store = await Store.load("settings.json"); await store.set("menu", menu); await store.save(); set({ menu }); }),
  factory_reset: () => enqueueMutation(get, async () => {
    if (isNativeRuntime()) {
      if (!get().accountUserId || get().accountEpoch === null) throw new Error("ACCOUNT_REQUIRED");
      await commitAccountSnapshot(get, set, emptyAccountSnapshot());
      return;
    }
    const store = await Store.load("settings.json");
    await store.clear();
    set({ ...emptyAccountSnapshot(), hydrated: true, syncStatus: "local" });
  }),
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
  addCategory: (name) => enqueueMutation(get, async () => {
    const trimmedName = name.trim(); if (!trimmedName) throw new Error("CATEGORY_NAME_REQUIRED");
    if (hasCategoryName(get().categories, trimmedName)) throw new Error("CATEGORY_NAME_DUPLICATE");
    const categories = [...get().categories, { id: randomIdentifier("category"), name: trimmedName, stockIds: [] }];
    await commitAccountSnapshot(get, set, accountSnapshotFrom({ ...get(), categories }));
  }),
  removeCategory: (id) => enqueueMutation(get, async () => {
    if (id === DEFAULT_WATCHLIST_ID) return;
    const categories = get().categories.filter((category) => category.id !== id); const stocks = pruneUntrackedStocks(get().stocks, categories);
    const activeCategoryId = get().activeCategoryId === id ? DEFAULT_WATCHLIST_ID : get().activeCategoryId;
    const pinnedCategoryIds = get().pinnedCategoryIds.filter((item) => item !== id); const recentCategoryIds = get().recentCategoryIds.filter((item) => item !== id);
    await commitAccountSnapshot(get, set, accountSnapshotFrom({ ...get(), stocks, categories, activeCategoryId, pinnedCategoryIds, recentCategoryIds }));
  }),
  renameCategory: (id, name) => enqueueMutation(get, async () => {
    if (id === DEFAULT_WATCHLIST_ID) return;
    const trimmedName = name.trim(); if (!trimmedName) throw new Error("CATEGORY_NAME_REQUIRED");
    if (hasCategoryName(get().categories, trimmedName, id)) throw new Error("CATEGORY_NAME_DUPLICATE");
    const categories = get().categories.map((category) => category.id === id ? { ...category, name: trimmedName } : category);
    await commitAccountSnapshot(get, set, accountSnapshotFrom({ ...get(), categories }));
  }),
  addStockToCategory: (categoryId, stockId) => enqueueMutation(get, async () => {
    const current = get();
    const stock = current.menu.find((item) => item.id === stockId) ?? current.stocks.find((item) => item.id === stockId);
    if (!stock || !current.categories.some((category) => category.id === categoryId)) return;
    const categories = current.categories.map((category) => category.id === categoryId && !category.stockIds.includes(stockId) ? { ...category, stockIds: [stockId, ...category.stockIds] } : category);
    const stocks = current.stocks.some((item) => item.id === stockId) ? current.stocks : [stock, ...current.stocks];
    await commitAccountSnapshot(get, set, accountSnapshotFrom({ ...get(), stocks, categories }));
  }),
  removeStockFromCategory: (categoryId, stockId) => enqueueMutation(get, async () => {
    const categories = get().categories.map((category) => category.id === categoryId ? { ...category, stockIds: category.stockIds.filter((id) => id !== stockId) } : category);
    const stocks = pruneUntrackedStocks(get().stocks, categories); await commitAccountSnapshot(get, set, accountSnapshotFrom({ ...get(), stocks, categories }));
  }),
  setStockCategories: (stock, categoryIds) => enqueueMutation(get, async () => {
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
    await commitAccountSnapshot(get, set, accountSnapshotFrom({ ...get(), stocks, categories }));
  }),
  updateStockOrder: (categoryId, stockIds) => enqueueMutation(get, async () => {
    const category = get().categories.find((item) => item.id === categoryId);
    const orderedIds = uniqueIds(stockIds);
    if (!category || orderedIds.length !== category.stockIds.length || orderedIds.some((id) => !category.stockIds.includes(id))) return;
    const categories = get().categories.map((item) => item.id === categoryId ? { ...item, stockIds: orderedIds } : item);
    await commitAccountSnapshot(get, set, accountSnapshotFrom({ ...get(), categories }));
  }),
  updateCategories: (categories) => enqueueMutation(get, async () => { const normalized = keepDefaultFirst(categories); await commitAccountSnapshot(get, set, accountSnapshotFrom({ ...get(), categories: normalized })); }),
  setActiveCategory: (id) => enqueueMutation(get, async () => {
    const activeCategoryId = get().categories.some((category) => category.id === id) ? id : DEFAULT_WATCHLIST_ID;
    const recentCategoryIds = activeCategoryId === DEFAULT_WATCHLIST_ID || get().pinnedCategoryIds.includes(activeCategoryId)
      ? get().recentCategoryIds
      : uniqueIds([activeCategoryId, ...get().recentCategoryIds]).filter((recentId) => !get().pinnedCategoryIds.includes(recentId)).slice(0, 3);
    await commitAccountSnapshot(get, set, accountSnapshotFrom({ ...get(), activeCategoryId, recentCategoryIds }));
  }),
  togglePinnedCategory: (id) => enqueueMutation(get, async () => {
    if (id === DEFAULT_WATCHLIST_ID || !get().categories.some((category) => category.id === id)) return;
    const isPinned = get().pinnedCategoryIds.includes(id);
    if (!isPinned && get().pinnedCategoryIds.length >= 5) throw new Error("PIN_LIMIT_REACHED");
    const pinnedCategoryIds = isPinned ? get().pinnedCategoryIds.filter((item) => item !== id) : [...get().pinnedCategoryIds, id];
    const recentCategoryIds = get().recentCategoryIds.filter((item) => item !== id);
    await commitAccountSnapshot(get, set, accountSnapshotFrom({ ...get(), pinnedCategoryIds, recentCategoryIds }));
  }),
  reorderPinnedCategories: (ids) => enqueueMutation(get, async () => {
    const pinnedCategoryIds = uniqueIds(ids).filter((id) => get().pinnedCategoryIds.includes(id));
    if (pinnedCategoryIds.length !== get().pinnedCategoryIds.length) return;
    await commitAccountSnapshot(get, set, accountSnapshotFrom({ ...get(), pinnedCategoryIds }));
  }),
}));

export default useStocksStore;
