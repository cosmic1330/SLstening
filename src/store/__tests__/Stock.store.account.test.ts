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
    cloudBackupConflict: null,
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
    cloudDataChangedAt: null, cloudBackupChecking: false, cloudBackupConflict: null,
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
      cloudBackupConflict: null,
    });
    expect(persisted.get("account:user-a:dirty")).toBe(false);
    expect(persisted.get("account:user-a:snapshot")).toMatchObject({
      stocks: [expect.objectContaining({ id: "2454" })],
    });
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
    expect(useStocksStore.getState().cloudBackupConflict).toBeNull();
    expect(persisted.get("account:user-a:dirty")).toBe(true);
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
    expect(useStocksStore.getState().cloudBackupConflict).toBeNull();
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
    expect(useStocksStore.getState().cloudBackupConflict).toBeNull();
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
    expect(useStocksStore.getState().cloudBackupConflict).toBeNull();
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
    expect(useStocksStore.getState().cloudBackupConflict).toBeNull();
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

  it("ignores an MCP commit for another account or native epoch", async () => {
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    await useStocksStore.getState().applyMcpAccountCommit({
      userId: "user-b",
      epoch: 2,
      data: snapshot("2454"),
      updatedAt: "2026-10-11T08:00:00.000Z",
      operation: "add_stock",
      mutation: { kind: "addStocks", categoryId: "group-a", stockIds: ["2454"] },
    });
    expect(useStocksStore.getState().stocks.map((stock) => stock.id)).toEqual(["2330"]);
  });

  it("defaults cloud backup on and uploads later local mutations", async () => {
    persisted.delete("account:user-a:cloud-backup-enabled");
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    invoke.mockClear();

    await useStocksStore.getState().addCategory("Local only");

    await vi.waitFor(() => expect(useStocksStore.getState().cloudBackupEnabled).toBe(true));
    expect(persisted.get("account:user-a:dirty")).toBe(true);
    await vi.waitFor(() => expect(invoke.mock.calls.some(([command]) => command === "account_update_state")).toBe(true));
  });

  it("enables an in-capacity backup and records only its successful outgoing write", async () => {
    persisted.set("account:user-a:cloud-backup-enabled", false);
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    invoke.mockClear();
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_update_state") return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, updatedAt: "2026-10-11T01:02:03.000Z" });
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, schemaVersion: 1, data: null, updatedAt: null });
    });

    await useStocksStore.getState().setCloudBackupEnabled(true);

    await vi.waitFor(() => expect(useStocksStore.getState().cloudBackupEnabled).toBe(true));
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("account_update_state", expect.anything()));
    await vi.waitFor(() => expect(useStocksStore.getState().cloudBackupLastSuccessAt).toBe("2026-10-11T01:02:03.000Z"));
    expect(persisted.get("account:user-a:cloud-backup-last-success-at")).toBe("2026-10-11T01:02:03.000Z");
  });

  it("keeps manual enable comparison off the mutation queue and uploads the latest local snapshot", async () => {
    persisted.set("account:user-a:cloud-backup-enabled", false);
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    let resolvePull!: (value: unknown) => void;
    const pendingPull = new Promise((resolve) => { resolvePull = resolve; });
    invoke.mockClear();
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_get_state") return pendingPull;
      if (command === "account_update_state") {
        return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, updatedAt: "2026-10-11T01:02:03.000Z" });
      }
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.reject(new Error(`unexpected invoke ${command}`));
    });

    await useStocksStore.getState().setCloudBackupEnabled(true);
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("account_get_state", { expectedEpoch: 1 }));

    await useStocksStore.getState().addCategory("Created during manual enable");
    expect(useStocksStore.getState().categories.some((category) => category.name === "Created during manual enable")).toBe(true);
    expect(useStocksStore.getState().cloudBackupEnabled).toBe(false);

    resolvePull({ userId: "user-a", epoch: 1, schemaVersion: 1, data: null, updatedAt: null });
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("account_update_state", expect.objectContaining({
      data: expect.objectContaining({
        categories: expect.arrayContaining([
          expect.objectContaining({ name: "Created during manual enable" }),
        ]),
      }),
    })));
    expect(useStocksStore.getState().cloudBackupEnabled).toBe(true);
  });

  it("does not let a pending manual comparison re-enable backup after the user turns it off", async () => {
    persisted.set("account:user-a:cloud-backup-enabled", false);
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    let resolvePull!: (value: unknown) => void;
    const pendingPull = new Promise((resolve) => { resolvePull = resolve; });
    invoke.mockClear();
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_get_state") return pendingPull;
      if (command === "account_update_state") return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, updatedAt: null });
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.reject(new Error(`unexpected invoke ${command}`));
    });

    await useStocksStore.getState().setCloudBackupEnabled(true);
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("account_get_state", { expectedEpoch: 1 }));
    await useStocksStore.getState().setCloudBackupEnabled(false);
    resolvePull({ userId: "user-a", epoch: 1, schemaVersion: 1, data: null, updatedAt: null });
    await Promise.resolve();

    expect(useStocksStore.getState()).toMatchObject({ cloudBackupEnabled: false, cloudBackupChecking: false });
    expect(persisted.get("account:user-a:cloud-backup-enabled")).toBe(false);
    expect(invoke.mock.calls.some(([command]) => command === "account_update_state")).toBe(false);
  });

  it("re-reads local data after delayed enable metadata before caching and uploading", async () => {
    persisted.set("account:user-a:cloud-backup-enabled", false);
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    let releaseMetadata!: () => void;
    const metadataGate = new Promise<void>((resolve) => { releaseMetadata = resolve; });
    let metadataSaveStarted!: () => void;
    const metadataStarted = new Promise<void>((resolve) => { metadataSaveStarted = resolve; });
    storeControl.saveGates = [metadataGate, Promise.resolve(), Promise.resolve()];
    storeControl.saveStartedCallbacks = [metadataSaveStarted];
    invoke.mockClear();
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_get_state") return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, schemaVersion: 1, data: null, updatedAt: null });
      if (command === "account_update_state") return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, updatedAt: "2026-10-11T01:02:03.000Z" });
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.reject(new Error(`unexpected invoke ${command}`));
    });

    await useStocksStore.getState().setCloudBackupEnabled(true);
    await metadataStarted;
    await useStocksStore.getState().addCategory("Created during metadata save");
    expect(persisted.get("account:user-a:snapshot")).toMatchObject({
      categories: expect.arrayContaining([expect.objectContaining({ name: "Created during metadata save" })]),
    });

    releaseMetadata();
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("account_update_state", expect.objectContaining({
      data: expect.objectContaining({
        categories: expect.arrayContaining([
          expect.objectContaining({ name: "Created during metadata save" }),
        ]),
      }),
    })));
    await vi.waitFor(() => expect(persisted.get("account:user-a:snapshot")).toMatchObject({
      categories: expect.arrayContaining([expect.objectContaining({ name: "Created during metadata save" })]),
    }));
  });

  it("waits for an in-progress local cache commit before finalizing manual enable", async () => {
    persisted.set("account:user-a:cloud-backup-enabled", false);
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    let releaseMetadata!: () => void;
    let releaseMutation!: () => void;
    const metadataGate = new Promise<void>((resolve) => { releaseMetadata = resolve; });
    const mutationGate = new Promise<void>((resolve) => { releaseMutation = resolve; });
    let metadataSaveStarted!: () => void;
    let mutationSaveStarted!: () => void;
    const metadataStarted = new Promise<void>((resolve) => { metadataSaveStarted = resolve; });
    const mutationStarted = new Promise<void>((resolve) => { mutationSaveStarted = resolve; });
    storeControl.saveGates = [metadataGate, mutationGate, Promise.resolve(), Promise.resolve()];
    storeControl.saveStartedCallbacks = [metadataSaveStarted, mutationSaveStarted];
    invoke.mockClear();
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_get_state") return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, schemaVersion: 1, data: null, updatedAt: null });
      if (command === "account_update_state") return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, updatedAt: "2026-10-11T01:02:03.000Z" });
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.reject(new Error(`unexpected invoke ${command}`));
    });

    await useStocksStore.getState().setCloudBackupEnabled(true);
    await metadataStarted;
    const mutation = useStocksStore.getState().addCategory("Committed behind metadata");
    await mutationStarted;

    releaseMetadata();
    await Promise.resolve();
    expect(invoke.mock.calls.some(([command]) => command === "account_update_state")).toBe(false);
    releaseMutation();
    await mutation;

    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("account_update_state", expect.objectContaining({
      data: expect.objectContaining({
        categories: expect.arrayContaining([
          expect.objectContaining({ name: "Committed behind metadata" }),
        ]),
      }),
    })));
    await vi.waitFor(() => expect(persisted.get("account:user-a:snapshot")).toMatchObject({
      categories: expect.arrayContaining([expect.objectContaining({ name: "Committed behind metadata" })]),
    }));
  });

  it("rechecks an equal cloud result after delayed metadata persistence", async () => {
    persisted.set("account:user-a:cloud-backup-enabled", false);
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    let releaseMetadata!: () => void;
    const metadataGate = new Promise<void>((resolve) => { releaseMetadata = resolve; });
    let metadataSaveStarted!: () => void;
    const metadataStarted = new Promise<void>((resolve) => { metadataSaveStarted = resolve; });
    storeControl.saveGates = [metadataGate, Promise.resolve(), Promise.resolve()];
    storeControl.saveStartedCallbacks = [metadataSaveStarted];
    invoke.mockClear();
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_get_state") return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, schemaVersion: 1, data: snapshot("2330"), updatedAt: "2026-10-11T01:02:03.000Z" });
      if (command === "account_update_state") return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, updatedAt: null });
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.reject(new Error(`unexpected invoke ${command}`));
    });

    await useStocksStore.getState().setCloudBackupEnabled(true);
    await metadataStarted;
    await useStocksStore.getState().addCategory("Changed after equal comparison");
    releaseMetadata();

    await vi.waitFor(() => expect(useStocksStore.getState().cloudBackupConflict).not.toBeNull());
    expect(useStocksStore.getState()).toMatchObject({ cloudBackupEnabled: false, syncStatus: "local" });
    await vi.waitFor(() => expect(persisted.get("account:user-a:cloud-backup-enabled")).toBe(false));
    expect(invoke.mock.calls.some(([command]) => command === "account_update_state")).toBe(false);
  });

  it("does not publish an equal-result conflict after the account projection is cleared", async () => {
    persisted.set("account:user-a:cloud-backup-enabled", false);
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    let releaseEnableMetadata!: () => void;
    let releaseDisableMetadata!: () => void;
    const enableMetadataGate = new Promise<void>((resolve) => { releaseEnableMetadata = resolve; });
    const disableMetadataGate = new Promise<void>((resolve) => { releaseDisableMetadata = resolve; });
    let enableSaveStarted!: () => void;
    let disableSaveStarted!: () => void;
    const enableStarted = new Promise<void>((resolve) => { enableSaveStarted = resolve; });
    const disableStarted = new Promise<void>((resolve) => { disableSaveStarted = resolve; });
    storeControl.saveGates = [enableMetadataGate, Promise.resolve(), disableMetadataGate];
    storeControl.saveStartedCallbacks = [enableSaveStarted, () => undefined, disableSaveStarted];
    invoke.mockClear();
    invoke.mockImplementation((command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_get_state") return Promise.resolve({ userId: "user-a", epoch: args.expectedEpoch, schemaVersion: 1, data: snapshot("2330"), updatedAt: "2026-10-11T01:02:03.000Z" });
      if (command === "account_get_indicator_settings") return Promise.resolve(null);
      if (command === "legacy_settings_status") return Promise.resolve({ present: false, disposition: null, path: "" });
      return Promise.reject(new Error(`unexpected invoke ${command}`));
    });

    await useStocksStore.getState().setCloudBackupEnabled(true);
    await enableStarted;
    await useStocksStore.getState().addCategory("Changed before logout");
    releaseEnableMetadata();
    await disableStarted;

    await useStocksStore.getState().clearAccountProjection();
    useStocksStore.getState().setAccountSyncError("SESSION_LOCK");
    releaseDisableMetadata();
    await Promise.resolve();
    await Promise.resolve();

    expect(useStocksStore.getState()).toMatchObject({
      accountUserId: null,
      accountEpoch: null,
      hydrated: false,
      cloudBackupConflict: null,
      syncStatus: "error",
      syncError: "SESSION_LOCK",
    });
  });

  it("performs no cloud read or write when the stored backup switch is off", async () => {
    persisted.set("account:user-a:cloud-backup-enabled", false);

    await useStocksStore.getState().initializeAccount("user-a", 1);

    expect(useStocksStore.getState().cloudBackupEnabled).toBe(false);
    expect(invoke.mock.calls.some(([command]) => command === "account_get_state")).toBe(false);
    expect(invoke.mock.calls.some(([command]) => command === "account_update_state")).toBe(false);
  });

  it("asks on different cloud data and preserves valid local-only preferences when cloud wins", async () => {
    persisted.set("account:user-a:cloud-backup-enabled", false);
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    useStocksStore.setState({
      pinnedCategoryIds: ["group-a"],
      recentCategoryIds: [],
      indicatorSettings: { ...settings, ma20: 55 },
    });
    const cloud = snapshot("2317");
    cloud.indicatorSettings = { ...settings, ma20: 99 };
    invoke.mockImplementation(async (command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_get_state") return { userId: "user-a", epoch: args.expectedEpoch, schemaVersion: 1, data: cloud, updatedAt: "2026-10-11T04:00:00.000Z" };
      if (command === "legacy_settings_status") return { present: false, disposition: null, path: "" };
      if (command === "account_get_indicator_settings") return null;
      throw new Error(`unexpected invoke ${command}`);
    });

    await useStocksStore.getState().setCloudBackupEnabled(true);
    await vi.waitFor(() => expect(useStocksStore.getState().cloudBackupConflict).not.toBeNull());
    expect(useStocksStore.getState().cloudBackupEnabled).toBe(false);

    await useStocksStore.getState().resolveCloudBackupConflict("cloud");

    expect(useStocksStore.getState()).toMatchObject({
      cloudBackupEnabled: true,
      cloudBackupConflict: null,
      pinnedCategoryIds: ["group-a"],
      activeCategoryId: "group-a",
      cloudBackupLastSuccessAt: "2026-10-11T04:00:00.000Z",
    });
    expect(useStocksStore.getState().stocks.map((stock) => stock.id)).toEqual(["2317"]);
    expect(useStocksStore.getState().indicatorSettings.ma20).toBe(55);
    expect(persisted.get("account:user-a:dirty")).toBe(false);
  });

  it("closes the blocking conflict and keeps local data when local-choice persistence fails", async () => {
    persisted.set("account:user-a:cloud-backup-enabled", false);
    await useStocksStore.getState().hydrateAccount("user-a", 1);
    invoke.mockImplementation(async (command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_get_state") return { userId: "user-a", epoch: args.expectedEpoch, schemaVersion: 1, data: snapshot("2317"), updatedAt: "2026-10-11T04:00:00.000Z" };
      if (command === "account_update_state") throw new Error("CLOUD_UNAVAILABLE");
      if (command === "legacy_settings_status") return { present: false, disposition: null, path: "" };
      if (command === "account_get_indicator_settings") return null;
      throw new Error(`unexpected invoke ${command}`);
    });
    await useStocksStore.getState().setCloudBackupEnabled(true);
    await vi.waitFor(() => expect(useStocksStore.getState().cloudBackupConflict).not.toBeNull());
    storeControl.saveError = new Error("DISK_FULL");

    await expect(useStocksStore.getState().resolveCloudBackupConflict("local")).resolves.toBeUndefined();

    expect(useStocksStore.getState()).toMatchObject({
      cloudBackupEnabled: true,
      cloudBackupConflict: null,
    });
    expect(useStocksStore.getState().stocks.map((stock) => stock.id)).toEqual(["2330"]);
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("account_update_state", expect.anything()));
    storeControl.saveError = null;
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

  it("drops triggers within 30 seconds and waits for a later mutation", async () => {
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
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(29_999);
      expect(writes).toBe(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(writes).toBe(1);
      await useStocksStore.getState().addCategory("Fourth");
      await vi.advanceTimersByTimeAsync(0);
      expect(writes).toBe(2);
      const second = invoke.mock.calls.filter(([command]) => command === "account_update_state")[1]?.[1] as { data: AccountSnapshot };
      expect(second.data.categories.some((category) => category.name === "Fourth")).toBe(true);
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

  it("lets a local mutation finish while the startup comparison is pending", async () => {
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
    resolvePull({ userId: "user-a", epoch: 1, schemaVersion: 1, data: snapshot("2317"), updatedAt: null });
    await Promise.resolve();
    expect(useStocksStore.getState().cloudBackupConflict).toBeNull();
    expect(useStocksStore.getState().cloudBackupChecking).toBe(false);
    expect(useStocksStore.getState().categories.some((category) => category.name === "Created after startup")).toBe(true);
  });

  it("does not use startup comparison as a mutation queue barrier", async () => {
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
    await mutation;
    expect(invoke.mock.calls.some(([command]) => command === "account_update_state")).toBe(true);

    resolvePull({ userId: "user-a", epoch: 1, schemaVersion: 1, data: snapshot("2330"), updatedAt: null });
    await initialization;

    const write = invoke.mock.calls.find(([command]) => command === "account_update_state");
    expect(write?.[1]).toMatchObject({
      data: {
        categories: [
          expect.objectContaining({ id: "group-a" }),
          expect.objectContaining({ name: "Created during cache prime" }),
        ],
        stocks: [expect.objectContaining({ id: "2317" })],
      },
    });
    await Promise.resolve();
    expect(useStocksStore.getState().cloudBackupConflict).toBeNull();
    expect(useStocksStore.getState().cloudBackupChecking).toBe(false);
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
    expect(newer.categories).toHaveLength(2);
    expect(persisted.get("account:user-a:snapshot")).toMatchObject({
      categories: expect.arrayContaining([expect.objectContaining({ name: "Created while pull was pending" })]),
    });

    resolveOldPull({ userId: "user-a", epoch: 1, schemaVersion: 1, data: snapshot("2330"), updatedAt: null });
    await staleHydration;

    expect(useStocksStore.getState().categories).toHaveLength(2);
    expect(useStocksStore.getState().categories.some((category) => category.name === "Created while pull was pending")).toBe(true);
    expect(useStocksStore.getState().stocks.map((stock) => stock.id)).toEqual(["2330"]);
    expect(persisted.get("account:user-a:snapshot")).toMatchObject({
      categories: expect.arrayContaining([expect.objectContaining({ name: "Created while pull was pending" })]),
      stocks: [expect.objectContaining({ id: "2330" })],
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
    // A dirty local projection schedules a push rather than pulling stale cloud data.
    expect(pullCount).toBe(1);

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
    expect(pullCount).toBe(1);

    rejectSync(new Error("CLOUD_WRITE_FAILED"));
    await expect(mutation).resolves.toBeUndefined();
    resolveConcurrentPull({ userId: "user-a", epoch: 1, schemaVersion: 1, data: snapshot("2330"), updatedAt: null });
    await concurrentHydration;

    expect(useStocksStore.getState().stocks.map((stock) => stock.id)).toContain("2317");
  });

  it("keeps local data and immediately uploads when PhoneApp has no backup", async () => {
    invoke.mockImplementation(async (command: string, args: { expectedEpoch?: number }) => {
      if (command === "account_get_state") return { userId: "user-a", epoch: args.expectedEpoch, schemaVersion: 1, data: null, updatedAt: null };
      if (command === "account_update_state") return { userId: "user-a", epoch: args.expectedEpoch, updatedAt: "2026-10-11T03:00:00.000Z" };
      if (command === "account_get_indicator_settings") return null;
      if (command === "legacy_settings_status") return { present: false, disposition: null, path: "" };
      throw new Error(`unexpected invoke ${command}`);
    });

    await useStocksStore.getState().hydrateAccount("user-a", 1);
    await vi.waitFor(() => expect(useStocksStore.getState().syncStatus).toBe("synced"));
    expect(useStocksStore.getState()).toMatchObject({ hydrated: true, activeCategoryId: "group-a" });
    expect(useStocksStore.getState().stocks.map((stock) => stock.id)).toEqual(["2330"]);
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
