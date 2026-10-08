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

import useStocksStore, { DEFAULT_WATCHLIST_ID } from "../Stock.store";

const settings = {
  ma5: 5, ma10: 10, ma20: 30, ma60: 60, boll: 30, kd: 9, mfi: 14, rsi: 14,
  ma120: 120, ma240: 240, emaShort: 5, emaLong: 10, cmf: 21, cmfEma: 5,
  atrLen: 10, atrMult: 3, donchian: 20, cci: 26,
};
const snapshot = (id: string) => ({
  stocks: [{ id, name: `Stock ${id}`, group: "TW", type: "stock" }],
  categories: [{ id: DEFAULT_WATCHLIST_ID, name: "", stockIds: [id], isDefault: true }],
  activeCategoryId: DEFAULT_WATCHLIST_ID,
  pinnedCategoryIds: [],
  recentCategoryIds: [],
  indicatorSettings: { ...settings, ma20: 21 },
});

function resetProjection() {
  useStocksStore.setState({
    stocks: [], menu: [], categories: [], activeCategoryId: DEFAULT_WATCHLIST_ID,
    hydrated: false, pinnedCategoryIds: [], recentCategoryIds: [], indicatorSettings: { ...settings },
    accountUserId: null, accountEpoch: null, cloudRevision: 0, syncStatus: "local", syncError: null,
    legacyImportAvailable: false, legacyRepairAvailable: false, legacyRepairMissingCount: 0, legacyUnresolvedStockIds: [], legacyRepairDisposition: null,
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
    invoke.mockImplementation(async (command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_get_state") {
        const data = args.expectedEpoch === 1 ? snapshot("2330") : null;
        return { userId: args.expectedEpoch === 1 ? "user-a" : "user-b", epoch: args.expectedEpoch, revision: data ? 1 : 0, schemaVersion: 1, data, updatedAt: null };
      }
      if (command === "account_update_state") return { userId: "user-a", epoch: args.expectedEpoch, revision: 2, updatedAt: null };
      throw new Error(`unexpected invoke ${command}`);
    });
  });

  it("restores A, isolates B, and keeps indicator settings per account", async () => {
    persisted.set("menu", [{ id: "2330", name: "TSMC", group: "TW", type: "stock" }]);
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    expect(useStocksStore.getState().stocks.map((stock) => stock.id)).toEqual(["2330"]);
    expect(useStocksStore.getState().indicatorSettings.ma20).toBe(21);
    expect(useStocksStore.getState().menu.map((stock) => stock.id)).toEqual(["2330"]);

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
      if (command === "account_get_state") return Promise.resolve({ userId: "user-b", epoch: 5, revision: 0, schemaVersion: 1, data: null, updatedAt: null });
      return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, revision: 1, updatedAt: null });
    });

    const staleHydration = useStocksStore.getState().hydrateAccount("user-a", 4);
    await Promise.resolve();
    await useStocksStore.getState().clearAccountProjection();
    await useStocksStore.getState().hydrateAccount("user-b", 5);
    resolveA({ userId: "user-a", epoch: 4, revision: 1, schemaVersion: 1, data: snapshot("2330"), updatedAt: null });
    await staleHydration;

    expect(useStocksStore.getState().accountUserId).toBe("user-b");
    expect(useStocksStore.getState().stocks).toEqual([]);
  });

  it("rejects a non-empty cloud revision with a missing payload", async () => {
    invoke.mockImplementation(async (command: string) => {
      if (command === "account_get_state") {
        return { userId: "user-a", epoch: 1, revision: 3, schemaVersion: 1, data: null, updatedAt: null };
      }
      throw new Error(`unexpected invoke ${command}`);
    });

    await expect(useStocksStore.getState().hydrateAccount("user-a", 1)).rejects.toThrow("INVALID_CLOUD_STATE");
    expect(useStocksStore.getState()).toMatchObject({
      hydrated: false,
      syncStatus: "error",
      syncError: "INVALID_CLOUD_STATE",
      cloudRevision: 0,
    });
  });

  it("offers legacy data once and records the claiming account after import", async () => {
    persisted.set("stocks", [{ id: "2330", name: "TSMC", group: "TW", type: "stock" }]);
    persisted.set("categories", [{ id: DEFAULT_WATCHLIST_ID, name: "", stockIds: ["2330"], isDefault: true }]);
    localStorage.setItem("slitenting-indicator-settings", JSON.stringify({ ma20: 20 }));
    invoke.mockImplementation(async (command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_get_state") return { userId: args.expectedEpoch === 6 ? "user-a" : "user-b", epoch: args.expectedEpoch, revision: 0, schemaVersion: 1, data: null, updatedAt: null };
      if (command === "account_import_legacy") return { userId: "user-a", epoch: 6, revision: 1, updatedAt: null };
      throw new Error(`unexpected invoke ${command}`);
    });

    await useStocksStore.getState().hydrateAccount("user-a", 6);
    expect(useStocksStore.getState().legacyImportAvailable).toBe(true);
    await useStocksStore.getState().importLegacy();
    expect(useStocksStore.getState().legacyImportAvailable).toBe(false);
    expect(persisted.get("slstening-legacy-import-claim")).toEqual(expect.objectContaining({ userId: "user-a" }));

    await useStocksStore.getState().clearAccountProjection();
    await useStocksStore.getState().hydrateAccount("user-b", 7);
    expect(useStocksStore.getState().legacyImportAvailable).toBe(false);
    expect(useStocksStore.getState().stocks).toEqual([]);
  });

  it("includes category members resolved from the shared menu in the legacy import", async () => {
    persisted.set("stocks", [{ id: "2330", name: "TSMC", group: "TW", type: "stock" }]);
    persisted.set("menu", [{ id: "2317", name: "Hon Hai", group: "TW", type: "stock" }]);
    persisted.set("categories", [
      { id: DEFAULT_WATCHLIST_ID, name: "", stockIds: ["2330"], isDefault: true },
      { id: "power", name: "Power", stockIds: ["2317"] },
    ]);
    invoke.mockImplementation(async (command: string, args: { expectedEpoch?: number; data?: unknown }) => {
      if (command === "account_get_state") return { userId: "user-a", epoch: args.expectedEpoch, revision: 0, schemaVersion: 1, data: null, updatedAt: null };
      if (command === "account_import_legacy") return { userId: "user-a", epoch: 1, revision: 1, updatedAt: null };
      throw new Error(`unexpected invoke ${command}`);
    });
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    await useStocksStore.getState().importLegacy();
    const write = invoke.mock.calls.find(([command]) => command === "account_import_legacy");
    expect(write?.[1]).toEqual(expect.objectContaining({
      data: expect.objectContaining({
        stocks: expect.arrayContaining([expect.objectContaining({ id: "2317" })]),
        categories: expect.arrayContaining([expect.objectContaining({ id: "power", stockIds: ["2317"] })]),
      }),
    }));
  });

  it("keeps a pending legacy reservation when A switches during import so B cannot import it", async () => {
    persisted.set("stocks", [{ id: "2330", name: "TSMC", group: "TW", type: "stock" }]);
    persisted.set("categories", [{ id: DEFAULT_WATCHLIST_ID, name: "", stockIds: ["2330"], isDefault: true }]);
    let rejectImport!: (error: Error) => void;
    const pendingImport = new Promise((_resolve, reject) => { rejectImport = reject; });
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_get_state") {
        return Promise.resolve({ userId: args.expectedEpoch === 1 ? "user-a" : "user-b", epoch: args.expectedEpoch, revision: 0, schemaVersion: 1, data: null, updatedAt: null });
      }
      if (command === "account_import_legacy") return pendingImport;
      return Promise.reject(new Error(`unexpected invoke ${command}`));
    });

    await useStocksStore.getState().hydrateAccount("user-a", 1);
    const importing = useStocksStore.getState().importLegacy();
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("account_import_legacy", expect.anything()));
    const reservation = persisted.get("slstening-legacy-import-pending") as { userId: string; operationId: string };
    expect(reservation).toEqual(expect.objectContaining({ userId: "user-a", operationId: expect.any(String) }));

    await useStocksStore.getState().clearAccountProjection();
    await useStocksStore.getState().hydrateAccount("user-b", 2);
    expect(useStocksStore.getState().legacyImportAvailable).toBe(false);
    expect(useStocksStore.getState().stocks).toEqual([]);
    await expect(useStocksStore.getState().importLegacy()).rejects.toThrow("LEGACY_IMPORT_UNAVAILABLE");

    rejectImport(new Error("SESSION_CHANGED"));
    await importing;
    expect(persisted.get("slstening-legacy-import-pending")).toEqual(reservation);
  });

  it("does not publish a delayed A write into B", async () => {
    let resolveWrite!: (value: unknown) => void;
    const delayedWrite = new Promise((resolve) => { resolveWrite = resolve; });
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_get_state") {
        const data = args.expectedEpoch === 1 ? snapshot("2330") : null;
        return Promise.resolve({ userId: args.expectedEpoch === 1 ? "user-a" : "user-b", epoch: args.expectedEpoch, revision: data ? 1 : 0, schemaVersion: 1, data, updatedAt: null });
      }
      if (command === "account_update_state") return delayedWrite;
      return Promise.reject(new Error(`unexpected invoke ${command}`));
    });
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    const mutation = useStocksStore.getState().addStocks([{ id: "2317", name: "Stock 2317", group: "TW", type: "stock" }]);
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("account_update_state", expect.anything()));
    await useStocksStore.getState().clearAccountProjection();
    await useStocksStore.getState().hydrateAccount("user-b", 2);
    resolveWrite({ userId: "user-a", epoch: 1, revision: 2, updatedAt: null });
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
        return Promise.resolve({ userId: args.expectedEpoch === 1 ? "user-a" : "user-b", epoch: args.expectedEpoch, revision: data ? 1 : 0, schemaVersion: 1, data, updatedAt: null });
      }
      if (command === "account_update_state") return delayedWrite;
      return Promise.reject(new Error(`unexpected invoke ${command}`));
    });
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    const first = useStocksStore.getState().addStocks([{ id: "2317", name: "Stock 2317", group: "TW", type: "stock" }]);
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("account_update_state", expect.anything()));
    const queued = useStocksStore.getState().addStocks([{ id: "2454", name: "Stock 2454", group: "TW", type: "stock" }]);
    await useStocksStore.getState().clearAccountProjection();
    await useStocksStore.getState().hydrateAccount("user-b", 2);
    resolveWrite({ userId: "user-a", epoch: 1, revision: 2, updatedAt: null });
    await first;
    await expect(queued).rejects.toThrow("SESSION_CHANGED");
    expect(useStocksStore.getState().accountUserId).toBe("user-b");
    expect(useStocksStore.getState().stocks).toEqual([]);
  });

  it("merges rapid indicator key updates against the latest queued state", async () => {
    let resolveWrite!: (value: unknown) => void;
    let writeCount = 0;
    const delayedWrite = new Promise((resolve) => { resolveWrite = resolve; });
    invoke.mockImplementation((command: string, _args: { expectedEpoch?: number }) => {
      if (command === "account_get_state") return Promise.resolve({ userId: "user-a", epoch: 1, revision: 1, schemaVersion: 1, data: snapshot("2330"), updatedAt: null });
      if (command === "account_update_state") {
        writeCount += 1;
        return writeCount === 1 ? delayedWrite : Promise.resolve({ userId: "user-a", epoch: 1, revision: 3, updatedAt: null });
      }
      return Promise.reject(new Error(`unexpected invoke ${command}`));
    });
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    const first = useStocksStore.getState().updateIndicatorSetting("ma5", 7);
    const second = useStocksStore.getState().updateIndicatorSetting("rsi", 22);
    await vi.waitFor(() => expect(writeCount).toBe(1));
    resolveWrite({ userId: "user-a", epoch: 1, revision: 2, updatedAt: null });
    await first;
    await second;
    expect(useStocksStore.getState().indicatorSettings.ma5).toBe(7);
    expect(useStocksStore.getState().indicatorSettings.rsi).toBe(22);
  });

  it("offers an explicit repair for a same-account import that lost category members", async () => {
    const current = snapshot("2330");
    const retained = {
      snapshot: {
        ...current,
        stocks: [
          ...current.stocks,
          { id: "2317", name: "Hon Hai", group: "TW", type: "stock" },
        ],
        categories: [
          ...current.categories,
          { id: "power", name: "Power", stockIds: ["2317"] },
        ],
      },
      unresolvedStockIds: [],
    };
    persisted.set("slstening-legacy-import-claim", { userId: "user-a", operationId: "legacy-import-1" });
    persisted.set("account:user-a:legacy-snapshot", retained);
    invoke.mockImplementation(async (command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_get_state") return { userId: "user-a", epoch: args.expectedEpoch, revision: 1, schemaVersion: 1, data: current, updatedAt: null };
      if (command === "account_update_state") return { userId: "user-a", epoch: 1, revision: 2, updatedAt: null };
      throw new Error(`unexpected invoke ${command}`);
    });

    await useStocksStore.getState().hydrateAccount("user-a", 1);
    expect(useStocksStore.getState().legacyRepairAvailable).toBe(true);
    expect(useStocksStore.getState().legacyRepairMissingCount).toBe(1);
    await useStocksStore.getState().repairLegacy();

    const write = invoke.mock.calls.find(([command]) => command === "account_update_state");
    expect(write?.[1]).toEqual(expect.objectContaining({
      expectedRevision: 1,
      data: expect.objectContaining({
        stocks: expect.arrayContaining([expect.objectContaining({ id: "2317" })]),
        categories: expect.arrayContaining([expect.objectContaining({ id: "power", stockIds: ["2317"] })]),
      }),
    }));
    expect(useStocksStore.getState().legacyRepairAvailable).toBe(false);
    expect(persisted.get("account:user-a:legacy-repaired")).toBe(true);
    expect(persisted.get("account:user-a:legacy-repair-disposition")).toBe("repaired");
  });

  it("shows an actionable error when the repair claim cannot be read", async () => {
    useStocksStore.setState({
      accountUserId: "user-a",
      accountEpoch: 1,
      cloudRevision: 1,
      legacyRepairAvailable: true,
      legacyRepairMissingCount: 1,
      syncStatus: "synced",
    });
    storeControl.getError = new Error("LEGACY_CLAIM_READ_FAILED");

    const repairing = useStocksStore.getState().repairLegacy();
    expect(useStocksStore.getState().syncStatus).toBe("repairing");
    await expect(repairing).rejects.toThrow("LEGACY_CLAIM_READ_FAILED");
    expect(useStocksStore.getState()).toMatchObject({
      syncStatus: "error",
      syncError: "LEGACY_CLAIM_READ_FAILED",
      legacyRepairAvailable: true,
    });
  });

  it("keeps both repair choices after an ordinary cloud write error", async () => {
    const current = snapshot("2330");
    const retained = {
      snapshot: {
        ...current,
        stocks: [...current.stocks, { id: "2317", name: "Hon Hai", group: "TW", type: "stock" }],
        categories: [...current.categories, { id: "power", name: "Power", stockIds: ["2317"] }],
      },
      unresolvedStockIds: [],
    };
    persisted.set("slstening-legacy-import-claim", { userId: "user-a", operationId: "legacy-import-1" });
    persisted.set("account:user-a:legacy-snapshot", retained);
    invoke.mockImplementation(async (command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_get_state") return { userId: "user-a", epoch: args.expectedEpoch, revision: 1, schemaVersion: 1, data: current, updatedAt: null };
      if (command === "account_update_state") throw new Error("CLOUD_WRITE_FAILED");
      throw new Error(`unexpected invoke ${command}`);
    });

    await useStocksStore.getState().hydrateAccount("user-a", 1);
    await expect(useStocksStore.getState().repairLegacy()).rejects.toThrow("CLOUD_WRITE_FAILED");
    expect(useStocksStore.getState()).toMatchObject({
      syncStatus: "error",
      syncError: "CLOUD_WRITE_FAILED",
      legacyRepairAvailable: true,
    });
    expect(persisted.get("account:user-a:legacy-repair-disposition")).toBeUndefined();
  });

  it("keeps the repair choice available and requests reload after a revision conflict", async () => {
    const current = snapshot("2330");
    const retained = {
      snapshot: {
        ...current,
        stocks: [...current.stocks, { id: "2317", name: "Hon Hai", group: "TW", type: "stock" }],
        categories: [...current.categories, { id: "power", name: "Power", stockIds: ["2317"] }],
      },
      unresolvedStockIds: [],
    };
    persisted.set("slstening-legacy-import-claim", { userId: "user-a", operationId: "legacy-import-1" });
    persisted.set("account:user-a:legacy-snapshot", retained);
    invoke.mockImplementation(async (command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_get_state") return { userId: "user-a", epoch: args.expectedEpoch, revision: 1, schemaVersion: 1, data: current, updatedAt: null };
      if (command === "account_update_state") throw new Error("REVISION_CONFLICT");
      throw new Error(`unexpected invoke ${command}`);
    });

    await useStocksStore.getState().hydrateAccount("user-a", 1);
    await expect(useStocksStore.getState().repairLegacy()).rejects.toThrow("REVISION_CONFLICT");
    expect(useStocksStore.getState()).toMatchObject({
      syncStatus: "conflict",
      syncError: "REVISION_CONFLICT",
      legacyRepairAvailable: true,
    });
    expect(persisted.get("account:user-a:legacy-repair-disposition")).toBeUndefined();
  });

  it("keeps current data without cloud mutation and does not re-prompt", async () => {
    const current = snapshot("2330");
    const retained = {
      snapshot: {
        ...current,
        stocks: [...current.stocks, { id: "2317", name: "Hon Hai", group: "TW", type: "stock" }],
        categories: [...current.categories, { id: "power", name: "Power", stockIds: ["2317"] }],
      },
      unresolvedStockIds: [],
    };
    persisted.set("slstening-legacy-import-claim", { userId: "user-a", operationId: "legacy-import-1" });
    persisted.set("account:user-a:legacy-snapshot", retained);
    invoke.mockImplementation(async (command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_get_state") return { userId: "user-a", epoch: args.expectedEpoch, revision: 1, schemaVersion: 1, data: current, updatedAt: null };
      throw new Error(`unexpected invoke ${command}`);
    });

    await useStocksStore.getState().hydrateAccount("user-a", 1);
    expect(useStocksStore.getState().legacyRepairAvailable).toBe(true);
    await useStocksStore.getState().keepLegacyCurrent();
    expect(invoke.mock.calls.some(([command]) => command === "account_update_state")).toBe(false);
    expect(persisted.get("account:user-a:legacy-repair-disposition")).toBe("keep-current");
    expect(useStocksStore.getState().legacyRepairAvailable).toBe(false);

    await useStocksStore.getState().clearAccountProjection();
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    expect(useStocksStore.getState().legacyRepairAvailable).toBe(false);
    expect(useStocksStore.getState().legacyRepairDisposition).toBe("keep-current");
  });

  it("does not publish or mark a legacy repair after switching accounts mid-write", async () => {
    const current = snapshot("2330");
    const retained = {
      snapshot: {
        ...current,
        stocks: [...current.stocks, { id: "2317", name: "Hon Hai", group: "TW", type: "stock" }],
        categories: [...current.categories, { id: "power", name: "Power", stockIds: ["2317"] }],
      },
      unresolvedStockIds: [],
    };
    persisted.set("slstening-legacy-import-claim", { userId: "user-a", operationId: "legacy-import-1" });
    persisted.set("account:user-a:legacy-snapshot", retained);
    let resolveRepair!: (value: unknown) => void;
    const pendingRepair = new Promise((resolve) => { resolveRepair = resolve; });
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_get_state") {
        const data = args.expectedEpoch === 1 ? current : null;
        return Promise.resolve({ userId: args.expectedEpoch === 1 ? "user-a" : "user-b", epoch: args.expectedEpoch, revision: data ? 1 : 0, schemaVersion: 1, data, updatedAt: null });
      }
      if (command === "account_update_state") return pendingRepair;
      return Promise.reject(new Error(`unexpected invoke ${command}`));
    });

    await useStocksStore.getState().hydrateAccount("user-a", 1);
    const repairing = useStocksStore.getState().repairLegacy();
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("account_update_state", expect.anything()));
    await useStocksStore.getState().clearAccountProjection();
    await useStocksStore.getState().hydrateAccount("user-b", 2);
    resolveRepair({ userId: "user-a", epoch: 1, revision: 2, updatedAt: null });
    await repairing;

    expect(useStocksStore.getState().accountUserId).toBe("user-b");
    expect(useStocksStore.getState().stocks).toEqual([]);
    expect(persisted.get("account:user-a:legacy-repaired")).toBeUndefined();
  });
});
