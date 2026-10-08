import { Store } from "@tauri-apps/plugin-store";
import { create } from "zustand";
import { CategoryType, StockStoreType } from "../types";
import {
  deleteLegacySettings,
  getLegacySettingsStatus,
  getNativeAccountState,
  getNativeIndicatorSettings,
  isNativeRuntime,
  keepLegacySettings,
  resetNativeIndicatorSettings,
  updateNativeAccountState,
  updateNativeIndicatorSettings,
} from "../account/native";
import {
  DEFAULT_INDICATOR_SETTINGS,
  EMPTY_CATEGORY_ID,
  emptyAccountSnapshot,
  normalizeAccountSnapshot,
} from "../account/snapshot";
import type { AccountSnapshot, IndicatorSettings } from "../account/types";

const ACCOUNT_STATE_FILE = "account-state.json";
const CATALOG_FILE = "catalog.json";

const uniqueIds = (ids: string[]) => [...new Set(ids)];
const sameJson = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const randomIdentifier = (prefix: string) => `${prefix}-${typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
const safeSyncError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return (message.replace(/(access[_-]?token|authorization|bearer|token)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]") || "UNKNOWN_ERROR").slice(0, 240);
};

const accountSnapshotFrom = (state: Pick<StocksState, "stocks" | "categories" | "activeCategoryId" | "pinnedCategoryIds" | "recentCategoryIds" | "indicatorSettings">): AccountSnapshot => ({
  stocks: state.stocks,
  categories: state.categories,
  activeCategoryId: state.activeCategoryId,
  pinnedCategoryIds: state.pinnedCategoryIds,
  recentCategoryIds: state.recentCategoryIds,
  indicatorSettings: state.indicatorSettings,
});

const localNavigation = (snapshot: AccountSnapshot, state: Pick<StocksState, "activeCategoryId" | "pinnedCategoryIds" | "recentCategoryIds" | "indicatorSettings">) => normalizeAccountSnapshot({
  ...snapshot,
  activeCategoryId: state.activeCategoryId,
  pinnedCategoryIds: state.pinnedCategoryIds,
  recentCategoryIds: state.recentCategoryIds,
  indicatorSettings: state.indicatorSettings,
});

const accountKey = (userId: string) => `account:${userId}:snapshot`;

const readCatalog = async () => {
  const store = await Store.load(CATALOG_FILE);
  const value = await store.get("menu");
  return Array.isArray(value) ? value as StockStoreType[] : [];
};

const writeCatalog = async (menu: StockStoreType[]) => {
  const store = await Store.load(CATALOG_FILE);
  await store.set("menu", menu);
  await store.save();
};

const readAccountCache = async (userId: string) => {
  const store = await Store.load(ACCOUNT_STATE_FILE);
  const value = await store.get(accountKey(userId));
  return value && typeof value === "object" ? normalizeAccountSnapshot(value as AccountSnapshot) : null;
};

const writeAccountCache = async (userId: string, snapshot: AccountSnapshot) => {
  const store = await Store.load(ACCOUNT_STATE_FILE);
  const { indicatorSettings: _indicatorSettings, ...accountState } = snapshot;
  await store.set(accountKey(userId), accountState);
  await store.save();
};

// All account-cache writes share one FIFO. This matters when a hydration read
// and a cloud mutation overlap: an old write may already be running, but the
// newer mutation's write must be ordered after it and remain the final value.
let accountCacheWriteQueue: Promise<void> = Promise.resolve();
const enqueueAccountCacheWrite = (
  userId: string,
  snapshot: AccountSnapshot,
  shouldWrite: () => boolean = () => true,
) => {
  const write = async () => {
    if (!shouldWrite()) return;
    await writeAccountCache(userId, snapshot);
  };
  const result = accountCacheWriteQueue.then(write, write);
  accountCacheWriteQueue = result.then(() => undefined, () => undefined);
  return result;
};

const writeLocalProjection = async (state: StocksState) => {
  if (isNativeRuntime()) {
    if (!state.accountUserId || state.accountEpoch === null) return;
    await enqueueAccountCacheWrite(state.accountUserId, accountSnapshotFrom(state));
    return;
  }
  const store = await Store.load(ACCOUNT_STATE_FILE);
  await store.set("local:snapshot", accountSnapshotFrom(state));
  await store.save();
};

const readIndicatorSettings = async (epoch: number): Promise<IndicatorSettings | null> => {
  try { return await getNativeIndicatorSettings(epoch); } catch { return null; }
};

const initializeIndicatorSettings = async (epoch: number, base: IndicatorSettings) => {
  try { return await updateNativeIndicatorSettings(epoch, {}, base); } catch { return null; }
};

const reconcileIndicatorSettings = (
  get: () => StocksState,
  set: (partial: Partial<StocksState>) => void,
  userId: string,
  epoch: number,
  fallback: IndicatorSettings,
) => {
  void (async () => {
    const stored = await readIndicatorSettings(epoch);
    const resolved = stored ?? await initializeIndicatorSettings(epoch, fallback);
    const latest = get();
    if (!resolved || latest.accountUserId !== userId || latest.accountEpoch !== epoch || !sameJson(latest.indicatorSettings, fallback)) return;
    set({ indicatorSettings: { ...resolved } });
  })();
};

let mutationQueue: Promise<void> = Promise.resolve();
let mutationGeneration = 0;
// Hydration is an asynchronous read. A same-account mutation must invalidate
// any in-flight read just as an account switch does; otherwise an older pull
// can publish its snapshot after the mutation has already committed.
let hydrationGeneration = 0;
// Incremented only after a native cloud write succeeds. Hydration captures
// this account/epoch marker so a pull that began during an in-flight sync
// cannot publish or persist the pre-sync response once the sync reaches its
// commit boundary, without invalidating a refresh for another account.
const committedCloudGenerations = new Map<string, number>();
const cloudGenerationKey = (userId: string, epoch: number) => `${userId}\u0000${epoch}`;
const committedCloudGeneration = (userId: string, epoch: number) => committedCloudGenerations.get(cloudGenerationKey(userId, epoch)) ?? 0;
const markCloudCommit = (userId: string, epoch: number) => {
  const key = cloudGenerationKey(userId, epoch);
  const next = (committedCloudGenerations.get(key) ?? 0) + 1;
  committedCloudGenerations.set(key, next);
  return next;
};
const invalidateMutationQueue = () => { mutationGeneration += 1; };
const invalidateHydration = () => { hydrationGeneration += 1; };

const enqueueMutation = <T>(
  get: () => StocksState,
  operation: () => Promise<T>,
  options: { invalidateHydration?: boolean } = {},
): Promise<T> => {
  const shouldInvalidateHydration = options.invalidateHydration !== false;
  const captured = { generation: mutationGeneration, userId: get().accountUserId, epoch: get().accountEpoch };
  const guarded = async () => {
    // Invalidate at execution time, not enqueue time. A startup mutation can
    // be queued behind the initial pull; invalidating immediately would cancel
    // that pull and let the mutation overwrite unseen PhoneApp groups.
    if (shouldInvalidateHydration) invalidateHydration();
    const current = get();
    if (captured.generation !== mutationGeneration || current.accountUserId !== captured.userId || current.accountEpoch !== captured.epoch) throw new Error("SESSION_CHANGED");
    return operation();
  };
  const result = mutationQueue.then(guarded, guarded);
  mutationQueue = result.then(() => undefined, () => undefined);
  return result;
};

const persistLocal = (get: () => StocksState, set: (partial: Partial<StocksState>) => void) => {
  const userId = get().accountUserId;
  const epoch = get().accountEpoch;
  void enqueueMutation(get, async () => {
    const latest = get();
    if (latest.accountUserId !== userId || latest.accountEpoch !== epoch) return;
    await writeLocalProjection(latest);
  }, { invalidateHydration: false }).catch((error) => {
    const latest = get();
    if (latest.accountUserId === userId && latest.accountEpoch === epoch) set({ syncStatus: "error", syncError: safeSyncError(error) });
  });
  return Promise.resolve();
};

const persistIndicator = (
  get: () => StocksState,
  set: (partial: Partial<StocksState>) => void,
  userId: string | null,
  epoch: number | null,
  patch: Partial<IndicatorSettings> | null,
  base: IndicatorSettings,
  reset: boolean,
) => {
  if (!userId || epoch === null) return Promise.resolve();
  const operation = reset ? resetNativeIndicatorSettings(epoch) : updateNativeIndicatorSettings(epoch, patch ?? {}, base);
  void operation.catch((error) => {
    const latest = get();
    if (latest.accountUserId === userId && latest.accountEpoch === epoch) set({ syncStatus: "error", syncError: safeSyncError(error) });
  });
  return Promise.resolve();
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
  syncStatus: "local" | "loading" | "synced" | "error";
  syncError: string | null;
  legacySettingsPrompt: boolean;
  legacySettingsError: string | null;
  reload: () => Promise<void>;
  initializeAccount: (userId: string, epoch: number) => Promise<void>;
  primeAccountFromCache: (userId: string, epoch: number) => Promise<void>;
  hydrateAccount: (userId: string, epoch: number) => Promise<void>;
  checkLegacySettings: () => Promise<void>;
  keepLegacySettings: () => Promise<void>;
  deleteLegacySettings: () => Promise<void>;
  clearAccountProjection: () => Promise<void>;
  setAccountSyncError: (message: string) => void;
  syncCurrent: () => Promise<void>;
  updateIndicatorSettings: (settings: IndicatorSettings) => Promise<void>;
  applyIndicatorSettings: (settings: IndicatorSettings) => void;
  updateIndicatorSetting: (key: keyof IndicatorSettings, value: number) => Promise<void>;
  resetIndicatorSettings: () => Promise<void>;
  clear: () => Promise<void>;
  update_menu: (stocks: StockStoreType[]) => Promise<void>;
  factory_reset: () => Promise<void>;
  fetchSupabaseWatchStock: () => Promise<StockStoreType[]>;
  addStocks: (stocks: StockStoreType[]) => Promise<void>;
  remove: (id: string) => Promise<void>;
  removeStocks: (ids: string[]) => Promise<void>;
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
  increase: (stock: StockStoreType) => Promise<void>;
}

const commitSnapshot = async (
  get: () => StocksState,
  set: (partial: Partial<StocksState>) => void,
  next: AccountSnapshot,
) => {
  const normalized = normalizeAccountSnapshot(next);
  const current = get();
  const userId = current.accountUserId;
  const epoch = current.accountEpoch;
  const isCurrent = () => {
    const latest = get();
    return latest.accountUserId === userId && latest.accountEpoch === epoch;
  };
  if (isNativeRuntime()) {
    if (!userId || epoch === null) throw new Error("ACCOUNT_REQUIRED");
    set({ syncStatus: "loading", syncError: null });
    let cloudAttemptMarked = false;
    try {
      await updateNativeAccountState(epoch, normalized);
      markCloudCommit(userId, epoch);
      cloudAttemptMarked = true;
      if (!isCurrent()) return;
      await enqueueAccountCacheWrite(userId, normalized, isCurrent);
      if (!isCurrent()) return;
      const latest = get();
      const projected = localNavigation(normalized, latest);
      set({ ...projected, accountUserId: userId, accountEpoch: epoch, hydrated: true, syncStatus: "synced", syncError: null });
    } catch (error) {
      // A pull may have started while this sync was in flight. Even when the
      // sync fails, it must not publish `synced` over this mutation error or
      // replace the cache with an older snapshot.
      if (!cloudAttemptMarked) markCloudCommit(userId, epoch);
      if (isCurrent()) set({ syncStatus: "error", syncError: safeSyncError(error) });
      throw error;
    }
    return;
  }
  await writeLocalProjection({ ...get(), ...normalized });
  if (isCurrent()) set({ ...normalized, hydrated: true, syncStatus: "local", syncError: null });
};

const useStocksStore = create<StocksState>((set, get) => ({
  stocks: [], menu: [], categories: [], activeCategoryId: EMPTY_CATEGORY_ID, hydrated: false,
  pinnedCategoryIds: [], recentCategoryIds: [], indicatorSettings: { ...DEFAULT_INDICATOR_SETTINGS },
  accountUserId: null, accountEpoch: null, syncStatus: "local", syncError: null,
  legacySettingsPrompt: false, legacySettingsError: null,

  reload: async () => {
    if (isNativeRuntime()) {
      const current = get();
      if (current.accountUserId && current.accountEpoch !== null) {
        // Keep the cached projection interactive while loading, but serialize
        // the pull with durable mutations so a write cannot replace unseen
        // PhoneApp groups before the latest cloud baseline is known.
        return enqueueMutation(get, async () => {
          const latest = get();
          if (!latest.accountUserId || latest.accountEpoch === null) return;
          await get().hydrateAccount(latest.accountUserId, latest.accountEpoch);
        });
      }
    }
    const menu = await readCatalog();
    const store = await Store.load(ACCOUNT_STATE_FILE);
    const value = await store.get("local:snapshot");
    const snapshot = value && typeof value === "object" ? normalizeAccountSnapshot(value as AccountSnapshot) : emptyAccountSnapshot();
    set({ ...snapshot, menu, hydrated: true, syncStatus: "local", syncError: null });
  },

  initializeAccount: (userId, epoch) => enqueueMutation(get, async () => {
    // Cache priming intentionally exposes a usable projection before the
    // network round-trip completes. Keeping both phases inside the mutation
    // queue makes that projection read-only with respect to durable changes
    // until the first PhoneApp pull has established the current baseline.
    await get().primeAccountFromCache(userId, epoch);
    const current = get();
    if (current.accountUserId !== userId || current.accountEpoch !== epoch) return;
    try {
      await get().hydrateAccount(userId, epoch);
    } catch {
      // The account remains usable from cache after a pull failure. The
      // hydrate path already records the actionable sync error in the store.
    }
  }, { invalidateHydration: false }),

  primeAccountFromCache: async (userId, epoch) => {
    const hydrationToken = ++hydrationGeneration;
    const cloudGeneration = committedCloudGeneration(userId, epoch);
    const isCurrentHydration = () => hydrationToken === hydrationGeneration && cloudGeneration === committedCloudGeneration(userId, epoch);
    if (!isNativeRuntime()) return;
    const before = get();
    if (before.accountUserId && before.accountUserId !== userId) return;
    const keepProjection = before.accountUserId === userId && before.hydrated;
    set({ accountUserId: userId, accountEpoch: epoch, hydrated: keepProjection, syncStatus: "loading", syncError: null });
    try {
      const menu = await readCatalog();
      const cached = await readAccountCache(userId);
      const current = get();
      if (!isCurrentHydration() || current.accountUserId !== userId || current.accountEpoch !== epoch) return;
      const snapshot = cached ?? (keepProjection ? accountSnapshotFrom(before) : emptyAccountSnapshot());
      set({ ...localNavigation(snapshot, current), menu, accountUserId: userId, accountEpoch: epoch, hydrated: true, syncStatus: "loading", syncError: null });
      reconcileIndicatorSettings(get, set, userId, epoch, snapshot.indicatorSettings);
      await get().checkLegacySettings();
    } catch (error) {
      const current = get();
      if (!isCurrentHydration() || current.accountUserId !== userId || current.accountEpoch !== epoch) return;
      set({ ...emptyAccountSnapshot(), accountUserId: userId, accountEpoch: epoch, hydrated: true, syncStatus: "error", syncError: safeSyncError(error) });
    }
  },

  hydrateAccount: async (userId, epoch) => {
    const hydrationToken = ++hydrationGeneration;
    const cloudGeneration = committedCloudGeneration(userId, epoch);
    const isCurrentHydration = () => hydrationToken === hydrationGeneration && cloudGeneration === committedCloudGeneration(userId, epoch);
    if (!isNativeRuntime()) return;
    const before = get();
    if (before.accountUserId && (before.accountUserId !== userId || before.accountEpoch !== epoch)) return;
    const keepProjection = before.accountUserId === userId && before.accountEpoch === epoch && before.hydrated;
    set({ accountUserId: userId, accountEpoch: epoch, hydrated: keepProjection, syncStatus: "loading", syncError: null });
    try {
      const menu = await readCatalog();
      if (!isCurrentHydration() || get().accountUserId !== userId || get().accountEpoch !== epoch) return;
      set({ menu });
      const result = await getNativeAccountState(epoch);
      if (!result || result.userId !== userId || result.epoch !== epoch) throw new Error("SESSION_CHANGED");
      const cloud = result.data ? normalizeAccountSnapshot(result.data) : emptyAccountSnapshot();
      const current = get();
      const snapshot = localNavigation(cloud, current);
      if (!isCurrentHydration() || current.accountUserId !== userId || current.accountEpoch !== epoch) return;
      await enqueueAccountCacheWrite(userId, snapshot, isCurrentHydration);
      if (!isCurrentHydration() || get().accountUserId !== userId || get().accountEpoch !== epoch) return;
      set({ ...snapshot, menu, accountUserId: userId, accountEpoch: epoch, hydrated: true, syncStatus: "synced", syncError: null });
      reconcileIndicatorSettings(get, set, userId, epoch, snapshot.indicatorSettings);
      await get().checkLegacySettings();
    } catch (error) {
      const current = get();
      if (!isCurrentHydration() || current.accountUserId !== userId || current.accountEpoch !== epoch) return;
      set({ hydrated: keepProjection, syncStatus: "error", syncError: safeSyncError(error) });
      throw error;
    }
  },

  checkLegacySettings: async () => {
    if (!isNativeRuntime()) return;
    try {
      const status = await getLegacySettingsStatus();
      set({ legacySettingsPrompt: Boolean(status?.present), legacySettingsError: null });
    } catch (error) {
      set({ legacySettingsError: safeSyncError(error) });
    }
  },
  keepLegacySettings: async () => {
    try {
      const status = await keepLegacySettings();
      set({ legacySettingsPrompt: false, legacySettingsError: null });
      if (status?.present) set({ legacySettingsPrompt: false });
    } catch (error) {
      set({ legacySettingsError: safeSyncError(error) });
      throw error;
    }
  },
  deleteLegacySettings: async () => {
    try {
      await deleteLegacySettings();
      set({ legacySettingsPrompt: false, legacySettingsError: null });
    } catch (error) {
      set({ legacySettingsError: safeSyncError(error) });
      throw error;
    }
  },

  clearAccountProjection: async () => {
    invalidateMutationQueue();
    invalidateHydration();
    set({ ...emptyAccountSnapshot(), accountUserId: null, accountEpoch: null, hydrated: false, syncStatus: "local", syncError: null });
  },
  setAccountSyncError: (message) => set({ hydrated: false, syncStatus: "error", syncError: message }),
  syncCurrent: () => enqueueMutation(get, async () => {
    const current = get();
    if (!isNativeRuntime() || !current.accountUserId || current.accountEpoch === null) return;
    await commitSnapshot(get, set, accountSnapshotFrom(current));
  }),

  updateIndicatorSettings: (settings) => {
    const current = get();
    const patch = Object.fromEntries((Object.keys(settings) as Array<keyof IndicatorSettings>).filter((key) => settings[key] !== current.indicatorSettings[key]).map((key) => [key, settings[key]])) as Partial<IndicatorSettings>;
    set({ indicatorSettings: { ...settings } });
    return isNativeRuntime()
      ? persistIndicator(get, set, current.accountUserId, current.accountEpoch, patch, current.indicatorSettings, false)
      : persistLocal(get, set);
  },
  applyIndicatorSettings: (settings) => set({ indicatorSettings: { ...settings } }),
  updateIndicatorSetting: (key, value) => {
    const current = get();
    set({ indicatorSettings: { ...current.indicatorSettings, [key]: value } });
    return isNativeRuntime()
      ? persistIndicator(get, set, current.accountUserId, current.accountEpoch, { [key]: value }, current.indicatorSettings, false)
      : persistLocal(get, set);
  },
  resetIndicatorSettings: () => {
    const current = get();
    set({ indicatorSettings: { ...DEFAULT_INDICATOR_SETTINGS } });
    return isNativeRuntime()
      ? persistIndicator(get, set, current.accountUserId, current.accountEpoch, null, current.indicatorSettings, true)
      : persistLocal(get, set);
  },

  increase: (stock) => {
    const category = get().categories.find((item) => item.id === get().activeCategoryId) ?? get().categories[0];
    if (!category) return Promise.reject(new Error("CATEGORY_REQUIRED"));
    return get().addStockToCategory(category.id, stock.id);
  },
  addStocks: (newStocks) => enqueueMutation(get, async () => {
    const current = get();
    const category = current.categories.find((item) => item.id === current.activeCategoryId) ?? current.categories[0];
    if (!category) throw new Error("CATEGORY_REQUIRED");
    const additions = newStocks.filter((stock) => !current.stocks.some((existing) => existing.id === stock.id));
    if (!additions.length) return;
    const categories = current.categories.map((item) => item.id === category.id ? { ...item, stockIds: uniqueIds([...additions.map((stock) => stock.id), ...item.stockIds]) } : item);
    await commitSnapshot(get, set, accountSnapshotFrom({ ...current, stocks: [...additions, ...current.stocks], categories }));
  }),
  remove: (id) => get().removeStocks([id]),
  removeStocks: (ids) => enqueueMutation(get, async () => {
    const removed = new Set(ids);
    const current = get();
    const categories = current.categories.map((category) => ({ ...category, stockIds: category.stockIds.filter((id) => !removed.has(id)) }));
    const stocks = current.stocks.filter((stock) => !removed.has(stock.id));
    await commitSnapshot(get, set, accountSnapshotFrom({ ...current, stocks, categories }));
  }),
  clear: () => enqueueMutation(get, async () => {
    const current = get();
    await commitSnapshot(get, set, accountSnapshotFrom({ ...current, stocks: [], categories: current.categories.map((category) => ({ ...category, stockIds: [] })) }));
  }),
  update_menu: async (menu) => { await writeCatalog(menu); set({ menu }); },
  factory_reset: () => enqueueMutation(get, async () => {
    const current = get();
    if (isNativeRuntime()) await commitSnapshot(get, set, emptyAccountSnapshot());
    else { const store = await Store.load(ACCOUNT_STATE_FILE); await store.clear(); set({ ...emptyAccountSnapshot(), menu: current.menu, hydrated: true, syncStatus: "local" }); }
  }),

  fetchSupabaseWatchStock: async () => {
    const { supabase } = await import("../supabase");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data: watchStocks, error } = await supabase.from("watch_stock").select("stock_id").eq("user_id", user.id);
    if (error) return [];
    const { stocks, menu } = get();
    return (watchStocks || []).map((item: { stock_id: string }) => {
      const menuStock = menu.find((stock) => stock.id === item.stock_id);
      return { id: item.stock_id, name: menuStock?.name || "Unknown", group: menuStock?.group || "", type: menuStock?.type || "stock" };
    }).filter((stock) => !stocks.some((existing) => existing.id === stock.id));
  },
  removeSupabaseWatchStock: async (id) => {
    const { supabase } = await import("../supabase");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("watch_stock").delete().eq("user_id", user.id).eq("stock_id", id);
    if (error) throw error;
  },

  addCategory: (name) => enqueueMutation(get, async () => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("CATEGORY_NAME_REQUIRED");
    if (get().categories.some((category) => category.name.trim().toLocaleLowerCase() === trimmed.toLocaleLowerCase())) throw new Error("CATEGORY_NAME_DUPLICATE");
    const current = get();
    const category = { id: randomIdentifier("group"), name: trimmed, stockIds: [] };
    await commitSnapshot(get, set, accountSnapshotFrom({ ...current, categories: [...current.categories, category], activeCategoryId: current.activeCategoryId || category.id }));
  }),
  removeCategory: (id) => enqueueMutation(get, async () => {
    const current = get();
    if (!current.categories.some((category) => category.id === id)) return;
    const categories = current.categories.filter((category) => category.id !== id);
    const memberships = new Set(categories.flatMap((category) => category.stockIds));
    const stocks = current.stocks.filter((stock) => memberships.has(stock.id));
    const activeCategoryId = current.activeCategoryId === id ? categories[0]?.id ?? EMPTY_CATEGORY_ID : current.activeCategoryId;
    await commitSnapshot(get, set, accountSnapshotFrom({ ...current, stocks, categories, activeCategoryId, pinnedCategoryIds: current.pinnedCategoryIds.filter((value) => value !== id), recentCategoryIds: current.recentCategoryIds.filter((value) => value !== id) }));
  }),
  renameCategory: (id, name) => enqueueMutation(get, async () => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("CATEGORY_NAME_REQUIRED");
    if (get().categories.some((category) => category.id !== id && category.name.trim().toLocaleLowerCase() === trimmed.toLocaleLowerCase())) throw new Error("CATEGORY_NAME_DUPLICATE");
    const current = get();
    if (!current.categories.some((category) => category.id === id)) throw new Error("CATEGORY_NOT_FOUND");
    await commitSnapshot(get, set, accountSnapshotFrom({ ...current, categories: current.categories.map((category) => category.id === id ? { ...category, name: trimmed } : category) }));
  }),
  addStockToCategory: (categoryId, stockId) => enqueueMutation(get, async () => {
    const current = get();
    if (!current.categories.some((category) => category.id === categoryId)) throw new Error("CATEGORY_REQUIRED");
    const stock = current.menu.find((item) => item.id === stockId) ?? current.stocks.find((item) => item.id === stockId);
    if (!stock) throw new Error("STOCK_NOT_FOUND");
    const categories = current.categories.map((category) => category.id === categoryId && !category.stockIds.includes(stockId) ? { ...category, stockIds: [stockId, ...category.stockIds] } : category);
    const stocks = current.stocks.some((item) => item.id === stockId) ? current.stocks : [stock, ...current.stocks];
    await commitSnapshot(get, set, accountSnapshotFrom({ ...current, stocks, categories }));
  }),
  removeStockFromCategory: (categoryId, stockId) => enqueueMutation(get, async () => {
    const current = get();
    const categories = current.categories.map((category) => category.id === categoryId ? { ...category, stockIds: category.stockIds.filter((id) => id !== stockId) } : category);
    const memberships = new Set(categories.flatMap((category) => category.stockIds));
    const stocks = current.stocks.filter((stock) => memberships.has(stock.id));
    await commitSnapshot(get, set, accountSnapshotFrom({ ...current, stocks, categories }));
  }),
  setStockCategories: (stock, categoryIds) => enqueueMutation(get, async () => {
    const selected = uniqueIds(categoryIds);
    const current = get();
    if (!selected.length) throw new Error("CATEGORY_SELECTION_REQUIRED");
    if (!selected.every((id) => current.categories.some((category) => category.id === id))) throw new Error("CATEGORY_SELECTION_INVALID");
    const categories = current.categories.map((category) => selected.includes(category.id)
      ? { ...category, stockIds: category.stockIds.includes(stock.id) ? category.stockIds : [stock.id, ...category.stockIds] }
      : { ...category, stockIds: category.stockIds.filter((id) => id !== stock.id) });
    const stocks = current.stocks.some((item) => item.id === stock.id) ? current.stocks : [stock, ...current.stocks];
    await commitSnapshot(get, set, accountSnapshotFrom({ ...current, stocks, categories }));
  }),
  updateStockOrder: (categoryId, stockIds) => enqueueMutation(get, async () => {
    const current = get();
    const category = current.categories.find((item) => item.id === categoryId);
    const ids = uniqueIds(stockIds);
    if (!category || ids.length !== category.stockIds.length || ids.some((id) => !category.stockIds.includes(id))) throw new Error("INVALID_CATEGORY_ORDER");
    await commitSnapshot(get, set, accountSnapshotFrom({ ...current, categories: current.categories.map((item) => item.id === categoryId ? { ...item, stockIds: ids } : item) }));
  }),
  updateCategories: (categories) => enqueueMutation(get, async () => {
    const current = get();
    await commitSnapshot(get, set, accountSnapshotFrom({ ...current, categories: normalizeAccountSnapshot({ ...current, categories }).categories }));
  }),
  setActiveCategory: (id) => {
    const current = get();
    const activeCategoryId = current.categories.some((category) => category.id === id) ? id : current.categories[0]?.id ?? EMPTY_CATEGORY_ID;
    if (activeCategoryId === current.activeCategoryId) return Promise.resolve();
    const recentCategoryIds = current.activeCategoryId && !current.pinnedCategoryIds.includes(current.activeCategoryId)
      ? uniqueIds([current.activeCategoryId, ...current.recentCategoryIds]).filter((value) => value !== activeCategoryId && !current.pinnedCategoryIds.includes(value)).slice(0, 3)
      : current.recentCategoryIds;
    set({ activeCategoryId, recentCategoryIds });
    return persistLocal(get, set);
  },
  togglePinnedCategory: (id) => {
    const current = get();
    if (!current.categories.some((category) => category.id === id)) return Promise.resolve();
    const pinned = current.pinnedCategoryIds.includes(id);
    if (!pinned && current.pinnedCategoryIds.length >= 5) return Promise.reject(new Error("PIN_LIMIT_REACHED"));
    const pinnedCategoryIds = pinned ? current.pinnedCategoryIds.filter((value) => value !== id) : [...current.pinnedCategoryIds, id];
    set({ pinnedCategoryIds, recentCategoryIds: current.recentCategoryIds.filter((value) => value !== id) });
    return persistLocal(get, set);
  },
  reorderPinnedCategories: (ids) => {
    const current = get();
    const pinnedCategoryIds = uniqueIds(ids).filter((id) => current.pinnedCategoryIds.includes(id));
    if (pinnedCategoryIds.length !== current.pinnedCategoryIds.length) return Promise.resolve();
    set({ pinnedCategoryIds });
    return persistLocal(get, set);
  },
}));

export default useStocksStore;
