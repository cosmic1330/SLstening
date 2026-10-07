/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const persisted = vi.hoisted(() => new Map<string, unknown>());
const invoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/plugin-store", () => ({
  Store: { load: vi.fn(async () => ({
    get: async (key: string) => persisted.get(key),
    set: async (key: string, value: unknown) => { persisted.set(key, value); },
    save: async () => undefined,
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
    legacyImportAvailable: false,
  });
}

describe("account-scoped stock projection", () => {
  beforeEach(() => {
    persisted.clear();
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
});
