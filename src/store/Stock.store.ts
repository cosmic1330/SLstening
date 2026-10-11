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
import type { AccountSnapshot, AccountStateUpdatedEvent, IndicatorSettings, McpAccountMutation } from "../account/types";
import {
  CLOUD_BACKUP_MAX_BYTES,
  CLOUD_BACKUP_MIN_INTERVAL_MS,
  CloudBackupSizeError,
  cloudBackupPayloadBytes,
  sameCloudBackupData,
} from "../account/cloudBackup";
import { reportHandledError } from "../diagnostics";

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

const validMcpMutation = (value: McpAccountMutation): boolean => {
  const ids = (items: unknown) => Array.isArray(items) && items.every((item) => typeof item === "string");
  return typeof value === "object" && value !== null && typeof value.kind === "string"
    && ((value.kind === "addStocks" && typeof value.categoryId === "string" && ids(value.stockIds))
      || (value.kind === "removeStock" && typeof value.symbol === "string")
      || (value.kind === "createCategory" && typeof value.categoryId === "string" && typeof value.name === "string")
      || (value.kind === "deleteCategory" && typeof value.categoryId === "string")
      || (value.kind === "renameCategory" && typeof value.categoryId === "string" && typeof value.name === "string")
      || ((value.kind === "setMembers" || value.kind === "reorderMembers") && typeof value.categoryId === "string" && ids(value.stockIds)));
};

const replayMcpMutation = (
  cloud: AccountSnapshot,
  local: AccountSnapshot,
  mutation: McpAccountMutation,
) => {
  if (!validMcpMutation(mutation)) throw new Error("INVALID_MCP_MUTATION");
  const cloudStocks = new Map(cloud.stocks.map((stock) => [stock.id, stock]));
  const cloudCategories = new Map(cloud.categories.map((category) => [category.id, category]));
  let stocks = [...local.stocks];
  let categories = local.categories.map((category) => ({ ...category, stockIds: [...category.stockIds] }));
  const ensureStocks = (ids: string[]) => {
    const localIds = new Set(stocks.map((stock) => stock.id));
    for (const id of ids) {
      const stock = cloudStocks.get(id);
      if (stock && !localIds.has(id)) { stocks.push(stock); localIds.add(id); }
      if (stock && localIds.has(id)) stocks = stocks.map((candidate) => candidate.id === id ? stock : candidate);
    }
  };
  const cloudCategory = (id: string) => cloudCategories.get(id) ?? null;
  if (mutation.kind === "addStocks") {
    const target = cloudCategory(mutation.categoryId);
    if (!target) throw new Error("INVALID_MCP_MUTATION");
    const index = categories.findIndex((category) => category.id === target.id);
    const localIds = index >= 0 ? categories[index].stockIds : [];
    categories = index >= 0 ? categories.map((category, item) => item === index
      ? { ...target, stockIds: [...target.stockIds, ...localIds.filter((id) => !target.stockIds.includes(id))] }
      : category) : [...categories, { ...target }];
    ensureStocks(categories.find((category) => category.id === target.id)?.stockIds ?? []);
  } else if (mutation.kind === "removeStock") {
    stocks = stocks.filter((stock) => stock.id !== mutation.symbol);
    categories = categories.map((category) => ({ ...category, stockIds: category.stockIds.filter((id) => id !== mutation.symbol) }));
  } else if (mutation.kind === "deleteCategory") {
    categories = categories.filter((category) => category.id !== mutation.categoryId);
  } else {
    const target = cloudCategory(mutation.categoryId);
    if (!target) throw new Error("INVALID_MCP_MUTATION");
    const replacement = { ...target };
    if (mutation.kind === "renameCategory") replacement.name = mutation.name;
    if (mutation.kind === "setMembers" || mutation.kind === "reorderMembers") replacement.stockIds = [...mutation.stockIds];
    const index = categories.findIndex((category) => category.id === target.id);
    categories = index < 0 ? [...categories, replacement] : categories.map((category, item) => item === index ? replacement : category);
    ensureStocks(replacement.stockIds);
  }
  const referenced = new Set(categories.flatMap((category) => category.stockIds));
  return normalizeAccountSnapshot({ ...local, stocks: stocks.filter((stock) => referenced.has(stock.id)), categories });
};

const accountKey = (userId: string) => `account:${userId}:snapshot`;
const accountDirtyKey = (userId: string) => `account:${userId}:dirty`;
const cloudBackupEnabledKey = (userId: string) => `account:${userId}:cloud-backup-enabled`;
const cloudBackupLastSuccessKey = (userId: string) => `account:${userId}:cloud-backup-last-success-at`;
const cloudDataChangedKey = (userId: string) => `account:${userId}:cloud-data-changed-at`;

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

const readStoredAccountCache = async (userId: string) => {
  const store = await Store.load(ACCOUNT_STATE_FILE);
  const value = await store.get(accountKey(userId));
  return value && typeof value === "object" ? value as Partial<AccountSnapshot> : null;
};

const readAccountCache = async (userId: string) => {
  const value = await readStoredAccountCache(userId);
  return value ? normalizeAccountSnapshot(value) : null;
};

const readAccountDirty = async (userId: string) => {
  const store = await Store.load(ACCOUNT_STATE_FILE);
  return (await store.get(accountDirtyKey(userId))) === true;
};

const readCloudBackupMetadata = async (userId: string) => {
  const store = await Store.load(ACCOUNT_STATE_FILE);
  const storedEnabled = await store.get(cloudBackupEnabledKey(userId));
  const lastSuccess = await store.get(cloudBackupLastSuccessKey(userId));
  const localChanged = await store.get(cloudDataChangedKey(userId));
  return {
    // Preserve the historical automatic-backup behavior until the user
    // explicitly opts out on this account.
    enabled: typeof storedEnabled === "boolean" ? storedEnabled : true,
    lastSuccessAt: typeof lastSuccess === "string" && !Number.isNaN(Date.parse(lastSuccess)) ? lastSuccess : null,
    localChangedAt: typeof localChanged === "string" && !Number.isNaN(Date.parse(localChanged)) ? localChanged : null,
  };
};

const writeCloudBackupMetadataNow = async (
  userId: string,
  next: { enabled?: boolean; lastSuccessAt?: string | null; localChangedAt?: string | null },
) => {
  const store = await Store.load(ACCOUNT_STATE_FILE);
  const enabledKey = cloudBackupEnabledKey(userId);
  const successKey = cloudBackupLastSuccessKey(userId);
  const changedKey = cloudDataChangedKey(userId);
  const previousEnabled = await store.get(enabledKey);
  const previousSuccess = await store.get(successKey);
  const previousChanged = await store.get(changedKey);
  try {
    if (next.enabled !== undefined) await store.set(enabledKey, next.enabled);
    if (next.lastSuccessAt !== undefined) {
      if (next.lastSuccessAt === null) await store.delete(successKey);
      else await store.set(successKey, next.lastSuccessAt);
    }
    if (next.localChangedAt !== undefined) {
      if (next.localChangedAt === null) await store.delete(changedKey);
      else await store.set(changedKey, next.localChangedAt);
    }
    await store.save();
  } catch (error) {
    try {
      await restoreStoreValue(store, enabledKey, previousEnabled);
      await restoreStoreValue(store, successKey, previousSuccess);
      await restoreStoreValue(store, changedKey, previousChanged);
    } catch { /* Preserve the original persistence error. */ }
    throw error;
  }
};

// Cloud comparisons run outside the local mutation queue. Serialize their
// metadata commits separately so a later explicit OFF always wins over an
// older comparison that was already awaiting Store.save().
let cloudMetadataWriteQueue: Promise<void> = Promise.resolve();
const writeCloudBackupMetadata = (
  userId: string,
  next: { enabled?: boolean; lastSuccessAt?: string | null; localChangedAt?: string | null },
) => {
  const write = () => writeCloudBackupMetadataNow(userId, next);
  const result = cloudMetadataWriteQueue.then(write, write);
  cloudMetadataWriteQueue = result.then(() => undefined, () => undefined);
  return result;
};

type DirtyWrite = boolean | "preserve";

const restoreStoreValue = async (store: Awaited<ReturnType<typeof Store.load>>, key: string, value: unknown) => {
  if (value === undefined) await store.delete(key);
  else await store.set(key, value);
};

const writeAccountCache = async (
  userId: string,
  snapshot: AccountSnapshot,
  dirty: DirtyWrite = false,
  localChangedAt?: string,
) => {
  const store = await Store.load(ACCOUNT_STATE_FILE);
  const { indicatorSettings: _indicatorSettings, ...accountState } = snapshot;
  const snapshotKey = accountKey(userId);
  const dirtyKey = accountDirtyKey(userId);
  const changedKey = cloudDataChangedKey(userId);
  // The Store object stays alive after a failed save. Restore its in-memory
  // keys too, otherwise a later unrelated save could commit the rejected
  // snapshot or falsely acknowledge an outbox entry.
  const previousSnapshot = await store.get(snapshotKey);
  const previousDirty = await store.get(dirtyKey);
  const previousChanged = await store.get(changedKey);
  const nextDirty = dirty === "preserve" ? previousDirty === true : dirty;
  try {
    await store.set(snapshotKey, accountState);
    await store.set(dirtyKey, nextDirty);
    if (localChangedAt !== undefined) await store.set(changedKey, localChangedAt);
    await store.save();
  } catch (error) {
    try {
      await restoreStoreValue(store, snapshotKey, previousSnapshot);
      await restoreStoreValue(store, dirtyKey, previousDirty);
      await restoreStoreValue(store, changedKey, previousChanged);
    } catch { /* Preserve the original persistence error. */ }
    throw error;
  }
};

const clearAccountDirty = async (userId: string) => {
  const store = await Store.load(ACCOUNT_STATE_FILE);
  const dirtyKey = accountDirtyKey(userId);
  const previousDirty = await store.get(dirtyKey);
  try {
    await store.set(dirtyKey, false);
    await store.save();
  } catch (error) {
    try { await restoreStoreValue(store, dirtyKey, previousDirty); } catch { /* Preserve the original persistence error. */ }
    throw error;
  }
};

// An MCP mutation has already made this exact snapshot authoritative in the
// cloud. Keep its cache acknowledgement in one Store transaction so a failed
// local save cannot publish an in-memory projection that will disappear after
// restart.
const writeMcpAccountCommit = async (
  userId: string,
  snapshot: AccountSnapshot,
  lastSuccessAt: string,
  changedAt: string,
  dirty: boolean,
) => {
  const store = await Store.load(ACCOUNT_STATE_FILE);
  const snapshotKey = accountKey(userId);
  const dirtyKey = accountDirtyKey(userId);
  const successKey = cloudBackupLastSuccessKey(userId);
  const changedKey = cloudDataChangedKey(userId);
  const previous = await Promise.all([
    store.get(snapshotKey), store.get(dirtyKey), store.get(successKey), store.get(changedKey),
  ]);
  const { indicatorSettings: _indicatorSettings, ...accountState } = snapshot;
  try {
    await store.set(snapshotKey, accountState);
    await store.set(dirtyKey, dirty);
    await store.set(successKey, lastSuccessAt);
    await store.set(changedKey, changedAt);
    await store.save();
  } catch (error) {
    try {
      await Promise.all([
        restoreStoreValue(store, snapshotKey, previous[0]),
        restoreStoreValue(store, dirtyKey, previous[1]),
        restoreStoreValue(store, successKey, previous[2]),
        restoreStoreValue(store, changedKey, previous[3]),
      ]);
    } catch { /* Preserve the original persistence error. */ }
    throw error;
  }
};

// All account-cache writes share one FIFO. This matters when a hydration read
// and a cloud mutation overlap: an old write may already be running, but the
// newer mutation's write must be ordered after it and remain the final value.
let accountCacheWriteQueue: Promise<void> = Promise.resolve();
const enqueueAccountCacheOperation = <T>(operation: () => Promise<T>) => {
  const result = accountCacheWriteQueue.then(operation, operation);
  accountCacheWriteQueue = result.then(() => undefined, () => undefined);
  return result;
};
const enqueueAccountCacheWrite = (
  userId: string,
  snapshot: AccountSnapshot,
  shouldWrite: () => boolean = () => true,
  dirty: DirtyWrite = false,
  localChangedAt?: string,
) => {
  const write = async () => {
    if (!shouldWrite()) return;
    await writeAccountCache(userId, snapshot, dirty, localChangedAt);
  };
  return enqueueAccountCacheOperation(write);
};

const writeLocalProjection = async (state: StocksState) => {
  if (isNativeRuntime()) {
    if (!state.accountUserId || state.accountEpoch === null) return;
    // Read the dirty marker inside the FIFO write and the same Store object
    // as the snapshot mutation. A pre-queue read can race an acknowledgment.
    await enqueueAccountCacheWrite(state.accountUserId, accountSnapshotFrom(state), () => true, "preserve");
    return;
  }
  const store = await Store.load(ACCOUNT_STATE_FILE);
  await store.set("local:snapshot", accountSnapshotFrom(state));
  await store.save();
};

/** Test-only export keeps the local structural commit gate independently
 * verifiable. PhoneApp payload capacity is enforced by the cloud write. */
export const __validateSnapshotForLocal = (snapshot: AccountSnapshot) => {
  const bytes = (value: string) => new TextEncoder().encode(value).length;
  if (snapshot.stocks.length > 300 || snapshot.categories.length > 100) throw new Error("DATA_LIMIT_EXCEEDED");
  const stocks = new Set<string>();
  for (const stock of snapshot.stocks) {
    if (!stock.id.trim() || bytes(stock.id) > 40 || bytes(stock.name) > 200 || bytes(stock.group) > 40 || bytes(stock.type) > 40 || stocks.has(stock.id)) throw new Error("INVALID_STOCK");
    stocks.add(stock.id);
  }
  const categories = new Set<string>();
  const memberships = new Set<string>();
  for (const category of snapshot.categories) {
    if (!category.id.trim() || bytes(category.name) > 200 || categories.has(category.id)) throw new Error("INVALID_CATEGORY");
    categories.add(category.id);
    const members = new Set<string>();
    for (const id of category.stockIds) {
      if (!stocks.has(id) || members.has(id)) throw new Error("INVALID_CATEGORY_MEMBERSHIP");
      members.add(id);
      memberships.add(id);
    }
  }
  if (memberships.size !== stocks.size) throw new Error("ORPHAN_STOCK");
  if (snapshot.activeCategoryId && !categories.has(snapshot.activeCategoryId)) throw new Error("INVALID_ACTIVE_CATEGORY");
  const validateRefs = (ids: string[], error: string) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (!categories.has(id) || seen.has(id)) throw new Error(error);
      seen.add(id);
    }
  };
  validateRefs(snapshot.pinnedCategoryIds, "INVALID_PINNED_CATEGORIES");
  validateRefs(snapshot.recentCategoryIds, "INVALID_RECENT_CATEGORIES");
  if (snapshot.pinnedCategoryIds.length > 5 || snapshot.recentCategoryIds.length > 3) throw new Error("CATEGORY_LIMIT_EXCEEDED");
  if (snapshot.pinnedCategoryIds.some((id) => snapshot.recentCategoryIds.includes(id))) throw new Error("CATEGORY_REFERENCE_OVERLAP");
  const settings = snapshot.indicatorSettings;
  const indicatorValues = [settings.ma5, settings.ma10, settings.ma20, settings.ma60, settings.boll, settings.kd, settings.mfi, settings.rsi, settings.ma120, settings.ma240, settings.emaShort, settings.emaLong, settings.cmf, settings.cmfEma, settings.atrLen, settings.atrMult, settings.donchian, settings.cci];
  if (indicatorValues.some((value) => !Number.isFinite(value) || value <= 0 || value > 1000) || settings.atrMult > 20) throw new Error("INVALID_INDICATOR_SETTINGS");
};

const pruneUnreferencedStocks = (snapshot: AccountSnapshot) => {
  const referenced = new Set(snapshot.categories.flatMap((category) => category.stockIds));
  const stocks = snapshot.stocks.filter((stock) => referenced.has(stock.id));
  return stocks.length === snapshot.stocks.length ? snapshot : { ...snapshot, stocks };
};

const dirtyCacheSnapshot = async (
  userId: string,
  shouldContinue: () => boolean,
) => {
  const stored = await readStoredAccountCache(userId);
  if (!stored) return null;
  const snapshot: AccountSnapshot = {
    stocks: stored.stocks as StockStoreType[],
    categories: stored.categories as CategoryType[],
    activeCategoryId: stored.activeCategoryId as string,
    pinnedCategoryIds: stored.pinnedCategoryIds as string[],
    recentCategoryIds: stored.recentCategoryIds as string[],
    // Account-state.json deliberately excludes indicator preferences, which
    // live in native local preferences rather than the cloud snapshot.
    indicatorSettings: stored.indicatorSettings ?? { ...DEFAULT_INDICATOR_SETTINGS },
  };
  const repaired = pruneUnreferencedStocks(snapshot);
  // Only the known orphan repair is permitted here. Every other structural
  // violation remains an error and must never be retried against the cloud.
  __validateSnapshotForLocal(repaired);
  if (repaired === snapshot) return repaired;
  if (!shouldContinue()) return null;
  await enqueueAccountCacheWrite(userId, repaired, shouldContinue, true);
  return shouldContinue() ? repaired : null;
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
export type CloudBackupConflict = {
  cloudSnapshot: AccountSnapshot;
  cloudUpdatedAt: string | null;
  localChangedAt: string | null;
  source: "startup" | "enable" | "mcp";
};
const cloudBackupAttemptAt = new Map<string, number>();
const cloudBackupInFlight = new Set<string>();
const cloudSnapshotGenerations = new Map<string, number>();
const cloudComparisonGenerations = new Map<string, number>();
const advanceCloudComparisonGeneration = (userId: string) => {
  const generation = (cloudComparisonGenerations.get(userId) ?? 0) + 1;
  cloudComparisonGenerations.set(userId, generation);
  return generation;
};
const markCloudSnapshotChanged = (userId: string) => {
  const generation = (cloudSnapshotGenerations.get(userId) ?? 0) + 1;
  cloudSnapshotGenerations.set(userId, generation);
  return generation;
};

/** Test-only reset. App restarts intentionally reset the throttle. */
export const __resetStockStoreQueuesForTests = () => {
  mutationQueue = Promise.resolve();
  accountCacheWriteQueue = Promise.resolve();
  cloudMetadataWriteQueue = Promise.resolve();
  cloudBackupAttemptAt.clear();
  cloudBackupInFlight.clear();
  cloudSnapshotGenerations.clear();
  cloudComparisonGenerations.clear();
  committedCloudGenerations.clear();
  mutationGeneration = 0;
  hydrationGeneration = 0;
};
const scheduleCloudWrite = (
  get: () => StocksState,
  set: (partial: Partial<StocksState>) => void,
  userId: string,
  epoch: number,
  snapshot: AccountSnapshot,
  options: { bypassCooldown?: boolean } = {},
) => {
  const current = get();
  if (current.accountUserId !== userId || current.accountEpoch !== epoch || !current.cloudBackupEnabled || current.cloudBackupConflict) return false;
  if (cloudBackupPayloadBytes(snapshot) > CLOUD_BACKUP_MAX_BYTES) return false;
  // Throttle and in-flight ownership are per runtime account, not epoch: a
  // native epoch refresh must not bypass the 30-second endpoint protection.
  const key = userId;
  const generation = markCloudSnapshotChanged(userId);
  const lastAttemptAt = cloudBackupAttemptAt.get(key) ?? 0;
  if (cloudBackupInFlight.has(key)) return false;
  if (!options.bypassCooldown && Date.now() - lastAttemptAt < CLOUD_BACKUP_MIN_INTERVAL_MS) return false;

  cloudBackupInFlight.add(key);
  cloudBackupAttemptAt.set(key, Date.now());
  void (async () => {
      try {
        const result = await updateNativeAccountState(epoch, snapshot);
        const timestamp = typeof result.updatedAt === "string" && !Number.isNaN(Date.parse(result.updatedAt))
          ? result.updatedAt
          : new Date().toISOString();
        const clear = async () => {
          await writeCloudBackupMetadata(userId, { lastSuccessAt: timestamp });
          if (cloudSnapshotGenerations.get(key) === generation) {
            markCloudCommit(userId, epoch);
            await clearAccountDirty(userId);
          }
        };
        const queued = accountCacheWriteQueue.then(clear, clear);
        accountCacheWriteQueue = queued.then(() => undefined, () => undefined);
        await queued;
        const after = get();
        if (after.accountUserId === userId && after.accountEpoch === epoch) {
          set({ cloudBackupLastSuccessAt: timestamp, syncStatus: after.cloudBackupEnabled && cloudSnapshotGenerations.get(key) === generation ? "synced" : "local", syncError: null });
        }
      } catch (error) {
        reportHandledError("cloud_backup_write", error, "CLOUD_BACKUP_WRITE_FAILED");
        const after = get();
        if (after.accountUserId === userId && after.accountEpoch === epoch && after.cloudBackupEnabled) set({ syncStatus: "local", syncError: null });
      } finally {
        cloudBackupInFlight.delete(key);
      }
  })();
  return true;
};

const validTimestamp = (value: unknown) =>
  typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;

const beginCloudComparison = async (
  get: () => StocksState,
  set: (partial: Partial<StocksState>) => void,
  userId: string,
  epoch: number,
  source: CloudBackupConflict["source"],
  shouldContinue: () => boolean = () => true,
) => {
  const comparisonGeneration = advanceCloudComparisonGeneration(userId);
  const comparisonIsCurrent = () => shouldContinue()
    && cloudComparisonGenerations.get(userId) === comparisonGeneration;
  set({ cloudBackupChecking: true, cloudBackupConflict: null, syncError: null });
  try {
    const result = await getNativeAccountState(epoch);
    const current = get();
    if (!comparisonIsCurrent() || !result || result.userId !== userId || result.epoch !== epoch || current.accountUserId !== userId || current.accountEpoch !== epoch) return;
    const cloud = result.data ? normalizeAccountSnapshot(result.data) : emptyAccountSnapshot();
    __validateSnapshotForLocal(cloud);
    if (cloudBackupPayloadBytes(cloud) > CLOUD_BACKUP_MAX_BYTES) throw new Error("DATA_LIMIT_EXCEEDED");
    // The fetch may outlive local-first mutations. Compare and upload the
    // current projection, never the snapshot that existed before await.
    const decisionState = get();
    if (!comparisonIsCurrent() || decisionState.accountUserId !== userId || decisionState.accountEpoch !== epoch) return;
    const local = accountSnapshotFrom(decisionState);
    if (cloudBackupPayloadBytes(local) > CLOUD_BACKUP_MAX_BYTES) throw new CloudBackupSizeError(cloudBackupPayloadBytes(local));
    const updatedAt = validTimestamp(result.updatedAt);
    const cloudMissing = !updatedAt && cloud.stocks.length === 0 && cloud.categories.length === 0;
    if (cloudMissing) {
      await writeCloudBackupMetadata(userId, { enabled: true });
      if (!comparisonIsCurrent()) return;
      // Only the remote wait stays outside the mutation FIFO. Queue the final
      // local commit behind any mutation whose durable write has started but
      // whose projection is not published yet, then read the snapshot there.
      await enqueueMutation(get, async () => {
        const latest = get();
        if (!comparisonIsCurrent() || latest.accountUserId !== userId || latest.accountEpoch !== epoch) return;
        const latestLocal = accountSnapshotFrom(latest);
        if (cloudBackupPayloadBytes(latestLocal) > CLOUD_BACKUP_MAX_BYTES) throw new CloudBackupSizeError(cloudBackupPayloadBytes(latestLocal));
        await enqueueAccountCacheWrite(userId, latestLocal, () => {
          const after = get();
          return comparisonIsCurrent() && after.accountUserId === userId && after.accountEpoch === epoch;
        }, true);
        const after = get();
        if (!comparisonIsCurrent() || after.accountUserId !== userId || after.accountEpoch !== epoch) return;
        set({ cloudBackupEnabled: true, cloudBackupChecking: false, hydrated: true, syncStatus: "loading", syncError: null });
        scheduleCloudWrite(get, set, userId, epoch, latestLocal, { bypassCooldown: true });
      }, { invalidateHydration: false });
      return;
    }
    if (sameCloudBackupData(local, cloud)) {
      await writeCloudBackupMetadata(userId, { enabled: true, ...(updatedAt ? { lastSuccessAt: updatedAt } : {}) });
      if (!comparisonIsCurrent()) return;
      await enqueueMutation(get, async () => {
        const latest = get();
        if (!comparisonIsCurrent() || latest.accountUserId !== userId || latest.accountEpoch !== epoch) return;
        if (!sameCloudBackupData(accountSnapshotFrom(latest), cloud)) {
          // A local commit completed while metadata was saving. Keep backup
          // disabled and ask using the now-current local projection.
          await writeCloudBackupMetadata(userId, { enabled: false });
          const afterPersistence = get();
          if (!comparisonIsCurrent() || afterPersistence.accountUserId !== userId || afterPersistence.accountEpoch !== epoch) return;
          set({
            cloudBackupEnabled: false,
            cloudBackupChecking: false,
            cloudBackupConflict: { cloudSnapshot: cloud, cloudUpdatedAt: updatedAt, localChangedAt: get().cloudDataChangedAt, source },
            hydrated: true,
            syncStatus: "local",
            syncError: null,
          });
          return;
        }
        set({ cloudBackupEnabled: true, cloudBackupChecking: false, cloudBackupLastSuccessAt: updatedAt ?? latest.cloudBackupLastSuccessAt, hydrated: true, syncStatus: "synced", syncError: null });
      }, { invalidateHydration: false });
      return;
    }
    set({
      cloudBackupChecking: false,
      cloudBackupConflict: { cloudSnapshot: cloud, cloudUpdatedAt: updatedAt, localChangedAt: get().cloudDataChangedAt, source },
      hydrated: true,
      syncStatus: "local",
      syncError: null,
    });
  } catch (error) {
    reportHandledError("cloud_backup_compare", error, "CLOUD_BACKUP_COMPARE_FAILED");
    if (!comparisonIsCurrent()) return;
    try { await writeCloudBackupMetadata(userId, { enabled: false }); } catch { /* keep the local projection usable */ }
    const latest = get();
    if (!comparisonIsCurrent()) return;
    if (latest.accountUserId === userId && latest.accountEpoch === epoch) {
      set({ cloudBackupEnabled: false, cloudBackupChecking: false, cloudBackupConflict: null, hydrated: true, syncStatus: "local", syncError: null });
    }
  }
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
    reportHandledError("account_local_persist", error, "ACCOUNT_LOCAL_PERSIST_FAILED");
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
    reportHandledError("indicator_persist", error, "INDICATOR_PERSIST_FAILED");
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
  cloudBackupEnabled: boolean;
  cloudBackupLastSuccessAt: string | null;
  cloudDataChangedAt: string | null;
  cloudBackupChecking: boolean;
  cloudBackupConflict: CloudBackupConflict | null;
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
  clearAccountProjectionIfCurrentUser: (userId: string) => Promise<boolean>;
  setAccountSyncError: (message: string) => void;
  setCloudBackupEnabled: (enabled: boolean) => Promise<void>;
  resolveCloudBackupConflict: (choice: "local" | "cloud") => Promise<void>;
  applyMcpAccountCommit: (event: AccountStateUpdatedEvent) => Promise<void>;
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
  __validateSnapshotForLocal(normalized);
  const current = get();
  const userId = current.accountUserId;
  const epoch = current.accountEpoch;
  const isCurrent = () => {
    const latest = get();
    return latest.accountUserId === userId && latest.accountEpoch === epoch;
  };
  if (isNativeRuntime()) {
    if (!userId || epoch === null) throw new Error("ACCOUNT_REQUIRED");
    // The local cache is the commit boundary. Cloud persistence is an ordered
    // outbox and never changes the result of this UI action.
    try {
      const changedAt = new Date().toISOString();
      await enqueueAccountCacheWrite(userId, normalized, isCurrent, true, changedAt);
      if (!isCurrent()) return;
      // This version advances for every cloud-represented local commit, even
      // when backup is off, oversized, in conflict, or currently throttled.
      // An older in-flight upload may finish, but it cannot acknowledge this
      // newer local snapshot as backed up.
      markCloudSnapshotChanged(userId);
      const projected = localNavigation(normalized, get());
      let backupEnabled = get().cloudBackupEnabled;
      if (backupEnabled && cloudBackupPayloadBytes(normalized) > CLOUD_BACKUP_MAX_BYTES) {
        backupEnabled = false;
        try { await writeCloudBackupMetadata(userId, { enabled: false }); } catch { /* Local edit remains committed. */ }
        // The metadata write may yield while a session switch initializes a
        // different account. Never publish this stale projection afterward.
        if (!isCurrent()) return;
      }
      set({ ...projected, accountUserId: userId, accountEpoch: epoch, cloudBackupEnabled: backupEnabled, cloudDataChangedAt: changedAt, cloudBackupChecking: false, hydrated: true, syncStatus: backupEnabled ? "loading" : "local", syncError: null });
      if (backupEnabled) scheduleCloudWrite(get, set, userId, epoch, normalized);
    } catch (error) {
      reportHandledError("account_commit", error, "ACCOUNT_COMMIT_FAILED");
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
  accountUserId: null, accountEpoch: null, cloudBackupEnabled: false, cloudBackupLastSuccessAt: null, syncStatus: "local", syncError: null,
  cloudDataChangedAt: null, cloudBackupChecking: false, cloudBackupConflict: null,
  legacySettingsPrompt: false, legacySettingsError: null,

  reload: async () => {
    if (isNativeRuntime()) {
      const current = get();
      if (current.accountUserId && current.accountEpoch !== null) {
        // Hydration launches cloud comparison in the background. The queue
        // covers only the local setup phase; network latency never blocks a
        // later local commit.
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
    // Cache priming exposes a usable projection before the network round-trip
    // completes. Hydration launches that comparison without awaiting it, so
    // the queue is released before local mutations resume.
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
      const dirty = await readAccountDirty(userId);
      const backup = await readCloudBackupMetadata(userId);
      const cached = dirty
        ? await dirtyCacheSnapshot(userId, isCurrentHydration)
        : await readAccountCache(userId);
      const current = get();
      if (!isCurrentHydration() || current.accountUserId !== userId || current.accountEpoch !== epoch) return;
      const snapshot = cached ?? (keepProjection ? accountSnapshotFrom(before) : emptyAccountSnapshot());
      set({
        ...localNavigation(snapshot, current),
        menu,
        accountUserId: userId,
        accountEpoch: epoch,
        cloudBackupEnabled: backup.enabled,
        cloudBackupLastSuccessAt: backup.lastSuccessAt,
        cloudDataChangedAt: backup.localChangedAt,
        cloudBackupChecking: false,
        cloudBackupConflict: null,
        hydrated: true,
        syncStatus: backup.enabled ? "loading" : "local",
        syncError: null,
      });
      reconcileIndicatorSettings(get, set, userId, epoch, snapshot.indicatorSettings);
      await get().checkLegacySettings();
    } catch (error) {
      reportHandledError("account_cache_hydrate", error, "ACCOUNT_CACHE_HYDRATE_FAILED");
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
      const backup = await readCloudBackupMetadata(userId);
      if (!isCurrentHydration() || get().accountUserId !== userId || get().accountEpoch !== epoch) return;
      set({ cloudBackupEnabled: backup.enabled, cloudBackupLastSuccessAt: backup.lastSuccessAt, cloudDataChangedAt: backup.localChangedAt });
      const dirty = await readAccountDirty(userId);
      if (!dirty && !keepProjection) {
        const cached = await readAccountCache(userId);
        if (!isCurrentHydration() || get().accountUserId !== userId || get().accountEpoch !== epoch) return;
        if (cached) {
          const indicatorFallback = { ...get().indicatorSettings };
          set({ ...localNavigation(cached, get()), hydrated: true });
          reconcileIndicatorSettings(get, set, userId, epoch, indicatorFallback);
        }
      }
      if (!backup.enabled) {
        set({ cloudBackupChecking: false, cloudBackupConflict: null, hydrated: true, syncStatus: "local", syncError: null });
        return;
      }
      if (dirty) {
        const cached = await dirtyCacheSnapshot(userId, isCurrentHydration);
        if (!cached || !isCurrentHydration() || get().accountUserId !== userId || get().accountEpoch !== epoch) return;
        // This cache is the authority while its outbox marker is dirty. Do
        // not overlay cleared/stale in-memory navigation onto it at restart.
        // Indicator preferences live outside this cache, so retain the
        // already-primed account-local value and reconcile it as on a clean
        // hydration.
        const indicatorFallback = { ...get().indicatorSettings };
        let backupEnabled = true;
        if (cloudBackupPayloadBytes(cached) > CLOUD_BACKUP_MAX_BYTES) {
          await writeCloudBackupMetadata(userId, { enabled: false });
          if (!isCurrentHydration() || get().accountUserId !== userId || get().accountEpoch !== epoch) return;
          backupEnabled = false;
        }
        set({ ...cached, indicatorSettings: indicatorFallback, menu, accountUserId: userId, accountEpoch: epoch, cloudBackupEnabled: backupEnabled, cloudBackupLastSuccessAt: backup.lastSuccessAt, cloudDataChangedAt: backup.localChangedAt, cloudBackupChecking: false, cloudBackupConflict: null, hydrated: true, syncStatus: backupEnabled ? "loading" : "local", syncError: null });
        reconcileIndicatorSettings(get, set, userId, epoch, indicatorFallback);
        if (backupEnabled) scheduleCloudWrite(get, set, userId, epoch, cached, { bypassCooldown: true });
        return;
      }
      // Comparison is background-only: local mutations must not wait behind a
      // slow cloud read, and their hydration generation invalidates stale
      // comparison results.
      void beginCloudComparison(get, set, userId, epoch, "startup", isCurrentHydration);
      await get().checkLegacySettings();
    } catch (error) {
      reportHandledError("account_cloud_hydrate", error, "ACCOUNT_CLOUD_HYDRATE_FAILED");
      const current = get();
      if (!isCurrentHydration() || current.accountUserId !== userId || current.accountEpoch !== epoch) return;
      try { await writeCloudBackupMetadata(userId, { enabled: false }); } catch { /* remain local */ }
      set({ cloudBackupEnabled: false, cloudBackupChecking: false, cloudBackupConflict: null, hydrated: true, syncStatus: "local", syncError: null });
    }
  },

  checkLegacySettings: async () => {
    if (!isNativeRuntime()) return;
    try {
      const status = await getLegacySettingsStatus();
      set({ legacySettingsPrompt: Boolean(status?.present), legacySettingsError: null });
    } catch (error) {
      reportHandledError("legacy_settings_status", error, "LEGACY_SETTINGS_STATUS_FAILED");
      set({ legacySettingsError: safeSyncError(error) });
    }
  },
  keepLegacySettings: async () => {
    try {
      const status = await keepLegacySettings();
      set({ legacySettingsPrompt: false, legacySettingsError: null });
      if (status?.present) set({ legacySettingsPrompt: false });
    } catch (error) {
      reportHandledError("legacy_settings_keep", error, "LEGACY_SETTINGS_KEEP_FAILED");
      set({ legacySettingsError: safeSyncError(error) });
      throw error;
    }
  },
  deleteLegacySettings: async () => {
    try {
      await deleteLegacySettings();
      set({ legacySettingsPrompt: false, legacySettingsError: null });
    } catch (error) {
      reportHandledError("legacy_settings_delete", error, "LEGACY_SETTINGS_DELETE_FAILED");
      set({ legacySettingsError: safeSyncError(error) });
      throw error;
    }
  },

  clearAccountProjection: async () => {
    const currentUserId = get().accountUserId;
    if (currentUserId) advanceCloudComparisonGeneration(currentUserId);
    invalidateMutationQueue();
    invalidateHydration();
    set({ ...emptyAccountSnapshot(), accountUserId: null, accountEpoch: null, cloudBackupEnabled: false, cloudBackupLastSuccessAt: null, cloudDataChangedAt: null, cloudBackupChecking: false, cloudBackupConflict: null, hydrated: false, syncStatus: "local", syncError: null });
  },
  clearAccountProjectionIfCurrentUser: async (userId) => {
    // Keep this check and the state reset in one synchronous store action.
    // A stale native-session catch must not clear a newer account projection.
    const currentUserId = get().accountUserId;
    if (currentUserId !== null && currentUserId !== userId) return false;
    advanceCloudComparisonGeneration(userId);
    invalidateMutationQueue();
    invalidateHydration();
    set({ ...emptyAccountSnapshot(), accountUserId: null, accountEpoch: null, cloudBackupEnabled: false, cloudBackupLastSuccessAt: null, cloudDataChangedAt: null, cloudBackupChecking: false, cloudBackupConflict: null, hydrated: false, syncStatus: "local", syncError: null });
    return true;
  },
  setAccountSyncError: (message) => set({ hydrated: false, syncStatus: "error", syncError: message }),
  setCloudBackupEnabled: (enabled) => {
    // Cancellation is synchronous with the user's OFF action. It must not
    // wait behind a local write while an older comparison is preparing its
    // final enable commit.
    if (!enabled) {
      const current = get();
      if (current.accountUserId) advanceCloudComparisonGeneration(current.accountUserId);
      set({ cloudBackupEnabled: false, cloudBackupChecking: false, cloudBackupConflict: null, syncStatus: "local", syncError: null });
    }
    return enqueueMutation(get, async () => {
    const current = get();
    if (!isNativeRuntime() || !current.accountUserId || current.accountEpoch === null) throw new Error("ACCOUNT_REQUIRED");
    const userId = current.accountUserId;
    const epoch = current.accountEpoch;
    const snapshot = accountSnapshotFrom(current);
    if (enabled) {
      const bytes = cloudBackupPayloadBytes(snapshot);
      if (bytes > CLOUD_BACKUP_MAX_BYTES) throw new CloudBackupSizeError(bytes);
      // Comparison is remote I/O. The local mutation queue must stay free so
      // a user can continue editing or deleting while it is pending.
      void beginCloudComparison(get, set, userId, epoch, "enable");
      return;
    }
    await writeCloudBackupMetadata(userId, { enabled: false });
    const latest = get();
    if (latest.accountUserId === userId && latest.accountEpoch === epoch) {
      set({ cloudBackupEnabled: false, cloudBackupChecking: false, cloudBackupConflict: null, syncStatus: "local", syncError: null });
    }
    });
  },
  resolveCloudBackupConflict: (choice) => enqueueMutation(get, async () => {
    const current = get();
    const conflict = current.cloudBackupConflict;
    if (!isNativeRuntime() || !current.accountUserId || current.accountEpoch === null || !conflict) return;
    const userId = current.accountUserId;
    const epoch = current.accountEpoch;
    const isCurrent = () => {
      const latest = get();
      return latest.accountUserId === userId && latest.accountEpoch === epoch;
    };

    if (choice === "local") {
      const snapshot = accountSnapshotFrom(current);
      // A durable-cache failure must not trap the user in a non-dismissible
      // conflict dialog. Keep the local projection authoritative and make a
      // best-effort retry on the next backup trigger.
      try {
        await enqueueAccountCacheWrite(userId, snapshot, isCurrent, true);
        await writeCloudBackupMetadata(userId, { enabled: true });
      } catch { /* Local conflict choice remains usable. */ }
      if (!isCurrent()) return;
      set({ cloudBackupEnabled: true, cloudBackupChecking: false, cloudBackupConflict: null, syncStatus: "loading", syncError: null });
      scheduleCloudWrite(get, set, userId, epoch, snapshot, { bypassCooldown: true });
      return;
    }

    try {
      const applied = localNavigation(conflict.cloudSnapshot, current);
      __validateSnapshotForLocal(applied);
      if (cloudBackupPayloadBytes(applied) > CLOUD_BACKUP_MAX_BYTES) throw new Error("DATA_LIMIT_EXCEEDED");
      const changedAt = conflict.cloudUpdatedAt ?? current.cloudDataChangedAt ?? new Date().toISOString();
      const store = await Store.load(ACCOUNT_STATE_FILE);
      const snapshotKey = accountKey(userId);
      const dirtyKey = accountDirtyKey(userId);
      const enabledKey = cloudBackupEnabledKey(userId);
      const successKey = cloudBackupLastSuccessKey(userId);
      const changedKey = cloudDataChangedKey(userId);
      const previous = await Promise.all([
        store.get(snapshotKey), store.get(dirtyKey), store.get(enabledKey),
        store.get(successKey), store.get(changedKey),
      ]);
      try {
        const { indicatorSettings: _indicatorSettings, ...accountState } = applied;
        await store.set(snapshotKey, accountState);
        await store.set(dirtyKey, false);
        await store.set(enabledKey, true);
        if (conflict.cloudUpdatedAt) await store.set(successKey, conflict.cloudUpdatedAt);
        await store.set(changedKey, changedAt);
        await store.save();
      } catch (error) {
        try {
          await Promise.all([
            restoreStoreValue(store, snapshotKey, previous[0]),
            restoreStoreValue(store, dirtyKey, previous[1]),
            restoreStoreValue(store, enabledKey, previous[2]),
            restoreStoreValue(store, successKey, previous[3]),
            restoreStoreValue(store, changedKey, previous[4]),
          ]);
        } catch { /* Preserve the apply failure. */ }
        throw error;
      }
      if (!isCurrent()) return;
      set({
        ...applied,
        cloudBackupEnabled: true,
        cloudBackupLastSuccessAt: conflict.cloudUpdatedAt ?? current.cloudBackupLastSuccessAt,
        cloudDataChangedAt: changedAt,
        cloudBackupChecking: false,
        cloudBackupConflict: null,
        syncStatus: "synced",
        syncError: null,
      });
    } catch {
      try { await writeCloudBackupMetadata(userId, { enabled: false }); } catch { /* Remain local. */ }
      if (isCurrent()) set({ cloudBackupEnabled: false, cloudBackupChecking: false, cloudBackupConflict: null, syncStatus: "local", syncError: null });
    }
  }),
  applyMcpAccountCommit: (event) => enqueueMutation(get, async () => {
    const current = get();
    if (!isNativeRuntime()
      || current.accountUserId !== event.userId
      || current.accountEpoch !== event.epoch) return;

    // Cancel any pull/compare started before this known-good cloud commit.
    // A later response must not recreate a conflict against the stale cache.
    advanceCloudComparisonGeneration(event.userId);
    let normalized: AccountSnapshot;
    let dirty: boolean;
    try {
      if (!validMcpMutation(event.mutation)) throw new Error("INVALID_MCP_MUTATION");
      normalized = normalizeAccountSnapshot(event.data);
      __validateSnapshotForLocal(normalized);
      dirty = await readAccountDirty(event.userId);
    } catch (error) {
      reportHandledError("mcp_account_event", error, "MCP_ACCOUNT_EVENT_INVALID");
      return;
    }
    const latest = get();
    if (latest.accountUserId !== event.userId || latest.accountEpoch !== event.epoch) return;
    const timestamp = validTimestamp(event.updatedAt) ?? new Date().toISOString();
    let cloudRepresented: AccountSnapshot;
    try {
      cloudRepresented = dirty
        ? replayMcpMutation(normalized, accountSnapshotFrom(latest), event.mutation)
        : normalized;
      __validateSnapshotForLocal(cloudRepresented);
    } catch (error) {
      reportHandledError("mcp_account_merge", error, "MCP_ACCOUNT_MERGE_FAILED");
      return;
    }
    const projected = localNavigation(cloudRepresented, latest);
    const matchesCloud = sameCloudBackupData(cloudRepresented, normalized);
    const changedAt = matchesCloud ? timestamp : new Date().toISOString();
    try {
      const committed = await enqueueAccountCacheOperation(async () => {
        const beforeWrite = get();
        if (beforeWrite.accountUserId !== event.userId || beforeWrite.accountEpoch !== event.epoch) return false;
        await writeMcpAccountCommit(event.userId, projected, timestamp, changedAt, !matchesCloud);
        return true;
      });
      if (!committed) return;
    } catch (error) {
      reportHandledError("mcp_account_commit", error, "MCP_ACCOUNT_COMMIT_PERSIST_FAILED");
      const afterFailure = get();
      if (afterFailure.accountUserId === event.userId && afterFailure.accountEpoch === event.epoch) {
        set({ syncStatus: "local", syncError: null });
      }
      return;
    }
    const after = get();
    if (after.accountUserId !== event.userId || after.accountEpoch !== event.epoch) return;
    if (matchesCloud) markCloudCommit(event.userId, event.epoch);
    let backupEnabled = after.cloudBackupEnabled;
    if (!matchesCloud && backupEnabled && cloudBackupPayloadBytes(projected) > CLOUD_BACKUP_MAX_BYTES) {
      backupEnabled = false;
      try { await writeCloudBackupMetadata(event.userId, { enabled: false }); } catch { /* Local union remains durable. */ }
      const afterMetadata = get();
      if (afterMetadata.accountUserId !== event.userId || afterMetadata.accountEpoch !== event.epoch) return;
    }
    set({
      ...projected,
      accountUserId: event.userId,
      accountEpoch: event.epoch,
      cloudBackupLastSuccessAt: timestamp,
      cloudDataChangedAt: changedAt,
      cloudBackupChecking: false,
      cloudBackupConflict: null,
      hydrated: true,
      cloudBackupEnabled: backupEnabled,
      syncStatus: matchesCloud ? (backupEnabled ? "synced" : "local") : (backupEnabled ? "loading" : "local"),
      syncError: null,
    });
    if (!matchesCloud && backupEnabled) scheduleCloudWrite(get, set, event.userId, event.epoch, projected);
  }),
  syncCurrent: () => enqueueMutation(get, async () => {
    const current = get();
    if (!isNativeRuntime() || !current.accountUserId || current.accountEpoch === null) return;
    const snapshot = accountSnapshotFrom(current);
    await enqueueAccountCacheWrite(current.accountUserId, snapshot, () => {
      const latest = get();
      return latest.accountUserId === current.accountUserId && latest.accountEpoch === current.accountEpoch;
    }, true);
    if (current.cloudBackupEnabled) scheduleCloudWrite(get, set, current.accountUserId, current.accountEpoch, snapshot);
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
