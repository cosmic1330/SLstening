/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const persisted = vi.hoisted(() => new Map<string, unknown>());
const invoke = vi.hoisted(() => vi.fn());
const storeControl = vi.hoisted(() => ({ getError: null as Error | null, saveError: null as Error | null }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/plugin-store", () => ({
  Store: { load: vi.fn(async () => ({
    get: async (key: string) => { if (storeControl.getError) throw storeControl.getError; return persisted.get(key); },
    set: async (key: string, value: unknown) => { persisted.set(key, value); },
    delete: async (key: string) => { persisted.delete(key); },
    save: async () => { if (storeControl.saveError) throw storeControl.saveError; },
  })) },
}));

import useStocksStore from "../Stock.store";

const settings = {
  ma5: 5, ma10: 10, ma20: 30, ma60: 60, boll: 30, kd: 9, mfi: 14, rsi: 14,
  ma120: 120, ma240: 240, emaShort: 5, emaLong: 10, cmf: 21, cmfEma: 5,
  atrLen: 10, atrMult: 3, donchian: 20, cci: 26,
};
const snapshot = (id: string) => ({
  stocks: [{ id, name: `Stock ${id}`, group: "TW", type: "stock" }],
  categories: [{ id: "group-a", name: "A", stockIds: [id] }],
  activeCategoryId: "group-a",
  pinnedCategoryIds: [],
  recentCategoryIds: [],
  indicatorSettings: { ...settings, ma20: 21 },
});

function resetProjection() {
  useStocksStore.setState({
    stocks: [], menu: [], categories: [], activeCategoryId: "", hydrated: false,
    pinnedCategoryIds: [], recentCategoryIds: [], indicatorSettings: { ...settings },
    accountUserId: null, accountEpoch: null, syncStatus: "local", syncError: null,
    legacySettingsPrompt: false, legacySettingsError: null,
  });
}

describe("account-scoped stock projection", () => {
  beforeEach(() => {
    persisted.clear();
    storeControl.getError = null;
    storeControl.saveError = null;
    localStorage.clear();
    invoke.mockReset();
    Object.defineProperty(window, "__TAURI_INTERNALS__", { configurable: true, value: {} });
    resetProjection();
    invoke.mockImplementation(async (command: string, args: { expectedEpoch?: number; data?: unknown }) => {
      if (command === "account_get_state") {
        const data = args.expectedEpoch === 1 ? snapshot("2330") : null;
        return { userId: args.expectedEpoch === 1 ? "user-a" : "user-b", epoch: args.expectedEpoch, schemaVersion: 1, data, updatedAt: null };
      }
      if (command === "account_update_state") return { userId: "user-a", epoch: args.expectedEpoch, updatedAt: null };
      if (command === "account_get_indicator_settings") return args.expectedEpoch === 1 ? { ...settings, ma20: 21 } : null;
      if (command === "account_update_indicator_settings") return args.data ?? settings;
      if (command === "account_reset_indicator_settings") return settings;
      if (command === "legacy_settings_status") return { present: false, disposition: null, path: "" };
      throw new Error(`unexpected invoke ${command}`);
    });
  });

  it("restores A, isolates B, and keeps indicator settings per account", async () => {
    persisted.set("menu", [{ id: "2330", name: "TSMC", group: "TW", type: "stock" }]);
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    expect(useStocksStore.getState().stocks.map((stock) => stock.id)).toEqual(["2330"]);
    expect(useStocksStore.getState().indicatorSettings.ma20).toBe(21);
    expect(useStocksStore.getState().menu.map((stock) => stock.id)).toEqual(["2330"]);
    expect(persisted.has("settings.json")).toBe(false);

    await useStocksStore.getState().clearAccountProjection();
    await useStocksStore.getState().hydrateAccount("user-b", 2);
    expect(useStocksStore.getState().stocks).toEqual([]);
    expect(useStocksStore.getState().indicatorSettings.ma20).toBe(30);

    await useStocksStore.getState().clearAccountProjection();
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    expect(useStocksStore.getState().stocks.map((stock) => stock.id)).toEqual(["2330"]);
    expect(useStocksStore.getState().indicatorSettings.ma20).toBe(21);
  });

  it("drops delayed A hydration after the projection switches to B", async () => {
    let resolveA!: (value: unknown) => void;
    const delayedA = new Promise((resolve) => { resolveA = resolve; });
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_get_state" && args.expectedEpoch === 4) return delayedA;
      if (command === "account_get_state") return Promise.resolve({ userId: "user-b", epoch: 5, schemaVersion: 1, data: null, updatedAt: null });
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, updatedAt: null });
    });

    const staleHydration = useStocksStore.getState().hydrateAccount("user-a", 4);
    await Promise.resolve();
    await useStocksStore.getState().clearAccountProjection();
    await useStocksStore.getState().hydrateAccount("user-b", 5);
    resolveA({ userId: "user-a", epoch: 4, schemaVersion: 1, data: snapshot("2330"), updatedAt: null });
    await staleHydration;

    expect(useStocksStore.getState().accountUserId).toBe("user-b");
    expect(useStocksStore.getState().stocks).toEqual([]);
  });

  it("queues a startup mutation behind the initial PhoneApp pull", async () => {
    let resolvePull!: (value: unknown) => void;
    const pendingPull = new Promise((resolve) => { resolvePull = resolve; });
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_get_state") return pendingPull;
      if (command === "account_update_state") return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, updatedAt: null });
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "account_update_indicator_settings") return Promise.resolve(settings);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.reject(new Error(`unexpected invoke ${command}`));
    });

    await useStocksStore.getState().primeAccountFromCache("user-a", 1);
    const initialReload = useStocksStore.getState().reload();
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("account_get_state", { expectedEpoch: 1 }));

    const mutation = useStocksStore.getState().addCategory("Created after startup");
    expect(invoke.mock.calls.some(([command]) => command === "account_update_state")).toBe(false);

    resolvePull({ userId: "user-a", epoch: 1, schemaVersion: 1, data: snapshot("2330"), updatedAt: null });
    await initialReload;
    await mutation;

    const write = invoke.mock.calls.find(([command]) => command === "account_update_state");
    expect(write?.[1]).toMatchObject({
      data: {
        categories: [
          expect.objectContaining({ id: "group-a" }),
          expect.objectContaining({ name: "Created after startup" }),
        ],
        stocks: [expect.objectContaining({ id: "2330" })],
      },
    });
    expect(useStocksStore.getState()).toMatchObject({ syncStatus: "synced" });
  });

  it("keeps mutations behind the pull when cache priming exposes the UI first", async () => {
    let resolveLegacyCheck!: (value: unknown) => void;
    let resolvePull!: (value: unknown) => void;
    const pendingLegacyCheck = new Promise((resolve) => { resolveLegacyCheck = resolve; });
    const pendingPull = new Promise((resolve) => { resolvePull = resolve; });
    persisted.set("account:user-a:snapshot", snapshot("2317"));
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "legacy_settings_status") return pendingLegacyCheck;
      if (command === "account_get_state") return pendingPull;
      if (command === "account_update_state") return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, updatedAt: null });
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "account_update_indicator_settings") return Promise.resolve(settings);
      return Promise.reject(new Error(`unexpected invoke ${command}`));
    });

    const initialization = useStocksStore.getState().initializeAccount("user-a", 1);
    await vi.waitFor(() => expect(useStocksStore.getState()).toMatchObject({ hydrated: true, syncStatus: "loading" }));

    const mutation = useStocksStore.getState().addCategory("Created during cache prime");
    expect(invoke.mock.calls.some(([command]) => command === "account_get_state")).toBe(false);
    expect(invoke.mock.calls.some(([command]) => command === "account_update_state")).toBe(false);

    resolveLegacyCheck({ present: false, disposition: null, path: "" });
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("account_get_state", { expectedEpoch: 1 }));
    expect(invoke.mock.calls.some(([command]) => command === "account_update_state")).toBe(false);

    resolvePull({ userId: "user-a", epoch: 1, schemaVersion: 1, data: snapshot("2330"), updatedAt: null });
    await initialization;
    await mutation;

    const write = invoke.mock.calls.find(([command]) => command === "account_update_state");
    expect(write?.[1]).toMatchObject({
      data: {
        categories: [
          expect.objectContaining({ id: "group-a" }),
          expect.objectContaining({ name: "Created during cache prime" }),
        ],
        stocks: [expect.objectContaining({ id: "2330" })],
      },
    });
  });

  it("does not duplicate indicator preferences in the native account cache", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);

    expect(persisted.get("account:user-a:snapshot")).not.toHaveProperty("indicatorSettings");
  });

  it("does not let an old same-account pull overwrite a newer mutation or cache", async () => {
    let resolveOldPull!: (value: unknown) => void;
    const oldPull = new Promise((resolve) => { resolveOldPull = resolve; });
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number; data?: unknown }) => {
      if (command === "account_get_state") return oldPull;
      if (command === "account_update_state") return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, updatedAt: null });
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.resolve(null);
    });

    const staleHydration = useStocksStore.getState().hydrateAccount("user-a", 1);
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("account_get_state", { expectedEpoch: 1 }));

    await useStocksStore.getState().addCategory("Created while pull was pending");
    const newer = useStocksStore.getState();
    expect(newer.categories).toHaveLength(1);
    expect(persisted.get("account:user-a:snapshot")).toMatchObject({
      categories: [{ name: "Created while pull was pending" }],
    });

    resolveOldPull({ userId: "user-a", epoch: 1, schemaVersion: 1, data: snapshot("2330"), updatedAt: null });
    await staleHydration;

    expect(useStocksStore.getState().categories).toHaveLength(1);
    expect(useStocksStore.getState().categories[0].name).toBe("Created while pull was pending");
    expect(useStocksStore.getState().stocks).toEqual([]);
    expect(persisted.get("account:user-a:snapshot")).toMatchObject({
      categories: [{ name: "Created while pull was pending" }],
      stocks: [],
    });
  });

  it("rejects a pull that starts during an in-flight sync after the sync commits", async () => {
    let pullCount = 0;
    let resolveSync!: (value: unknown) => void;
    let resolveOldPull!: (value: unknown) => void;
    const pendingSync = new Promise((resolve) => { resolveSync = resolve; });
    const pendingOldPull = new Promise((resolve) => { resolveOldPull = resolve; });
    invoke.mockImplementation((command: string, _args: { expectedEpoch?: number; data?: unknown }) => {
      if (command === "account_get_state") {
        pullCount += 1;
        if (pullCount === 1) return Promise.resolve({ userId: "user-a", epoch: 1, schemaVersion: 1, data: snapshot("2330"), updatedAt: null });
        return pendingOldPull;
      }
      if (command === "account_update_state") return pendingSync;
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      return Promise.resolve(null);
    });

    await useStocksStore.getState().hydrateAccount("user-a", 1);
    const mutation = useStocksStore.getState().addStocks([{ id: "2317", name: "Stock 2317", group: "TW", type: "stock" }]);
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("account_update_state", expect.anything()));

    const staleHydration = useStocksStore.getState().hydrateAccount("user-a", 1);
    await vi.waitFor(() => expect(pullCount).toBe(2));

    resolveSync({ userId: "user-a", epoch: 1, updatedAt: null });
    await mutation;
    expect(useStocksStore.getState().stocks.map((stock) => stock.id)).toContain("2317");
    expect(persisted.get("account:user-a:snapshot")).toMatchObject({
      stocks: expect.arrayContaining([expect.objectContaining({ id: "2317" })]),
    });

    resolveOldPull({ userId: "user-a", epoch: 1, schemaVersion: 1, data: snapshot("2330"), updatedAt: null });
    await staleHydration;

    expect(useStocksStore.getState().stocks.map((stock) => stock.id)).toContain("2317");
    expect(persisted.get("account:user-a:snapshot")).toMatchObject({
      stocks: expect.arrayContaining([expect.objectContaining({ id: "2317" })]),
    });
  });

  it("does not let a concurrent pull hide a failed sync", async () => {
    let pullCount = 0;
    let rejectSync!: (error: Error) => void;
    let resolveConcurrentPull!: (value: unknown) => void;
    const pendingSync = new Promise((_resolve, reject) => { rejectSync = reject; });
    const pendingPull = new Promise((resolve) => { resolveConcurrentPull = resolve; });
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_get_state") {
        pullCount += 1;
        if (pullCount === 1) return Promise.resolve({ userId: "user-a", epoch: 1, schemaVersion: 1, data: snapshot("2330"), updatedAt: null });
        return pendingPull;
      }
      if (command === "account_update_state") return pendingSync;
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, updatedAt: null });
    });

    await useStocksStore.getState().hydrateAccount("user-a", 1);
    const mutation = useStocksStore.getState().addStocks([{ id: "2317", name: "Stock 2317", group: "TW", type: "stock" }]);
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("account_update_state", expect.anything()));
    const concurrentHydration = useStocksStore.getState().hydrateAccount("user-a", 1);
    await vi.waitFor(() => expect(pullCount).toBe(2));

    rejectSync(new Error("CLOUD_WRITE_FAILED"));
    await expect(mutation).rejects.toThrow("CLOUD_WRITE_FAILED");
    resolveConcurrentPull({ userId: "user-a", epoch: 1, schemaVersion: 1, data: snapshot("2330"), updatedAt: null });
    await concurrentHydration;

    expect(useStocksStore.getState()).toMatchObject({ syncStatus: "error", syncError: "CLOUD_WRITE_FAILED" });
  });

  it("treats a missing PhoneApp backup as an empty account", async () => {
    invoke.mockImplementation(async (command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_get_state") return { userId: "user-a", epoch: args.expectedEpoch, schemaVersion: 1, data: null, updatedAt: null };
      if (command === "account_get_indicator_settings") return null;
      if (command === "legacy_settings_status") return { present: false, disposition: null, path: "" };
      throw new Error(`unexpected invoke ${command}`);
    });

    await useStocksStore.getState().hydrateAccount("user-a", 1);
    expect(useStocksStore.getState()).toMatchObject({ hydrated: true, syncStatus: "synced", categories: [], stocks: [], activeCategoryId: "" });
  });

  it("does not publish a delayed A write into B", async () => {
    let resolveWrite!: (value: unknown) => void;
    const delayedWrite = new Promise((resolve) => { resolveWrite = resolve; });
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_get_state") {
        const data = args.expectedEpoch === 1 ? snapshot("2330") : null;
        return Promise.resolve({ userId: args.expectedEpoch === 1 ? "user-a" : "user-b", epoch: args.expectedEpoch, schemaVersion: 1, data, updatedAt: null });
      }
      if (command === "account_update_state") return delayedWrite;
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.reject(new Error(`unexpected invoke ${command}`));
    });
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    const mutation = useStocksStore.getState().addStocks([{ id: "2317", name: "Stock 2317", group: "TW", type: "stock" }]);
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("account_update_state", expect.anything()));
    await useStocksStore.getState().clearAccountProjection();
    await useStocksStore.getState().hydrateAccount("user-b", 2);
    resolveWrite({ userId: "user-a", epoch: 1, updatedAt: null });
    await mutation;
    expect(useStocksStore.getState().accountUserId).toBe("user-b");
    expect(useStocksStore.getState().stocks).toEqual([]);
  });

  it("rejects queued A mutations after switching to B", async () => {
    let resolveWrite!: (value: unknown) => void;
    const delayedWrite = new Promise((resolve) => { resolveWrite = resolve; });
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_get_state") {
        const data = args.expectedEpoch === 1 ? snapshot("2330") : null;
        return Promise.resolve({ userId: args.expectedEpoch === 1 ? "user-a" : "user-b", epoch: args.expectedEpoch, schemaVersion: 1, data, updatedAt: null });
      }
      if (command === "account_update_state") return delayedWrite;
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.reject(new Error(`unexpected invoke ${command}`));
    });
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    const first = useStocksStore.getState().addStocks([{ id: "2317", name: "Stock 2317", group: "TW", type: "stock" }]);
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("account_update_state", expect.anything()));
    const queued = useStocksStore.getState().addStocks([{ id: "2454", name: "Stock 2454", group: "TW", type: "stock" }]);
    await useStocksStore.getState().clearAccountProjection();
    await useStocksStore.getState().hydrateAccount("user-b", 2);
    resolveWrite({ userId: "user-a", epoch: 1, updatedAt: null });
    await first;
    await expect(queued).rejects.toThrow("SESSION_CHANGED");
    expect(useStocksStore.getState().accountUserId).toBe("user-b");
    expect(useStocksStore.getState().stocks).toEqual([]);
  });

  it("keeps rapid indicator updates local while native preferences use their separate store", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    await useStocksStore.getState().updateIndicatorSetting("ma5", 7);
    await useStocksStore.getState().updateIndicatorSetting("rsi", 22);
    expect(useStocksStore.getState().indicatorSettings).toMatchObject({ ma5: 7, rsi: 22 });
    expect(invoke.mock.calls.some(([command]) => command === "account_update_indicator_settings")).toBe(true);
    expect(persisted.has("settings.json")).toBe(false);
  });
});
