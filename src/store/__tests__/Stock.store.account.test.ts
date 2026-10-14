/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountSnapshot } from "../../account/types";

const persisted = vi.hoisted(() => new Map<string, unknown>());
const invoke = vi.hoisted(() => vi.fn());
const storeControl = vi.hoisted(() => ({
  getError: null as Error | null,
  saveError: null as Error | null,
  saveGate: null as Promise<void> | null,
  saveStarted: null as (() => void) | null,
  saveGates: [] as Promise<void>[],
  saveStartedCallbacks: [] as Array<() => void>,
}));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/plugin-store", () => ({
  Store: { load: vi.fn(async () => ({
    get: async (key: string) => { if (storeControl.getError) throw storeControl.getError; return persisted.get(key); },
    set: async (key: string, value: unknown) => { persisted.set(key, value); },
    delete: async (key: string) => { persisted.delete(key); },
    save: async () => {
      const started = storeControl.saveStartedCallbacks.shift() ?? storeControl.saveStarted;
      if (storeControl.saveStartedCallbacks.length === 0) storeControl.saveStarted = null;
      started?.();
      const gate = storeControl.saveGates.shift() ?? storeControl.saveGate;
      if (gate) await gate;
      if (storeControl.saveError) throw storeControl.saveError;
    },
  })) },
}));

import useStocksStore, { __resetStockStoreQueuesForTests, __validateSnapshotForLocal } from "../Stock.store";
import { CLOUD_BACKUP_MAX_BYTES } from "../../account/cloudBackup";
import { emptyAccountSnapshot } from "../../account/snapshot";

const settings = {
  ma5: 5, ma10: 10, ma20: 30, ma60: 60, boll: 30, kd: 9, mfi: 14, rsi: 14,
  ma120: 120, ma240: 240, emaShort: 5, emaLong: 10, cmf: 21, cmfEma: 5,
  atrLen: 10, atrMult: 3, donchian: 20, cci: 26,
};
const snapshot = (id: string): AccountSnapshot => ({
  stocks: [{ id, name: `Stock ${id}`, group: "TW", type: "stock" }],
  categories: [{ id: "group-a", name: "A", stockIds: [id] }],
  activeCategoryId: "group-a",
  pinnedCategoryIds: [],
  recentCategoryIds: [],
  indicatorSettings: { ...settings, ma20: 21 },
});

const multiCategorySnapshot = (): AccountSnapshot => ({
  stocks: [
    { id: "2330", name: "TSMC", group: "TW", type: "stock" },
    { id: "2454", name: "MediaTek", group: "TW", type: "stock" },
    { id: "8299", name: "Phison", group: "TW", type: "stock" },
  ],
  categories: [
    { id: "group-a", name: "A", stockIds: ["2330"] },
    { id: "group-b", name: "B", stockIds: ["2454", "8299"] },
  ],
  activeCategoryId: "group-a",
  pinnedCategoryIds: [],
  recentCategoryIds: [],
  indicatorSettings: { ...settings },
});

const installDirtyProjection = (value: AccountSnapshot) => {
  const { indicatorSettings: _indicatorSettings, ...cached } = value;
  persisted.set("account:user-a:snapshot", cached);
  persisted.set("account:user-a:dirty", true);
  useStocksStore.setState({
    ...value,
    accountUserId: "user-a",
    accountEpoch: 1,
    hydrated: true,
    cloudBackupEnabled: false,
    syncStatus: "local",
    syncError: null,
  });
};

const oversizedSnapshot = (): AccountSnapshot => {
  const stocks = Array.from({ length: 300 }, (_, index) => ({
    id: `TW${index}`,
    name: "名".repeat(66),
    group: "TW",
    type: "stock",
  }));
  return {
    stocks,
    categories: Array.from({ length: 100 }, (_, index) => ({
      id: `group-${index}`,
      name: `Category ${index} ${"名".repeat(60)}`,
      stockIds: stocks.slice(index * 3, index * 3 + 3).map((stock) => stock.id),
    })),
    activeCategoryId: "group-0",
    pinnedCategoryIds: [],
    recentCategoryIds: [],
    indicatorSettings: { ...settings },
  };
};

const phonePayloadBytes = (account: AccountSnapshot) => {
  const byId = new Map(account.stocks.map((stock) => [stock.id, stock]));
  const groups = account.categories.map((category) => ({
    id: category.id,
    name: category.name,
    stocks: category.stockIds.map((id) => {
      const stock = byId.get(id)!;
      return {
        symbol: stock.id,
        name: stock.name,
      };
    }),
  }));
  return new TextEncoder().encode(JSON.stringify(groups)).length;
};

function resetProjection() {
  useStocksStore.setState({
    stocks: [], menu: [], categories: [], activeCategoryId: "", hydrated: false,
    pinnedCategoryIds: [], recentCategoryIds: [], indicatorSettings: { ...settings },
    accountUserId: null, accountEpoch: null, syncStatus: "local", syncError: null,
    cloudBackupEnabled: false, cloudBackupLastSuccessAt: null,
    cloudDataChangedAt: null,
    legacySettingsPrompt: false, legacySettingsError: null,
  });
}

describe("account-scoped stock projection", () => {
  beforeEach(() => {
    __resetStockStoreQueuesForTests();
    persisted.clear();
    // Existing outbox tests describe an opted-in account. Dedicated tests
    // below cover the missing-key default-off behavior.
    persisted.set("account:user-a:cloud-backup-enabled", true);
    const { indicatorSettings: _indicatorSettings, ...cachedAccount } = snapshot("2330");
    persisted.set("account:user-a:snapshot", cachedAccount);
    storeControl.getError = null;
    storeControl.saveError = null;
    storeControl.saveGate = null;
    storeControl.saveStarted = null;
    storeControl.saveGates = [];
    storeControl.saveStartedCallbacks = [];
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
    await vi.waitFor(() => expect(useStocksStore.getState().indicatorSettings.ma20).toBe(21));
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

  it("commits locally and stays dirty when the background cloud write rejects", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_update_state") return Promise.reject(new Error("CLOUD_UNAVAILABLE"));
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, schemaVersion: 1, data: snapshot("2330"), updatedAt: null });
    });

    await expect(useStocksStore.getState().addCategory("Local first")).resolves.toBeUndefined();
    expect(useStocksStore.getState().categories.some((category) => category.name === "Local first")).toBe(true);
    expect(persisted.get("account:user-a:dirty")).toBe(true);
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("account_update_state", expect.anything()));
    await vi.waitFor(() => expect(useStocksStore.getState().syncStatus).toBe("local"));
    expect(useStocksStore.getState().syncError).toBeNull();
    expect(useStocksStore.getState().categories.some((category) => category.name === "Local first")).toBe(true);
  });

  it("accepts a clean MCP cloud commit without replacing local-only preferences", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    useStocksStore.setState({
      pinnedCategoryIds: ["group-a"],
      recentCategoryIds: [],
      indicatorSettings: { ...settings, ma20: 55 },
    });
    const incoming = snapshot("2454");
    incoming.indicatorSettings = { ...settings, ma20: 99 };

    await useStocksStore.getState().applyMcpAccountCommit({
      userId: "user-a",
      epoch: 1,
      data: incoming,
      updatedAt: "2026-10-11T08:00:00.000Z",
      operation: "add_stock",
      mutation: { kind: "addStocks", categoryId: "group-a", stockIds: ["2454"] },
    });

    expect(useStocksStore.getState()).toMatchObject({
      stocks: [expect.objectContaining({ id: "2454" })],
      pinnedCategoryIds: ["group-a"],
      indicatorSettings: expect.objectContaining({ ma20: 55 }),
      cloudBackupLastSuccessAt: "2026-10-11T08:00:00.000Z",
      cloudDataChangedAt: "2026-10-11T08:00:00.000Z",
    });
    expect(persisted.get("account:user-a:dirty")).toBe(false);
    expect(persisted.get("account:user-a:snapshot")).toMatchObject({
      stocks: [expect.objectContaining({ id: "2454" })],
    });
  });

  it("ignores MCP commits for another user or epoch", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    const beforeProjection = useStocksStore.getState();
    const beforeCache = persisted.get("account:user-a:snapshot");
    invoke.mockClear();
    const event = {
      userId: "user-b",
      epoch: 2,
      data: snapshot("2454"),
      updatedAt: "2026-10-11T08:00:00.000Z",
      operation: "add_stock",
      mutation: { kind: "addStocks" as const, categoryId: "group-a", stockIds: ["2454"] },
    };

    await useStocksStore.getState().applyMcpAccountCommit(event);
    await useStocksStore.getState().applyMcpAccountCommit({ ...event, userId: "user-a", epoch: 2 });

    expect(useStocksStore.getState().stocks).toEqual(beforeProjection.stocks);
    expect(useStocksStore.getState().categories).toEqual(beforeProjection.categories);
    expect(useStocksStore.getState().accountUserId).toBe("user-a");
    expect(useStocksStore.getState().accountEpoch).toBe(1);
    expect(persisted.get("account:user-a:snapshot")).toEqual(beforeCache);
    expect(invoke.mock.calls.some(([command]) => command === "account_update_state")).toBe(false);
  });

  it("keeps the existing projection local when the clean MCP cache transaction fails", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    const before = useStocksStore.getState().stocks.map((stock) => stock.id);
    storeControl.saveError = new Error("DISK_FULL");

    await expect(useStocksStore.getState().applyMcpAccountCommit({
      userId: "user-a",
      epoch: 1,
      data: snapshot("2454"),
      updatedAt: "2026-10-11T08:00:00.000Z",
      operation: "add_stock",
      mutation: { kind: "addStocks", categoryId: "group-a", stockIds: ["2454"] },
    })).resolves.toBeUndefined();

    expect(useStocksStore.getState().stocks.map((stock) => stock.id)).toEqual(before);
    expect(useStocksStore.getState().syncStatus).toBe("local");
    expect(persisted.get("account:user-a:snapshot")).toMatchObject({
      stocks: [expect.objectContaining({ id: "2330" })],
    });
    storeControl.saveError = null;
  });

  it("unions dirty local additions with an MCP add commit without opening a conflict", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    await useStocksStore.getState().addCategory("Local pending");
    const localNames = useStocksStore.getState().categories.map((category) => category.name);

    await useStocksStore.getState().applyMcpAccountCommit({
      userId: "user-a",
      epoch: 1,
      data: snapshot("2454"),
      updatedAt: "2026-10-11T08:00:00.000Z",
      operation: "add_stocks",
      mutation: { kind: "addStocks", categoryId: "group-a", stockIds: ["2454"] },
    });

    expect(useStocksStore.getState().categories.map((category) => category.name)).toEqual(expect.arrayContaining(localNames));
    expect(useStocksStore.getState().stocks.map((stock) => stock.id)).toEqual(["2330", "2454"]);
    expect(useStocksStore.getState().categories.find((category) => category.id === "group-a")?.stockIds).toEqual(["2454", "2330"]);
    expect(persisted.get("account:user-a:dirty")).toBe(true);
  });

  it("replays an MCP add without reviving locally removed members or reverting the local category name", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    const cloud: AccountSnapshot = {
      ...snapshot("2330"),
      stocks: [
        { id: "8299", name: "Phison", group: "TW", type: "stock" },
        { id: "2330", name: "TSMC", group: "TW", type: "stock" },
        { id: "2454", name: "MediaTek", group: "TW", type: "stock" },
      ],
      categories: [{ id: "group-a", name: "Cloud name", stockIds: ["8299", "2330", "2454"] }],
    };
    installDirtyProjection({
      ...cloud,
      stocks: cloud.stocks.filter((stock) => stock.id === "2330"),
      categories: [{ id: "group-a", name: "Local name", stockIds: ["2330"] }],
    });

    await useStocksStore.getState().applyMcpAccountCommit({
      userId: "user-a",
      epoch: 1,
      data: cloud,
      updatedAt: "2026-10-11T08:00:00.000Z",
      operation: "add_stock",
      mutation: { kind: "addStocks", categoryId: "group-a", stockIds: ["8299"] },
    });

    expect(useStocksStore.getState().categories).toEqual([
      expect.objectContaining({ id: "group-a", name: "Local name", stockIds: ["8299", "2330"] }),
    ]);
    expect(useStocksStore.getState().stocks.map((stock) => stock.id)).toEqual(["2330", "8299"]);
  });

  it("keeps local member order when an MCP add is a no-op for an existing stock", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    const cloud: AccountSnapshot = {
      ...snapshot("2330"),
      stocks: [
        { id: "2330", name: "TSMC", group: "TW", type: "stock" },
        { id: "2454", name: "MediaTek", group: "TW", type: "stock" },
      ],
      categories: [{ id: "group-a", name: "A", stockIds: ["2330", "2454"] }],
    };
    installDirtyProjection({
      ...cloud,
      categories: [{ id: "group-a", name: "A", stockIds: ["2454", "2330"] }],
    });

    await useStocksStore.getState().applyMcpAccountCommit({
      userId: "user-a",
      epoch: 1,
      data: cloud,
      updatedAt: "2026-10-11T08:00:00.000Z",
      operation: "add_stock",
      mutation: { kind: "addStocks", categoryId: "group-a", stockIds: ["2330"] },
    });

    expect(useStocksStore.getState().categories[0].stockIds).toEqual(["2454", "2330"]);
  });

  it("replays an MCP rename without removing locally added members from the same category", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    const cloud = snapshot("2330");
    cloud.categories[0].name = "MCP name";
    installDirtyProjection({
      ...cloud,
      stocks: [...cloud.stocks, { id: "2454", name: "MediaTek", group: "TW", type: "stock" }],
      categories: [{ id: "group-a", name: "Local name", stockIds: ["2454", "2330"] }],
    });

    await useStocksStore.getState().applyMcpAccountCommit({
      userId: "user-a",
      epoch: 1,
      data: cloud,
      updatedAt: "2026-10-11T08:00:00.000Z",
      operation: "rename_category",
      mutation: { kind: "renameCategory", categoryId: "group-a", name: "MCP name" },
    });

    expect(useStocksStore.getState().categories[0]).toEqual(expect.objectContaining({
      name: "MCP name",
      stockIds: ["2454", "2330"],
    }));
    expect(useStocksStore.getState().stocks.map((stock) => stock.id)).toEqual(["2330", "2454"]);
  });

  it("does not let an older upload acknowledge a newer MCP union while backup is off", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    let acknowledgeUpload!: (value: unknown) => void;
    const pendingUpload = new Promise((resolve) => { acknowledgeUpload = resolve; });
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_update_state") return pendingUpload;
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, schemaVersion: 1, data: snapshot("2330"), updatedAt: null });
    });

    await useStocksStore.getState().addCategory("Local pending");
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("account_update_state", expect.anything()));
    await useStocksStore.getState().setCloudBackupEnabled(false);
    await useStocksStore.getState().applyMcpAccountCommit({
      userId: "user-a",
      epoch: 1,
      data: snapshot("2454"),
      updatedAt: "2026-10-11T08:00:00.000Z",
      operation: "add_stock",
      mutation: { kind: "addStocks", categoryId: "group-a", stockIds: ["2454"] },
    });
    expect(persisted.get("account:user-a:dirty")).toBe(true);

    acknowledgeUpload({ userId: "user-a", epoch: 1, updatedAt: "2026-10-11T08:01:00.000Z" });
    await vi.waitFor(() => expect(useStocksStore.getState().cloudBackupLastSuccessAt).toBe("2026-10-11T08:01:00.000Z"));
    expect(persisted.get("account:user-a:dirty")).toBe(true);
  });

  it("preserves navigation changed while the MCP cache commit is pending", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    const base = multiCategorySnapshot();
    installDirtyProjection(base);
    let releaseSave!: () => void;
    const saveGate = new Promise<void>((resolve) => { releaseSave = resolve; });
    let signalSaveStarted!: () => void;
    const saveStarted = new Promise<void>((resolve) => { signalSaveStarted = resolve; });
    storeControl.saveGates = [saveGate, Promise.resolve(), Promise.resolve()];
    storeControl.saveStartedCallbacks = [signalSaveStarted];
    const cloud = {
      ...base,
      categories: base.categories.map((category) => category.id === "group-a"
        ? { ...category, name: "MCP name" }
        : category),
    };

    const commit = useStocksStore.getState().applyMcpAccountCommit({
      userId: "user-a",
      epoch: 1,
      data: cloud,
      updatedAt: "2026-10-11T08:00:00.000Z",
      operation: "rename_category",
      mutation: { kind: "renameCategory", categoryId: "group-a", name: "MCP name" },
    });
    await saveStarted;
    await useStocksStore.getState().setActiveCategory("group-b");
    await useStocksStore.getState().togglePinnedCategory("group-b");
    releaseSave();
    await commit;

    await vi.waitFor(() => expect(persisted.get("account:user-a:snapshot")).toMatchObject({
      activeCategoryId: "group-b",
      pinnedCategoryIds: ["group-b"],
    }));
    expect(useStocksStore.getState()).toMatchObject({
      activeCategoryId: "group-b",
      pinnedCategoryIds: ["group-b"],
    });
  });

  it("preserves navigation changed while an oversized MCP union disables backup", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    const oversized = oversizedSnapshot();
    installDirtyProjection({
      ...oversized,
      categories: oversized.categories.map((category) => category.id === "group-1"
        ? { ...category, name: "Local name" }
        : category),
    });
    useStocksStore.setState({ cloudBackupEnabled: true });
    let releaseMetadata!: () => void;
    const metadataGate = new Promise<void>((resolve) => { releaseMetadata = resolve; });
    let signalMetadataStarted!: () => void;
    const metadataStarted = new Promise<void>((resolve) => { signalMetadataStarted = resolve; });
    storeControl.saveGates = [Promise.resolve(), metadataGate, Promise.resolve()];
    storeControl.saveStartedCallbacks = [() => undefined, signalMetadataStarted];
    const cloud = {
      ...oversized,
      categories: oversized.categories.map((category) => category.id === "group-0"
        ? { ...category, name: "MCP name" }
        : category),
    };

    const commit = useStocksStore.getState().applyMcpAccountCommit({
      userId: "user-a",
      epoch: 1,
      data: cloud,
      updatedAt: "2026-10-11T08:00:00.000Z",
      operation: "rename_category",
      mutation: { kind: "renameCategory", categoryId: "group-0", name: "MCP name" },
    });
    await metadataStarted;
    await useStocksStore.getState().setActiveCategory("group-1");
    await useStocksStore.getState().togglePinnedCategory("group-1");
    releaseMetadata();
    await commit;

    await vi.waitFor(() => expect(persisted.get("account:user-a:snapshot")).toMatchObject({
      activeCategoryId: "group-1",
      pinnedCategoryIds: ["group-1"],
    }));
    expect(useStocksStore.getState()).toMatchObject({
      activeCategoryId: "group-1",
      pinnedCategoryIds: ["group-1"],
      cloudBackupEnabled: false,
    });
  });

  it("keeps both deletions when MCP deletes A while local state already deleted B", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    const base = multiCategorySnapshot();
    installDirtyProjection({
      ...base,
      stocks: base.stocks.filter((stock) => stock.id === "2330"),
      categories: base.categories.filter((category) => category.id === "group-a"),
    });
    const cloudAfterDeleteA: AccountSnapshot = {
      ...base,
      stocks: base.stocks.filter((stock) => stock.id !== "2330"),
      categories: base.categories.filter((category) => category.id === "group-b"),
      activeCategoryId: "group-b",
    };

    await useStocksStore.getState().applyMcpAccountCommit({
      userId: "user-a",
      epoch: 1,
      data: cloudAfterDeleteA,
      updatedAt: "2026-10-11T08:00:00.000Z",
      operation: "delete_category",
      mutation: { kind: "deleteCategory", categoryId: "group-a" },
    });

    expect(useStocksStore.getState().categories).toEqual([]);
    expect(useStocksStore.getState().stocks).toEqual([]);
    expect(persisted.get("account:user-a:dirty")).toBe(true);
  });

  it("lets an MCP delete win over a local rename of the same category", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    const base = multiCategorySnapshot();
    installDirtyProjection({
      ...base,
      categories: base.categories.map((category) => category.id === "group-a"
        ? { ...category, name: "Local rename" }
        : category),
    });
    const cloudAfterDeleteA: AccountSnapshot = {
      ...base,
      stocks: base.stocks.filter((stock) => stock.id !== "2330"),
      categories: base.categories.filter((category) => category.id === "group-b"),
      activeCategoryId: "group-b",
    };

    await useStocksStore.getState().applyMcpAccountCommit({
      userId: "user-a",
      epoch: 1,
      data: cloudAfterDeleteA,
      updatedAt: "2026-10-11T08:00:00.000Z",
      operation: "delete_category",
      mutation: { kind: "deleteCategory", categoryId: "group-a" },
    });

    expect(useStocksStore.getState().categories.map((category) => category.id)).toEqual(["group-b"]);
  });

  it("lets an MCP rename win on its target while preserving unrelated local categories", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    const base = multiCategorySnapshot();
    installDirtyProjection({
      ...base,
      categories: [
        { ...base.categories[0], name: "Local A" },
        { ...base.categories[1], name: "Local B" },
      ],
    });
    const cloudRenamed = {
      ...base,
      categories: base.categories.map((category) => category.id === "group-a"
        ? { ...category, name: "MCP A" }
        : category),
    };

    await useStocksStore.getState().applyMcpAccountCommit({
      userId: "user-a",
      epoch: 1,
      data: cloudRenamed,
      updatedAt: "2026-10-11T08:00:00.000Z",
      operation: "rename_category",
      mutation: { kind: "renameCategory", categoryId: "group-a", name: "MCP A" },
    });

    expect(useStocksStore.getState().categories).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "group-a", name: "MCP A" }),
      expect.objectContaining({ id: "group-b", name: "Local B" }),
    ]));
  });

  it("restores an MCP-renamed target deleted locally without replacing unrelated local state", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    const base = multiCategorySnapshot();
    installDirtyProjection({
      ...base,
      stocks: base.stocks.filter((stock) => stock.id !== "2330"),
      categories: [{ ...base.categories[1], name: "Local B" }],
      activeCategoryId: "group-b",
    });
    const cloudRenamed = {
      ...base,
      categories: base.categories.map((category) => category.id === "group-a"
        ? { ...category, name: "MCP A" }
        : category),
    };

    await useStocksStore.getState().applyMcpAccountCommit({
      userId: "user-a",
      epoch: 1,
      data: cloudRenamed,
      updatedAt: "2026-10-11T08:00:00.000Z",
      operation: "rename_category",
      mutation: { kind: "renameCategory", categoryId: "group-a", name: "MCP A" },
    });

    expect(useStocksStore.getState().categories).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "group-a", name: "MCP A", stockIds: ["2330"] }),
      expect.objectContaining({ id: "group-b", name: "Local B" }),
    ]));
    expect(useStocksStore.getState().stocks.map((stock) => stock.id)).toEqual(expect.arrayContaining(["2330", "2454"]));
  });

  it("applies MCP member replacement only to its target and preserves unrelated local membership", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    const base = multiCategorySnapshot();
    installDirtyProjection({
      ...base,
      categories: [
        { ...base.categories[0], stockIds: ["2330", "2454"] },
        { ...base.categories[1], name: "Local B" },
      ],
    });
    const cloudMembers = {
      ...base,
      stocks: base.stocks.filter((stock) => stock.id !== "2330"),
      categories: base.categories.map((category) => category.id === "group-a"
        ? { ...category, stockIds: ["8299"] }
        : category),
    };

    await useStocksStore.getState().applyMcpAccountCommit({
      userId: "user-a",
      epoch: 1,
      data: cloudMembers,
      updatedAt: "2026-10-11T08:00:00.000Z",
      operation: "set_category_members",
      mutation: { kind: "setMembers", categoryId: "group-a", stockIds: ["8299"] },
    });

    expect(useStocksStore.getState().categories).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "group-a", stockIds: ["8299"] }),
      expect.objectContaining({ id: "group-b", name: "Local B", stockIds: ["2454", "8299"] }),
    ]));
    expect(useStocksStore.getState().stocks.map((stock) => stock.id)).toEqual(expect.arrayContaining(["2454", "8299"]));
    expect(useStocksStore.getState().stocks.map((stock) => stock.id)).not.toContain("2330");
  });

  it("ignores an invalid MCP mutation descriptor without replacing clean local data", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);

    await useStocksStore.getState().applyMcpAccountCommit({
      userId: "user-a",
      epoch: 1,
      data: snapshot("2454"),
      updatedAt: "2026-10-11T08:00:00.000Z",
      operation: "add_stock",
      mutation: { kind: "addStocks", categoryId: "group-a", stockIds: "2454" } as unknown as import("../../account/types").McpAccountMutation,
    });

    expect(useStocksStore.getState().stocks.map((stock) => stock.id)).toEqual(["2330"]);
    expect(persisted.get("account:user-a:snapshot")).toMatchObject({
      stocks: [expect.objectContaining({ id: "2330" })],
    });
  });

  it("ignores a malformed MCP snapshot before normalization can empty local data", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);

    await useStocksStore.getState().applyMcpAccountCommit({
      userId: "user-a",
      epoch: 1,
      data: {} as AccountSnapshot,
      updatedAt: "2026-10-11T08:00:00.000Z",
      operation: "add_stock",
      mutation: { kind: "addStocks", categoryId: "group-a", stockIds: ["2454"] },
    });

    expect(useStocksStore.getState().stocks.map((stock) => stock.id)).toEqual(["2330"]);
    expect(persisted.get("account:user-a:snapshot")).toMatchObject({
      stocks: [expect.objectContaining({ id: "2330" })],
    });
  });

  it("defaults automatic upload off and never reads cloud during startup", async () => {
    persisted.delete("account:user-a:cloud-backup-enabled");
    await useStocksStore.getState().initializeAccount("user-a", 1);

    expect(useStocksStore.getState().cloudBackupEnabled).toBe(false);
    expect(invoke.mock.calls.some(([command]) => command === "account_get_state")).toBe(false);
  });

  it("enables automatic upload with a durable dirty outbox without reading cloud", async () => {
    persisted.set("account:user-a:cloud-backup-enabled", false);
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    let resolveUpload!: (value: unknown) => void;
    const pendingUpload = new Promise((resolve) => { resolveUpload = resolve; });
    invoke.mockClear();
    invoke.mockImplementation((command: string) => {
      if (command === "account_update_state") return pendingUpload;
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.reject(new Error(`unexpected invoke ${command}`));
    });

    await useStocksStore.getState().setCloudBackupEnabled(true);
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("account_update_state", expect.anything()));
    expect(invoke.mock.calls.some(([command]) => command === "account_get_state")).toBe(false);
    expect(useStocksStore.getState().cloudBackupEnabled).toBe(true);
    expect(persisted.get("account:user-a:cloud-backup-enabled")).toBe(true);
    expect(persisted.get("account:user-a:dirty")).toBe(true);

    resolveUpload({ userId: "user-a", epoch: 1, updatedAt: "2026-10-11T01:02:03.000Z" });
    await vi.waitFor(() => expect(persisted.get("account:user-a:dirty")).toBe(false));
  });

  it("keeps automatic upload enabled and dirty when the first upload fails", async () => {
    persisted.set("account:user-a:cloud-backup-enabled", false);
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    invoke.mockClear();
    invoke.mockImplementation((command: string) => {
      if (command === "account_update_state") return Promise.reject(new Error("CLOUD_UNAVAILABLE"));
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.reject(new Error(`unexpected invoke ${command}`));
    });

    await useStocksStore.getState().setCloudBackupEnabled(true);
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("account_update_state", expect.anything()));
    await vi.waitFor(() => expect(useStocksStore.getState().syncStatus).toBe("local"));
    expect(useStocksStore.getState().cloudBackupEnabled).toBe(true);
    expect(persisted.get("account:user-a:dirty")).toBe(true);
  });

  it("does not let an immediate OFF cancelation publish or upload a queued enable", async () => {
    persisted.set("account:user-a:cloud-backup-enabled", false);
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    let releaseEnableSave!: () => void;
    let signalEnableSave!: () => void;
    const enableSave = new Promise<void>((resolve) => { releaseEnableSave = resolve; });
    const enableSaveStarted = new Promise<void>((resolve) => { signalEnableSave = resolve; });
    storeControl.saveGate = enableSave;
    storeControl.saveStarted = signalEnableSave;
    invoke.mockClear();

    const enable = useStocksStore.getState().setCloudBackupEnabled(true);
    await enableSaveStarted;
    // Enabling is published only after the dirty cache and opt-in metadata
    // are durable, so another mutation cannot upload under a transient flag.
    expect(useStocksStore.getState().cloudBackupEnabled).toBe(false);

    const disable = useStocksStore.getState().setCloudBackupEnabled(false);
    expect(useStocksStore.getState().cloudBackupEnabled).toBe(false);
    releaseEnableSave();
    await expect(enable).resolves.toBeUndefined();
    await expect(disable).resolves.toBeUndefined();

    expect(useStocksStore.getState().cloudBackupEnabled).toBe(false);
    expect(persisted.get("account:user-a:cloud-backup-enabled")).toBe(false);
    expect(persisted.get("account:user-a:dirty")).toBe(true);
    expect(invoke.mock.calls.some(([command]) => command === "account_update_state")).toBe(false);
  });

  it("restores cloud tracked stocks while preserving local preferences and the upload toggle", async () => {
    persisted.set("account:user-a:cloud-backup-enabled", false);
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    useStocksStore.setState({
      pinnedCategoryIds: ["group-a"],
      recentCategoryIds: [],
      indicatorSettings: { ...settings, ma20: 55 },
    });
    const cloud = snapshot("2317");
    cloud.indicatorSettings = { ...settings, ma20: 99 };
    invoke.mockClear();
    invoke.mockImplementation(async (command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_get_state") return { userId: "user-a", epoch: args.expectedEpoch, schemaVersion: 1, data: cloud, updatedAt: "2026-10-11T04:00:00.000Z" };
      if (command === "account_get_indicator_settings") return null;
      if (command === "legacy_settings_status") return { present: false, disposition: null, path: "" };
      throw new Error(`unexpected invoke ${command}`);
    });

    await expect(useStocksStore.getState().restoreCloudBackup()).resolves.toBe("restored");

    expect(invoke).toHaveBeenCalledWith("account_get_state", { expectedEpoch: 1 });
    expect(useStocksStore.getState()).toMatchObject({
      cloudBackupEnabled: false,
      pinnedCategoryIds: ["group-a"],
      cloudBackupLastSuccessAt: "2026-10-11T04:00:00.000Z",
      cloudDataChangedAt: "2026-10-11T04:00:00.000Z",
    });
    expect(useStocksStore.getState().stocks.map((stock) => stock.id)).toEqual(["2317"]);
    expect(useStocksStore.getState().indicatorSettings.ma20).toBe(55);
    expect(persisted.get("account:user-a:dirty")).toBe(false);
  });

  it("orders manual restore after an in-flight upload", async () => {
    let resolveUpload!: (value: unknown) => void;
    const pendingUpload = new Promise((resolve) => { resolveUpload = resolve; });
    const order: string[] = [];
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    invoke.mockClear();
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_update_state") {
        order.push(`write:${args.expectedEpoch}`);
        return pendingUpload;
      }
      if (command === "account_get_state") {
        order.push(`read:${args.expectedEpoch}`);
        return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, schemaVersion: 1, data: snapshot("2317"), updatedAt: "2026-10-11T04:00:00.000Z" });
      }
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.reject(new Error(`unexpected invoke ${command}`));
    });

    await useStocksStore.getState().addCategory("Before restore");
    await vi.waitFor(() => expect(order).toEqual(["write:1"]));
    const restore = useStocksStore.getState().restoreCloudBackup();
    await Promise.resolve();
    expect(order).toEqual(["write:1"]);

    resolveUpload({ userId: "user-a", epoch: 1, updatedAt: "2026-10-11T03:00:00.000Z" });
    await expect(restore).resolves.toBe("restored");
    expect(order).toEqual(["write:1", "read:1"]);
    expect(useStocksStore.getState().stocks.map((stock) => stock.id)).toEqual(["2317"]);
  });

  it("rebases local-only preferences changed while the restore save is pending", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    await vi.waitFor(() => expect(useStocksStore.getState().indicatorSettings.ma20).toBe(21));
    let releaseFirstSave!: () => void;
    let signalFirstSave!: () => void;
    let releaseCorrectedSave!: () => void;
    let signalCorrectedSave!: () => void;
    const firstSave = new Promise<void>((resolve) => { releaseFirstSave = resolve; });
    const firstSaveStarted = new Promise<void>((resolve) => { signalFirstSave = resolve; });
    const correctedSave = new Promise<void>((resolve) => { releaseCorrectedSave = resolve; });
    const correctedSaveStarted = new Promise<void>((resolve) => { signalCorrectedSave = resolve; });
    storeControl.saveGates = [firstSave, correctedSave];
    storeControl.saveStartedCallbacks = [signalFirstSave, signalCorrectedSave];
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_get_state") return Promise.resolve({
        userId: "user-a",
        epoch: 1,
        schemaVersion: 1,
        data: snapshot("2317"),
        updatedAt: "2026-10-11T04:00:00.000Z",
      });
      if (command === "account_update_indicator_settings") return Promise.resolve({ ...settings, ma20: 77 });
      if (command === "account_get_indicator_settings") return Promise.resolve({ ...settings, ma20: 21 });
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      if (command === "account_update_state") return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, updatedAt: null });
      return Promise.reject(new Error(`unexpected invoke ${command}`));
    });

    const restore = useStocksStore.getState().restoreCloudBackup();
    await firstSaveStarted;
    await useStocksStore.getState().togglePinnedCategory("group-a");
    await useStocksStore.getState().updateIndicatorSetting("ma20", 77);
    releaseFirstSave();
    await correctedSaveStarted;
    // Change the same local-only preferences again while the correction save
    // is pending. Final publish must re-read this newest state synchronously.
    await useStocksStore.getState().togglePinnedCategory("group-a");
    await useStocksStore.getState().updateIndicatorSetting("ma20", 88);
    releaseCorrectedSave();
    await expect(restore).resolves.toBe("restored");

    expect(useStocksStore.getState().pinnedCategoryIds).toEqual([]);
    expect(useStocksStore.getState().indicatorSettings.ma20).toBe(88);
    await vi.waitFor(() => expect(persisted.get("account:user-a:snapshot")).toMatchObject({
      pinnedCategoryIds: [],
    }));
  });

  it("serializes a local mutation behind the restore cache commit", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    let releaseRestoreSave!: () => void;
    let signalRestoreSave!: () => void;
    const restoreSave = new Promise<void>((resolve) => { releaseRestoreSave = resolve; });
    const restoreSaveStarted = new Promise<void>((resolve) => { signalRestoreSave = resolve; });
    storeControl.saveGates = [restoreSave];
    storeControl.saveStartedCallbacks = [signalRestoreSave];
    invoke.mockResolvedValue({
      userId: "user-a",
      epoch: 1,
      schemaVersion: 1,
      data: snapshot("2317"),
      updatedAt: "2026-10-11T04:00:00.000Z",
    });

    const restore = useStocksStore.getState().restoreCloudBackup();
    await restoreSaveStarted;
    const localMutation = useStocksStore.getState().addCategory("After restore");
    await Promise.resolve();
    expect(useStocksStore.getState().categories.some((category) => category.name === "After restore")).toBe(false);

    releaseRestoreSave();
    await expect(restore).resolves.toBe("restored");
    await expect(localMutation).resolves.toBeUndefined();

    expect(useStocksStore.getState().stocks.map((stock) => stock.id)).toEqual(["2317"]);
    expect(useStocksStore.getState().categories.some((category) => category.name === "After restore")).toBe(true);
    expect(persisted.get("account:user-a:snapshot")).toMatchObject({
      stocks: [expect.objectContaining({ id: "2317" })],
      categories: expect.arrayContaining([expect.objectContaining({ name: "After restore" })]),
    });
  });

  it("does not cancel a pending restore when automatic upload is turned off", async () => {
    persisted.set("account:user-a:cloud-backup-enabled", false);
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    let resolveRestore!: (value: unknown) => void;
    const pendingRestore = new Promise((resolve) => { resolveRestore = resolve; });
    invoke.mockClear();
    invoke.mockImplementation((command: string) => {
      if (command === "account_get_state") return pendingRestore;
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      if (command === "account_update_state") throw new Error("restore must not upload");
      return Promise.reject(new Error(`unexpected invoke ${command}`));
    });

    const restore = useStocksStore.getState().restoreCloudBackup();
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("account_get_state", { expectedEpoch: 1 }));
    await useStocksStore.getState().setCloudBackupEnabled(false);
    resolveRestore({ userId: "user-a", epoch: 1, schemaVersion: 1, data: snapshot("2317"), updatedAt: "2026-10-11T04:00:00.000Z" });

    await expect(restore).resolves.toBe("restored");
    expect(useStocksStore.getState().cloudBackupEnabled).toBe(false);
    expect(useStocksStore.getState().stocks.map((stock) => stock.id)).toEqual(["2317"]);
    expect(invoke.mock.calls.some(([command]) => command === "account_update_state")).toBe(false);
  });

  it("does not cancel a pending restore when automatic upload is turned on", async () => {
    persisted.set("account:user-a:cloud-backup-enabled", false);
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    let resolveRestore!: (value: unknown) => void;
    const pendingRestore = new Promise((resolve) => { resolveRestore = resolve; });
    invoke.mockClear();
    invoke.mockImplementation((command: string) => {
      if (command === "account_get_state") return pendingRestore;
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      if (command === "account_update_state") throw new Error("restore should make the cloud snapshot authoritative");
      return Promise.reject(new Error(`unexpected invoke ${command}`));
    });

    const restore = useStocksStore.getState().restoreCloudBackup();
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("account_get_state", { expectedEpoch: 1 }));
    await useStocksStore.getState().setCloudBackupEnabled(true);
    resolveRestore({ userId: "user-a", epoch: 1, schemaVersion: 1, data: snapshot("2317"), updatedAt: "2026-10-11T04:00:00.000Z" });

    await expect(restore).resolves.toBe("restored");
    expect(useStocksStore.getState().cloudBackupEnabled).toBe(true);
    expect(useStocksStore.getState().stocks.map((stock) => stock.id)).toEqual(["2317"]);
    expect(invoke.mock.calls.some(([command]) => command === "account_update_state")).toBe(false);
  });

  it("returns not_found without changing local state when no cloud backup exists", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    const before = useStocksStore.getState().stocks.map((stock) => stock.id);
    invoke.mockClear();
    invoke.mockResolvedValue({ userId: "user-a", epoch: 1, schemaVersion: 1, data: null, updatedAt: null });

    await expect(useStocksStore.getState().restoreCloudBackup()).resolves.toBe("not_found");
    expect(useStocksStore.getState().stocks.map((stock) => stock.id)).toEqual(before);
    expect(persisted.get("account:user-a:dirty")).not.toBe(false);
  });

  it("treats the native empty snapshot with no timestamp as not_found", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    const before = useStocksStore.getState().stocks.map((stock) => stock.id);
    const beforeCache = persisted.get("account:user-a:snapshot");
    invoke.mockResolvedValue({ userId: "user-a", epoch: 1, schemaVersion: 1, data: emptyAccountSnapshot(), updatedAt: null });

    await expect(useStocksStore.getState().restoreCloudBackup()).resolves.toBe("not_found");
    expect(useStocksStore.getState().stocks.map((stock) => stock.id)).toEqual(before);
    expect(persisted.get("account:user-a:snapshot")).toEqual(beforeCache);
  });

  it("restores a genuinely saved empty cloud watchlist when it has a timestamp", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    invoke.mockResolvedValue({
      userId: "user-a",
      epoch: 1,
      schemaVersion: 1,
      data: emptyAccountSnapshot(),
      updatedAt: "2026-10-11T04:00:00.000Z",
    });

    await expect(useStocksStore.getState().restoreCloudBackup()).resolves.toBe("restored");
    expect(useStocksStore.getState().stocks).toEqual([]);
    expect(useStocksStore.getState().categories).toEqual([]);
    expect(useStocksStore.getState().cloudBackupLastSuccessAt).toBe("2026-10-11T04:00:00.000Z");
    expect(persisted.get("account:user-a:dirty")).toBe(false);
  });

  it("rejects malformed cloud restore data without changing the local projection", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    const before = useStocksStore.getState().stocks.map((stock) => stock.id);
    invoke.mockResolvedValue({ userId: "user-a", epoch: 1, schemaVersion: 1, data: {}, updatedAt: "2026-10-11T04:00:00.000Z" });

    await expect(useStocksStore.getState().restoreCloudBackup()).rejects.toThrow("INVALID_CLOUD_BACKUP");
    expect(useStocksStore.getState().stocks.map((stock) => stock.id)).toEqual(before);
  });

  it("does not publish a delayed restore response after an account switch", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    let resolveRestore!: (value: unknown) => void;
    const pendingRestore = new Promise((resolve) => { resolveRestore = resolve; });
    invoke.mockImplementation((command: string) => {
      if (command === "account_get_state") return pendingRestore;
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.reject(new Error(`unexpected invoke ${command}`));
    });

    const restore = useStocksStore.getState().restoreCloudBackup();
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("account_get_state", { expectedEpoch: 1 }));
    await useStocksStore.getState().clearAccountProjection();
    await useStocksStore.getState().hydrateAccount("user-b", 2);
    resolveRestore({ userId: "user-a", epoch: 1, schemaVersion: 1, data: snapshot("2317"), updatedAt: "2026-10-11T04:00:00.000Z" });

    await expect(restore).rejects.toThrow("SESSION_CHANGED");
    expect(useStocksStore.getState().accountUserId).toBe("user-b");
    expect(useStocksStore.getState().stocks).toEqual([]);
  });

  it("performs no cloud read or write when the stored backup switch is off", async () => {
    persisted.set("account:user-a:cloud-backup-enabled", false);

    await useStocksStore.getState().initializeAccount("user-a", 1);

    expect(useStocksStore.getState().cloudBackupEnabled).toBe(false);
    expect(invoke.mock.calls.some(([command]) => command === "account_get_state")).toBe(false);
    expect(invoke.mock.calls.some(([command]) => command === "account_update_state")).toBe(false);
  });

  it("updates the cloud-data timestamp only for cloud-represented mutations", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-11T05:00:00.000Z"));
    persisted.set("account:user-a:cloud-backup-enabled", false);
    persisted.set("account:user-a:cloud-data-changed-at", "2026-10-10T01:00:00.000Z");
    try {
      await useStocksStore.getState().hydrateAccount("user-a", 1);
      await useStocksStore.getState().togglePinnedCategory("group-a");
      expect(useStocksStore.getState().cloudDataChangedAt).toBe("2026-10-10T01:00:00.000Z");
      expect(persisted.get("account:user-a:cloud-data-changed-at")).toBe("2026-10-10T01:00:00.000Z");

      await useStocksStore.getState().addCategory("Timestamped");
      expect(useStocksStore.getState().cloudDataChangedAt).toBe("2026-10-11T05:00:00.000Z");
      expect(persisted.get("account:user-a:cloud-data-changed-at")).toBe("2026-10-11T05:00:00.000Z");
    } finally {
      vi.useRealTimers();
    }
  });

  it("coalesces edits made during an upload into one bounded follow-up", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-11T00:00:00.000Z"));
    let resolveFirst!: (value: unknown) => void;
    const firstWrite = new Promise((resolve) => { resolveFirst = resolve; });
    let writes = 0;
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_update_state") {
        writes += 1;
        return writes === 1 ? firstWrite : Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, updatedAt: null });
      }
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, schemaVersion: 1, data: snapshot("2330"), updatedAt: null });
    });
    try {
      await useStocksStore.getState().hydrateAccount("user-a", 1);
      await useStocksStore.getState().addCategory("First");
      await vi.advanceTimersByTimeAsync(0);
      expect(writes).toBe(1);

      await useStocksStore.getState().addCategory("Second");
      await useStocksStore.getState().addCategory("Third");
      expect(writes).toBe(1);

      resolveFirst({ userId: "user-a", epoch: 1, updatedAt: null });
      await vi.waitFor(() => expect(writes).toBe(2));
      const second = invoke.mock.calls.filter(([command]) => command === "account_update_state")[1]?.[1] as { data: AccountSnapshot };
      expect(second.data.categories.some((category) => category.name === "Third")).toBe(true);
      await vi.advanceTimersByTimeAsync(29_999);
      expect(writes).toBe(2);
      await vi.advanceTimersByTimeAsync(1);
      expect(writes).toBe(2);
      await useStocksStore.getState().addCategory("Fourth");
      await vi.advanceTimersByTimeAsync(0);
      expect(writes).toBe(3);
      const third = invoke.mock.calls.filter(([command]) => command === "account_update_state")[2]?.[1] as { data: AccountSnapshot };
      expect(third.data.categories.some((category) => category.name === "Fourth")).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the 30-second gate across an epoch refresh for the same account", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-11T00:00:00.000Z"));
    let writes = 0;
    invoke.mockImplementation(async (command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_update_state") {
        writes += 1;
        return { userId: "user-a", epoch: args.expectedEpoch, updatedAt: null };
      }
      if (command === "account_get_indicator_settings") return null;
      if (command === "legacy_settings_status") return { present: false, disposition: null, path: "" };
      return { userId: "user-a", epoch: args.expectedEpoch, schemaVersion: 1, data: snapshot("2330"), updatedAt: null };
    });
    try {
      await useStocksStore.getState().hydrateAccount("user-a", 1);
      await useStocksStore.getState().addCategory("Epoch one");
      await vi.advanceTimersByTimeAsync(0);
      expect(writes).toBe(1);
      await vi.waitFor(() => expect(persisted.get("account:user-a:dirty")).toBe(false));

      useStocksStore.setState({ accountEpoch: 2 });
      await useStocksStore.getState().addCategory("Epoch two");
      await vi.advanceTimersByTimeAsync(0);
      expect(writes).toBe(1);
      expect(persisted.get("account:user-a:dirty")).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("retries a dirty current epoch after an older epoch upload settles", async () => {
    let resolveOldUpload!: (value: unknown) => void;
    const oldUpload = new Promise((resolve) => { resolveOldUpload = resolve; });
    let writes = 0;
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_update_state") {
        writes += 1;
        return writes === 1
          ? oldUpload
          : Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, updatedAt: "2026-10-11T00:00:02.000Z" });
      }
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.reject(new Error(`unexpected invoke ${command}`));
    });

    await useStocksStore.getState().hydrateAccount("user-a", 1);
    await useStocksStore.getState().addCategory("Epoch one");
    await vi.waitFor(() => expect(writes).toBe(1));

    await useStocksStore.getState().clearAccountProjection();
    await useStocksStore.getState().primeAccountFromCache("user-a", 2);
    await useStocksStore.getState().hydrateAccount("user-a", 2);
    expect(useStocksStore.getState()).toMatchObject({ accountUserId: "user-a", accountEpoch: 2, syncStatus: "loading" });
    expect(writes).toBe(1);

    resolveOldUpload({ userId: "user-a", epoch: 1, updatedAt: "2026-10-11T00:00:01.000Z" });
    await vi.waitFor(() => expect(writes).toBe(2));
    const retry = invoke.mock.calls.filter(([command]) => command === "account_update_state")[1]?.[1] as { expectedEpoch: number };
    expect(retry.expectedEpoch).toBe(2);
    await vi.waitFor(() => expect(persisted.get("account:user-a:dirty")).toBe(false));
    expect(useStocksStore.getState().syncStatus).toBe("synced");
  });

  it("does not let an older upload acknowledge a newer edit made while backup is off", async () => {
    let resolveUpload!: (value: unknown) => void;
    const pendingUpload = new Promise((resolve) => { resolveUpload = resolve; });
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_update_state") return pendingUpload;
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, schemaVersion: 1, data: snapshot("2330"), updatedAt: null });
    });

    await useStocksStore.getState().hydrateAccount("user-a", 1);
    await useStocksStore.getState().addCategory("Sent snapshot");
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("account_update_state", expect.anything()));
    await useStocksStore.getState().setCloudBackupEnabled(false);
    await useStocksStore.getState().addCategory("Local after off");
    expect(persisted.get("account:user-a:dirty")).toBe(true);

    resolveUpload({ userId: "user-a", epoch: 1, updatedAt: "2026-10-11T00:00:10.000Z" });
    await vi.waitFor(() => expect(useStocksStore.getState().cloudBackupLastSuccessAt).toBe("2026-10-11T00:00:10.000Z"));
    expect(persisted.get("account:user-a:dirty")).toBe(true);
  });

  it("queues a fresh upload for same-epoch OFF then ON without dropping it", async () => {
    let resolveFirst!: (value: unknown) => void;
    let resolveSecond!: (value: unknown) => void;
    const firstUpload = new Promise((resolve) => { resolveFirst = resolve; });
    const secondUpload = new Promise((resolve) => { resolveSecond = resolve; });
    let writes = 0;
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_update_state") {
        writes += 1;
        return writes === 1
          ? firstUpload
          : secondUpload;
      }
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, schemaVersion: 1, data: snapshot("2330"), updatedAt: null });
    });

    await useStocksStore.getState().hydrateAccount("user-a", 1);
    await useStocksStore.getState().addCategory("Upload A");
    await vi.waitFor(() => expect(writes).toBe(1));
    await useStocksStore.getState().setCloudBackupEnabled(false);
    const enable = useStocksStore.getState().setCloudBackupEnabled(true);
    await enable;
    expect(writes).toBe(1);
    expect(useStocksStore.getState().cloudBackupEnabled).toBe(true);
    expect(persisted.get("account:user-a:dirty")).toBe(true);

    resolveFirst({ userId: "user-a", epoch: 1, updatedAt: "2026-10-11T05:00:01.000Z" });
    await vi.waitFor(() => expect(writes).toBe(2));
    resolveSecond({ userId: "user-a", epoch: 1, updatedAt: "2026-10-11T05:00:02.000Z" });
    await vi.waitFor(() => expect(persisted.get("account:user-a:dirty")).toBe(false));
    expect(writes).toBe(2);
    expect(useStocksStore.getState().cloudBackupEnabled).toBe(true);
  });

  it("rolls back an optimistic enable when the durable cache save fails", async () => {
    persisted.set("account:user-a:cloud-backup-enabled", false);
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    const beforeDirty = persisted.get("account:user-a:dirty");
    storeControl.saveError = new Error("DISK_FULL");
    invoke.mockClear();

    await expect(useStocksStore.getState().setCloudBackupEnabled(true)).rejects.toThrow("DISK_FULL");
    expect(useStocksStore.getState().cloudBackupEnabled).toBe(false);
    expect(useStocksStore.getState().syncError).toBe("CLOUD_BACKUP_METADATA_FAILED");
    expect(persisted.get("account:user-a:dirty")).toBe(beforeDirty);
    expect(persisted.get("account:user-a:cloud-backup-enabled")).toBe(false);
    expect(invoke.mock.calls.some(([command]) => command === "account_update_state")).toBe(false);
  });

  it("keeps enable off and dirty when metadata persistence fails", async () => {
    persisted.set("account:user-a:cloud-backup-enabled", false);
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    storeControl.saveStartedCallbacks = [
      () => undefined,
      () => { storeControl.saveError = new Error("METADATA_DISK_FULL"); },
    ];
    invoke.mockClear();

    await expect(useStocksStore.getState().setCloudBackupEnabled(true)).rejects.toThrow("METADATA_DISK_FULL");
    expect(useStocksStore.getState().cloudBackupEnabled).toBe(false);
    expect(useStocksStore.getState().syncError).toBe("CLOUD_BACKUP_METADATA_FAILED");
    expect(persisted.get("account:user-a:cloud-backup-enabled")).toBe(false);
    expect(persisted.get("account:user-a:dirty")).toBe(true);
    expect(invoke.mock.calls.some(([command]) => command === "account_update_state")).toBe(false);
  });

  it("does not upload a queued local mutation before enable metadata is durable", async () => {
    persisted.set("account:user-a:cloud-backup-enabled", false);
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    let releaseLocalSave!: () => void;
    let signalLocalSave!: () => void;
    const localSave = new Promise<void>((resolve) => { releaseLocalSave = resolve; });
    const localSaveStarted = new Promise<void>((resolve) => { signalLocalSave = resolve; });
    storeControl.saveGates = [localSave, Promise.resolve(), Promise.resolve()];
    storeControl.saveStartedCallbacks = [
      signalLocalSave,
      () => undefined,
      () => { storeControl.saveError = new Error("METADATA_DISK_FULL"); },
    ];
    invoke.mockClear();

    const localMutation = useStocksStore.getState().addCategory("Before opt in");
    await localSaveStarted;
    const enable = useStocksStore.getState().setCloudBackupEnabled(true);
    expect(useStocksStore.getState().cloudBackupEnabled).toBe(false);
    releaseLocalSave();
    await expect(localMutation).resolves.toBeUndefined();
    await expect(enable).rejects.toThrow("METADATA_DISK_FULL");

    expect(useStocksStore.getState().cloudBackupEnabled).toBe(false);
    expect(persisted.get("account:user-a:cloud-backup-enabled")).toBe(false);
    expect(invoke.mock.calls.some(([command]) => command === "account_update_state")).toBe(false);
  });

  it("rolls back a failed OFF to the durable state at execution time", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    let releaseEarlierSave!: () => void;
    let signalEarlierSave!: () => void;
    const earlierSave = new Promise<void>((resolve) => { releaseEarlierSave = resolve; });
    const earlierSaveStarted = new Promise<void>((resolve) => { signalEarlierSave = resolve; });
    storeControl.saveGates = [earlierSave, Promise.resolve()];
    storeControl.saveStartedCallbacks = [
      signalEarlierSave,
      () => { storeControl.saveError = new Error("METADATA_DISK_FULL"); },
    ];

    const earlierMutation = useStocksStore.getState().addCategory("Earlier");
    await earlierSaveStarted;
    const disable = useStocksStore.getState().setCloudBackupEnabled(false);
    // Model the durable auto-disable performed by the earlier queued work.
    persisted.set("account:user-a:cloud-backup-enabled", false);
    releaseEarlierSave();
    await expect(earlierMutation).resolves.toBeUndefined();
    await expect(disable).rejects.toThrow("METADATA_DISK_FULL");

    expect(useStocksStore.getState().cloudBackupEnabled).toBe(false);
    expect(persisted.get("account:user-a:cloud-backup-enabled")).toBe(false);
  });

  it("restores the enabled toggle when disabling metadata persistence fails", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    storeControl.saveError = new Error("METADATA_DISK_FULL");
    invoke.mockClear();

    await expect(useStocksStore.getState().setCloudBackupEnabled(false)).rejects.toThrow("METADATA_DISK_FULL");
    expect(useStocksStore.getState().cloudBackupEnabled).toBe(true);
    expect(useStocksStore.getState().syncError).toBe("CLOUD_BACKUP_METADATA_FAILED");
    expect(persisted.get("account:user-a:cloud-backup-enabled")).toBe(true);
    expect(invoke.mock.calls.some(([command]) => command === "account_update_state")).toBe(false);
  });

  it("lets a successful in-flight upload acknowledge after OFF persistence fails", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    let resolveUpload!: (value: unknown) => void;
    const pendingUpload = new Promise((resolve) => { resolveUpload = resolve; });
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_update_state") return pendingUpload;
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, schemaVersion: 1, data: snapshot("2330"), updatedAt: null });
    });

    await useStocksStore.getState().addCategory("Uploading");
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("account_update_state", expect.anything()));
    storeControl.saveError = new Error("METADATA_DISK_FULL");
    await expect(useStocksStore.getState().setCloudBackupEnabled(false)).rejects.toThrow("METADATA_DISK_FULL");
    expect(useStocksStore.getState().cloudBackupEnabled).toBe(true);
    expect(persisted.get("account:user-a:dirty")).toBe(true);

    storeControl.saveError = null;
    resolveUpload({ userId: "user-a", epoch: 1, updatedAt: "2026-10-11T06:00:00.000Z" });
    await vi.waitFor(() => expect(persisted.get("account:user-a:dirty")).toBe(false));
    expect(useStocksStore.getState().cloudBackupEnabled).toBe(true);
  });

  it("cancels a cooldown backup when the account disables cloud backup", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-11T00:00:00.000Z"));
    let writes = 0;
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_update_state") {
        writes += 1;
        return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, updatedAt: null });
      }
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, schemaVersion: 1, data: snapshot("2330"), updatedAt: null });
    });
    try {
      await useStocksStore.getState().hydrateAccount("user-a", 1);
      await useStocksStore.getState().addCategory("First");
      await vi.advanceTimersByTimeAsync(0);
      expect(writes).toBe(1);
      await useStocksStore.getState().addCategory("Queued while cooling down");
      await useStocksStore.getState().setCloudBackupEnabled(false);
      await vi.advanceTimersByTimeAsync(30_000);
      expect(writes).toBe(1);
      expect(useStocksStore.getState().cloudBackupEnabled).toBe(false);
      expect(persisted.get("account:user-a:dirty")).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects an oversized enable attempt without changing local data or calling cloud", async () => {
    const oversized = oversizedSnapshot();
    persisted.delete("account:user-a:cloud-backup-enabled");
    useStocksStore.setState({
      ...oversized,
      menu: oversized.stocks,
      accountUserId: "user-a",
      accountEpoch: 1,
      cloudBackupEnabled: false,
      hydrated: true,
    });
    invoke.mockClear();

    await expect(useStocksStore.getState().setCloudBackupEnabled(true)).rejects.toMatchObject({
      code: "BACKUP_SIZE_LIMIT_EXCEEDED",
    });

    expect(useStocksStore.getState().cloudBackupEnabled).toBe(false);
    expect(invoke.mock.calls.some(([command]) => command === "account_update_state")).toBe(false);
    expect(persisted.get("account:user-a:cloud-backup-enabled")).toBeUndefined();
    expect(CLOUD_BACKUP_MAX_BYTES).toBe(45_000);
  });

  it("does not republish an oversized A mutation after switching to B during the OFF save", async () => {
    const oversized = oversizedSnapshot();
    let releaseMetadata!: () => void;
    let signalMetadataStarted!: () => void;
    const metadataGate = new Promise<void>((resolve) => { releaseMetadata = resolve; });
    const metadataStarted = new Promise<void>((resolve) => { signalMetadataStarted = resolve; });
    storeControl.saveGates = [Promise.resolve(), metadataGate];
    storeControl.saveStartedCallbacks = [() => undefined, signalMetadataStarted];
    useStocksStore.setState({
      ...oversized,
      menu: oversized.stocks,
      accountUserId: "user-a",
      accountEpoch: 1,
      cloudBackupEnabled: true,
      hydrated: true,
    });

    const mutation = useStocksStore.getState().removeCategory("group-0");
    await metadataStarted;
    await useStocksStore.getState().clearAccountProjection();
    await useStocksStore.getState().primeAccountFromCache("user-b", 2);
    releaseMetadata();
    await mutation;

    expect(useStocksStore.getState().accountUserId).toBe("user-b");
    expect(useStocksStore.getState().accountEpoch).toBe(2);
    expect(useStocksStore.getState().categories).toEqual([]);
  });

  it("preserves a failed dirty edit and later pin across restart without pulling stale cloud data", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_update_state") return Promise.reject(new Error("CLOUD_UNAVAILABLE"));
      if (command === "account_get_state") return Promise.reject(new Error("STALE_PULL_MUST_NOT_RUN"));
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, updatedAt: null });
    });

    await useStocksStore.getState().addCategory("Unsynced edit");
    await vi.waitFor(() => expect(useStocksStore.getState().syncStatus).toBe("local"));
    await useStocksStore.getState().togglePinnedCategory("group-a");
    await vi.waitFor(() => expect(persisted.get("account:user-a:snapshot")).toMatchObject({
      pinnedCategoryIds: ["group-a"],
      categories: expect.arrayContaining([expect.objectContaining({ name: "Unsynced edit" })]),
    }));
    expect(persisted.get("account:user-a:dirty")).toBe(true);

    await useStocksStore.getState().clearAccountProjection();
    invoke.mockClear();
    await useStocksStore.getState().hydrateAccount("user-a", 1);

    expect(invoke.mock.calls.some(([command]) => command === "account_get_state")).toBe(false);
    expect(useStocksStore.getState()).toMatchObject({
      pinnedCategoryIds: ["group-a"],
      categories: expect.arrayContaining([expect.objectContaining({ name: "Unsynced edit" })]),
    });
  });

  it("keeps dirty cached navigation while reconciling account-local indicators", async () => {
    const { indicatorSettings: _indicatorSettings, ...cached } = snapshot("2330");
    persisted.set("account:user-a:snapshot", { ...cached, pinnedCategoryIds: ["group-a"], recentCategoryIds: [] });
    persisted.set("account:user-a:dirty", true);
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_get_state") return Promise.reject(new Error("DIRTY_CACHE_MUST_NOT_PULL"));
      if (command === "account_update_state") return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, updatedAt: null });
      if (command === "account_get_indicator_settings") return Promise.resolve({ ...settings, ma20: 21 });
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.resolve(null);
    });

    await useStocksStore.getState().hydrateAccount("user-a", 1);

    expect(invoke.mock.calls.some(([command]) => command === "account_get_state")).toBe(false);
    expect(useStocksStore.getState()).toMatchObject({ activeCategoryId: "group-a", pinnedCategoryIds: ["group-a"] });
    await vi.waitFor(() => expect(useStocksStore.getState().indicatorSettings.ma20).toBe(21));
    expect(useStocksStore.getState().pinnedCategoryIds).toEqual(["group-a"]);
  });

  it("finishes hydration locally when a dirty marker has no cache snapshot", async () => {
    persisted.delete("account:user-a:snapshot");
    persisted.set("account:user-a:dirty", true);
    invoke.mockClear();

    await useStocksStore.getState().initializeAccount("user-a", 1);

    expect(useStocksStore.getState()).toMatchObject({
      accountUserId: "user-a",
      accountEpoch: 1,
      hydrated: true,
      syncStatus: "local",
      syncError: null,
    });
    expect(persisted.get("account:user-a:dirty")).toBe(true);
    expect(invoke.mock.calls.some(([command]) => command === "account_get_state" || command === "account_update_state")).toBe(false);
  });

  it("repairs dirty cached orphans before publishing or retrying the cloud snapshot", async () => {
    let acknowledgeCloud!: (value: unknown) => void;
    const pendingCloud = new Promise((resolve) => { acknowledgeCloud = resolve; });
    const cached = snapshot("2330");
    cached.stocks.push({ id: "9999", name: "Orphan", group: "TW", type: "stock" });
    const { indicatorSettings: _indicatorSettings, ...stored } = cached;
    persisted.set("account:user-a:snapshot", stored);
    persisted.set("account:user-a:dirty", true);
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number; data?: AccountSnapshot }) => {
      if (command === "account_get_state") return Promise.reject(new Error("DIRTY_CACHE_MUST_NOT_PULL"));
      if (command === "account_update_state") return pendingCloud;
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, updatedAt: null });
    });

    await useStocksStore.getState().initializeAccount("user-a", 1);

    expect(useStocksStore.getState().stocks.map((stock) => stock.id)).toEqual(["2330"]);
    expect((persisted.get("account:user-a:snapshot") as AccountSnapshot).stocks.map((stock) => stock.id)).toEqual(["2330"]);
    expect(persisted.get("account:user-a:dirty")).toBe(true);
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("account_update_state", expect.objectContaining({
      data: expect.objectContaining({ stocks: [expect.objectContaining({ id: "2330" })] }),
    })));
    const updateArgs = invoke.mock.calls.find(([command]) => command === "account_update_state")?.[1] as { data: AccountSnapshot };
    expect(updateArgs.data.stocks.map((stock) => stock.id)).toEqual(["2330"]);
    expect(invoke.mock.calls.some(([command]) => command === "account_get_state")).toBe(false);

    acknowledgeCloud({ userId: "user-a", epoch: 1, updatedAt: null });
    await vi.waitFor(() => expect(persisted.get("account:user-a:dirty")).toBe(false));
  });

  it("keeps a repaired dirty cache when its cloud retry fails", async () => {
    const cached = snapshot("2330");
    cached.stocks.push({ id: "9999", name: "Orphan", group: "TW", type: "stock" });
    const { indicatorSettings: _indicatorSettings, ...stored } = cached;
    persisted.set("account:user-a:snapshot", stored);
    persisted.set("account:user-a:dirty", true);
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_get_state") return Promise.reject(new Error("DIRTY_CACHE_MUST_NOT_PULL"));
      if (command === "account_update_state") return Promise.reject(new Error("CLOUD_UNAVAILABLE"));
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, updatedAt: null });
    });

    await useStocksStore.getState().initializeAccount("user-a", 1);

    await vi.waitFor(() => expect(useStocksStore.getState()).toMatchObject({
      syncStatus: "local",
      syncError: null,
    }));
    expect((persisted.get("account:user-a:snapshot") as AccountSnapshot).stocks.map((stock) => stock.id)).toEqual(["2330"]);
    expect(persisted.get("account:user-a:dirty")).toBe(true);
  });

  it("does not send dirty cache corruption other than the orphan repair", async () => {
    const invalid = snapshot("2330");
    invalid.categories[0].stockIds.push("2330");
    const { indicatorSettings: _indicatorSettings, ...stored } = invalid;
    persisted.set("account:user-a:snapshot", stored);
    persisted.set("account:user-a:dirty", true);
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_update_state") return Promise.reject(new Error("MUST_NOT_SEND"));
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, updatedAt: null });
    });

    await useStocksStore.getState().initializeAccount("user-a", 1);

    expect(useStocksStore.getState()).toMatchObject({ syncStatus: "local" });
    expect(invoke.mock.calls.some(([command]) => command === "account_update_state")).toBe(false);
    expect(persisted.get("account:user-a:dirty")).toBe(true);
  });

  it("rejects invalid local snapshots before publishing or caching them", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    const before = persisted.get("account:user-a:snapshot");
    await expect(useStocksStore.getState().addCategory("x".repeat(201))).rejects.toThrow("INVALID_CATEGORY");
    expect(useStocksStore.getState().categories).toEqual(snapshot("2330").categories);
    expect(persisted.get("account:user-a:snapshot")).toEqual(before);
  });

  it("uses UTF-8 byte limits instead of JavaScript character counts", () => {
    const invalid = snapshot("2330");
    invalid.categories[0].name = "台".repeat(67); // 201 UTF-8 bytes
    expect(() => __validateSnapshotForLocal(invalid)).toThrow("INVALID_CATEGORY");
  });

  it("rejects every direct duplicate shape that Rust validate_snapshot rejects", () => {
    const duplicateStock = snapshot("2330");
    duplicateStock.stocks.push({ ...duplicateStock.stocks[0] });
    expect(() => __validateSnapshotForLocal(duplicateStock)).toThrow("INVALID_STOCK");

    const duplicateCategory = snapshot("2330");
    duplicateCategory.categories.push({ ...duplicateCategory.categories[0] });
    expect(() => __validateSnapshotForLocal(duplicateCategory)).toThrow("INVALID_CATEGORY");

    const duplicateMember = snapshot("2330");
    duplicateMember.categories[0].stockIds.push("2330");
    expect(() => __validateSnapshotForLocal(duplicateMember)).toThrow("INVALID_CATEGORY_MEMBERSHIP");

    const duplicatePinned = snapshot("2330");
    duplicatePinned.pinnedCategoryIds = ["group-a", "group-a"];
    expect(() => __validateSnapshotForLocal(duplicatePinned)).toThrow("INVALID_PINNED_CATEGORIES");

    const duplicateRecent = snapshot("2330");
    duplicateRecent.recentCategoryIds = ["group-a", "group-a"];
    expect(() => __validateSnapshotForLocal(duplicateRecent)).toThrow("INVALID_RECENT_CATEGORIES");
  });

  it("rejects duplicate stock IDs created by normalization trimming before any local commit", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    const before = persisted.get("account:user-a:snapshot");
    useStocksStore.setState({
      stocks: [
        { id: "2330", name: "Stock 2330", group: "TW", type: "stock" },
        { id: " 2330", name: "Trimmed duplicate", group: "TW", type: "stock" },
      ],
      categories: [{ id: "group-a", name: "A", stockIds: ["2330"] }],
      activeCategoryId: "group-a",
    });

    await expect(useStocksStore.getState().addCategory("Normalization duplicate")).rejects.toThrow("INVALID_STOCK");
    expect(persisted.get("account:user-a:snapshot")).toEqual(before);
    expect(invoke.mock.calls.some(([command]) => command === "account_update_state")).toBe(false);
  });

  it("rejects invalid indicator settings before a local projection can commit", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    const before = persisted.get("account:user-a:snapshot");
    useStocksStore.setState({ indicatorSettings: { ...settings, atrMult: 21 } });

    await expect(useStocksStore.getState().addCategory("Blocked by indicator validation")).rejects.toThrow("INVALID_INDICATOR_SETTINGS");
    expect(useStocksStore.getState().categories).toEqual(snapshot("2330").categories);
    expect(persisted.get("account:user-a:snapshot")).toEqual(before);
    expect(invoke.mock.calls.some(([command]) => command === "account_update_state")).toBe(false);
  });

  it("matches finite indicator and atrMult bounds at their local commit boundary", () => {
    const atLimit = snapshot("2330");
    atLimit.indicatorSettings = { ...settings, ma5: 1000, atrMult: 20 };
    expect(() => __validateSnapshotForLocal(atLimit)).not.toThrow();

    const invalidRange = snapshot("2330");
    invalidRange.indicatorSettings = { ...settings, ma5: 1000.01 };
    expect(() => __validateSnapshotForLocal(invalidRange)).toThrow("INVALID_INDICATOR_SETTINGS");

    const invalidFinite = snapshot("2330");
    invalidFinite.indicatorSettings = { ...settings, rsi: Number.NaN };
    expect(() => __validateSnapshotForLocal(invalidFinite)).toThrow("INVALID_INDICATOR_SETTINGS");
  });

  it("accepts a structurally valid snapshot that exceeds PhoneApp payload capacity", () => {
    const oversized = oversizedSnapshot();

    expect(phonePayloadBytes(oversized)).toBeGreaterThan(45_000);
    expect(() => __validateSnapshotForLocal(oversized)).not.toThrow();
  });

  it("continues to reject local stock and category count limits", () => {
    const tooManyStocks = oversizedSnapshot();
    const extraStock = {
      id: "TW-extra",
      name: "Extra",
      group: "TW",
      type: "stock",
    };
    tooManyStocks.stocks.push(extraStock);
    tooManyStocks.categories[0].stockIds.push(extraStock.id);
    expect(() => __validateSnapshotForLocal(tooManyStocks)).toThrow(
      "DATA_LIMIT_EXCEEDED",
    );

    const tooManyCategories = oversizedSnapshot();
    tooManyCategories.categories.push({
      id: "group-extra",
      name: "Extra",
      stockIds: [],
    });
    expect(() => __validateSnapshotForLocal(tooManyCategories)).toThrow(
      "DATA_LIMIT_EXCEEDED",
    );
  });

  it("removes a category locally and turns an oversized cloud backup off", async () => {
    const oversized = oversizedSnapshot();
    const afterRemoval = {
      ...oversized,
      categories: oversized.categories.slice(1),
      stocks: oversized.stocks.slice(3),
      activeCategoryId: "group-1",
    };
    expect(phonePayloadBytes(afterRemoval)).toBeGreaterThan(45_000);
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_update_state") {
        return Promise.reject(new Error("DATA_LIMIT_EXCEEDED"));
      }
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") {
        return Promise.resolve({ present: false, disposition: null, path: "" });
      }
      return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, updatedAt: null });
    });
    useStocksStore.setState({
      ...oversized,
      menu: oversized.stocks,
      accountUserId: "user-a",
      accountEpoch: 1,
      hydrated: true,
      syncStatus: "synced",
      syncError: null,
    });

    await expect(useStocksStore.getState().removeCategory("group-0")).resolves.toBeUndefined();

    expect(useStocksStore.getState().categories).toHaveLength(99);
    expect(useStocksStore.getState().categories.some((category) => category.id === "group-0")).toBe(false);
    expect((persisted.get("account:user-a:snapshot") as AccountSnapshot).categories).toHaveLength(99);
    expect(persisted.get("account:user-a:dirty")).toBe(true);
    expect(useStocksStore.getState().cloudBackupEnabled).toBe(false);
    expect(invoke.mock.calls.some(([command]) => command === "account_update_state")).toBe(false);
    expect(persisted.get("account:user-a:dirty")).toBe(true);
  });

  it("acknowledges only the dirty marker without overwriting later local navigation", async () => {
    let resolveCloud!: (value: unknown) => void;
    const pendingCloud = new Promise((resolve) => { resolveCloud = resolve; });
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_get_state") return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, schemaVersion: 1, data: snapshot("2330"), updatedAt: null });
      if (command === "account_update_state") return pendingCloud;
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.resolve(null);
    });
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    await useStocksStore.getState().addCategory("Cloud snapshot");
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("account_update_state", expect.anything()));

    await useStocksStore.getState().togglePinnedCategory("group-a");
    await vi.waitFor(() => expect(persisted.get("account:user-a:snapshot")).toMatchObject({ pinnedCategoryIds: ["group-a"] }));
    expect(persisted.get("account:user-a:dirty")).toBe(true);

    resolveCloud({ userId: "user-a", epoch: 1, updatedAt: null });
    await vi.waitFor(() => expect(persisted.get("account:user-a:dirty")).toBe(false));
    expect(persisted.get("account:user-a:snapshot")).toMatchObject({ pinnedCategoryIds: ["group-a"] });
  });

  it("does not publish a mutation when the durable local save fails", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    const beforeCategories = useStocksStore.getState().categories;
    const beforeSnapshot = persisted.get("account:user-a:snapshot");
    const beforeDirty = persisted.get("account:user-a:dirty");
    storeControl.saveError = new Error("DISK_FULL");
    await expect(useStocksStore.getState().addCategory("Not persisted")).rejects.toThrow("DISK_FULL");
    expect(useStocksStore.getState().categories).toEqual(beforeCategories);
    expect(persisted.get("account:user-a:snapshot")).toEqual(beforeSnapshot);
    expect(persisted.get("account:user-a:dirty")).toBe(beforeDirty);
    expect(useStocksStore.getState().syncStatus).toBe("error");
  });

  it("rolls back a failed dirty acknowledgment before later local writes", async () => {
    let resolveCloud!: (value: unknown) => void;
    const pendingCloud = new Promise((resolve) => { resolveCloud = resolve; });
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_get_state") return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, schemaVersion: 1, data: snapshot("2330"), updatedAt: null });
      if (command === "account_update_state") return pendingCloud;
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.resolve(null);
    });
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    await useStocksStore.getState().addCategory("Awaiting acknowledgement");
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("account_update_state", expect.anything()));
    expect(persisted.get("account:user-a:dirty")).toBe(true);

    storeControl.saveError = new Error("DISK_FULL");
    resolveCloud({ userId: "user-a", epoch: 1, updatedAt: null });
    await vi.waitFor(() => expect(useStocksStore.getState().syncStatus).toBe("local"));
    expect(persisted.get("account:user-a:dirty")).toBe(true);

    storeControl.saveError = null;
    await useStocksStore.getState().togglePinnedCategory("group-a");
    await vi.waitFor(() => expect(persisted.get("account:user-a:snapshot")).toMatchObject({ pinnedCategoryIds: ["group-a"] }));
    expect(persisted.get("account:user-a:dirty")).toBe(true);
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

  it("keeps startup local-only even when automatic upload is enabled", async () => {
    persisted.set("account:user-a:cloud-backup-enabled", true);
    const initial = persisted.get("account:user-a:snapshot");
    await useStocksStore.getState().initializeAccount("user-a", 1);

    expect(invoke.mock.calls.some(([command]) => command === "account_get_state")).toBe(false);
    expect(useStocksStore.getState().cloudBackupEnabled).toBe(true);
    expect(persisted.get("account:user-a:snapshot")).toEqual(initial);
  });

  it("does not duplicate indicator preferences in the native account cache", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);

    expect(persisted.get("account:user-a:snapshot")).not.toHaveProperty("indicatorSettings");
  });

  it("does not read cloud during a clean startup with an enabled switch", async () => {
    persisted.set("account:user-a:cloud-backup-enabled", true);
    await useStocksStore.getState().hydrateAccount("user-a", 1);

    expect(invoke.mock.calls.some(([command]) => command === "account_get_state")).toBe(false);
    expect(useStocksStore.getState().syncStatus).toBe("local");
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

  it("invalidates queued initialization when the current projection is already empty", async () => {
    let releaseSave!: () => void;
    const delayedSave = new Promise<void>((resolve) => { releaseSave = resolve; });
    let signalSaveStarted!: () => void;
    const saveStarted = new Promise<void>((resolve) => { signalSaveStarted = resolve; });
    storeControl.saveGate = delayedSave;
    storeControl.saveStarted = signalSaveStarted;
    const account = snapshot("2330");
    useStocksStore.setState({
      ...account,
      menu: account.stocks,
      accountUserId: "user-a",
      accountEpoch: 1,
      hydrated: true,
      syncStatus: "loading",
      syncError: null,
    });

    const oldMutation = useStocksStore.getState().addCategory("blocked write");
    await saveStarted;
    await useStocksStore.getState().clearAccountProjection();
    const queuedInitialization = useStocksStore
      .getState()
      .initializeAccount("user-a", 2);
    expect(
      await useStocksStore
        .getState()
        .clearAccountProjectionIfCurrentUser("user-a"),
    ).toBe(true);
    useStocksStore.getState().setAccountSyncError("SESSION_LOCK");

    releaseSave();
    await oldMutation;
    await expect(queuedInitialization).rejects.toThrow("SESSION_CHANGED");

    expect(useStocksStore.getState()).toMatchObject({
      accountUserId: null,
      accountEpoch: null,
      syncStatus: "error",
      syncError: "SESSION_LOCK",
    });
    expect(invoke.mock.calls.some(([command]) => command === "account_get_state")).toBe(false);
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
