import { beforeEach, describe, expect, it, vi } from "vitest";

const persisted = vi.hoisted(() => new Map<string, unknown>());
const save = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("@tauri-apps/plugin-store", () => ({
  Store: { load: vi.fn(async () => ({
    get: async (key: string) => persisted.get(key),
    set: async (key: string, value: unknown) => { persisted.set(key, value); },
    delete: async (key: string) => { persisted.delete(key); },
    clear: async () => persisted.clear(), save,
  })) },
}));

import useStocksStore from "../Stock.store";

const stock = (id: string) => ({ id, name: `Stock ${id}`, group: "TW", type: "stock" });
const resetState = () => useStocksStore.setState({
  stocks: [], menu: [], categories: [], activeCategoryId: "", hydrated: false,
  pinnedCategoryIds: [], recentCategoryIds: [], indicatorSettings: { ...useStocksStore.getState().indicatorSettings },
  accountUserId: null, accountEpoch: null, syncStatus: "local", syncError: null,
  legacySettingsPrompt: false, legacySettingsError: null,
});

describe("Stock.store category memberships", () => {
  beforeEach(() => { persisted.clear(); save.mockClear(); resetState(); });

  it("starts clean without synthesizing a default category", async () => {
    persisted.set("settings.json", { stocks: [stock("2330")] });
    await useStocksStore.getState().reload();
    expect(useStocksStore.getState().categories).toEqual([]);
    expect(useStocksStore.getState().activeCategoryId).toBe("");
    expect(persisted.has("settings.json")).toBe(true);
    expect(persisted.has("local:snapshot")).toBe(false);
  });

  it("requires a real category before adding durable stocks", async () => {
    await useStocksStore.getState().reload();
    await expect(useStocksStore.getState().addStocks([stock("2330")])).rejects.toThrow("CATEGORY_REQUIRED");
    await useStocksStore.getState().addCategory("Growth");
    const categoryId = useStocksStore.getState().categories[0].id;
    await useStocksStore.getState().addStocks([stock("2330")]);
    expect(useStocksStore.getState().categories[0]).toMatchObject({ id: categoryId, stockIds: ["2330"] });
    expect(useStocksStore.getState().stocks.map((item) => item.id)).toEqual(["2330"]);
  });

  it("selects the first category after deleting the active category, then uses an empty sentinel", async () => {
    await useStocksStore.getState().reload();
    await useStocksStore.getState().addCategory("First");
    await useStocksStore.getState().addCategory("Second");
    const [first, second] = useStocksStore.getState().categories;
    expect(useStocksStore.getState().activeCategoryId).toBe(first.id);
    await useStocksStore.getState().removeCategory(first.id);
    expect(useStocksStore.getState().activeCategoryId).toBe(second.id);
    await useStocksStore.getState().removeCategory(second.id);
    expect(useStocksStore.getState().categories).toEqual([]);
    expect(useStocksStore.getState().activeCategoryId).toBe("");
  });

  it("rejects duplicate category names ignoring case and whitespace", async () => {
    await useStocksStore.getState().reload();
    await useStocksStore.getState().addCategory("Growth");
    await expect(useStocksStore.getState().addCategory(" growth ")).rejects.toThrow("CATEGORY_NAME_DUPLICATE");
  });

  it("keeps a master stock while a remaining category still contains it, then removes orphan", async () => {
    await useStocksStore.getState().reload();
    await useStocksStore.getState().addCategory("One");
    await useStocksStore.getState().addCategory("Two");
    const [one, two] = useStocksStore.getState().categories;
    await useStocksStore.getState().setStockCategories(stock("2330"), [one.id, two.id]);
    await useStocksStore.getState().removeStockFromCategory(one.id, "2330");
    expect(useStocksStore.getState().stocks.map((item) => item.id)).toEqual(["2330"]);
    await useStocksStore.getState().removeStockFromCategory(two.id, "2330");
    expect(useStocksStore.getState().stocks).toEqual([]);
  });

  it("removes orphan stocks when a category is deleted and global removal clears memberships", async () => {
    await useStocksStore.getState().reload();
    await useStocksStore.getState().addCategory("Tech");
    const categoryId = useStocksStore.getState().categories[0].id;
    await useStocksStore.getState().setStockCategories(stock("2330"), [categoryId]);
    await useStocksStore.getState().removeCategory(categoryId);
    expect(useStocksStore.getState().stocks).toEqual([]);
    await useStocksStore.getState().addCategory("Again");
    const againId = useStocksStore.getState().categories[0].id;
    await useStocksStore.getState().setStockCategories(stock("2317"), [againId]);
    await useStocksStore.getState().remove("2317");
    expect(useStocksStore.getState().categories.flatMap((category) => category.stockIds)).not.toContain("2317");
  });

  it("persists complete category stock order and rejects incomplete orders", async () => {
    await useStocksStore.getState().reload();
    await useStocksStore.getState().addCategory("Tech");
    const categoryId = useStocksStore.getState().categories[0].id;
    await useStocksStore.getState().setStockCategories(stock("2330"), [categoryId]);
    await useStocksStore.getState().setStockCategories(stock("2317"), [categoryId]);
    await useStocksStore.getState().updateStockOrder(categoryId, ["2330", "2317"]);
    expect(useStocksStore.getState().categories[0].stockIds).toEqual(["2330", "2317"]);
    await expect(useStocksStore.getState().updateStockOrder(categoryId, ["2330"])).rejects.toThrow("INVALID_CATEGORY_ORDER");
    expect(useStocksStore.getState().categories[0].stockIds).toEqual(["2330", "2317"]);
  });

  it("serializes concurrent tracking mutations so neither removal is lost", async () => {
    await useStocksStore.getState().reload();
    await useStocksStore.getState().addCategory("Watch");
    const categoryId = useStocksStore.getState().categories[0].id;
    await useStocksStore.getState().setStockCategories(stock("2330"), [categoryId]);
    await useStocksStore.getState().setStockCategories(stock("2317"), [categoryId]);
    let releaseFirstSave!: () => void;
    save.mockImplementationOnce(() => new Promise<undefined>((resolve) => { releaseFirstSave = () => resolve(undefined); }));
    const first = useStocksStore.getState().removeStockFromCategory(categoryId, "2330");
    const second = useStocksStore.getState().removeStockFromCategory(categoryId, "2317");
    await vi.waitFor(() => expect(releaseFirstSave).toBeTypeOf("function"));
    releaseFirstSave();
    await Promise.all([first, second]);
    expect(useStocksStore.getState().stocks).toEqual([]);
    expect(useStocksStore.getState().categories[0].stockIds).toEqual([]);
  });

  it("limits pins to five, persists pin order, and excludes pins from recents", async () => {
    await useStocksStore.getState().reload();
    for (const name of ["A", "B", "C", "D", "E", "F"]) await useStocksStore.getState().addCategory(name);
    const ids = useStocksStore.getState().categories.map((category) => category.id);
    for (const id of ids.slice(0, 5)) await useStocksStore.getState().togglePinnedCategory(id);
    await expect(useStocksStore.getState().togglePinnedCategory(ids[5])).rejects.toThrow("PIN_LIMIT_REACHED");
    const reversed = [...ids.slice(0, 5)].reverse();
    await useStocksStore.getState().reorderPinnedCategories(reversed);
    expect(useStocksStore.getState().pinnedCategoryIds).toEqual(reversed);
    await useStocksStore.getState().setActiveCategory(ids[5]);
    await useStocksStore.getState().setActiveCategory(ids[0]);
    expect(useStocksStore.getState().recentCategoryIds).toEqual([ids[5]]);
  });

  it("cleans pin and recent history when deleting categories", async () => {
    await useStocksStore.getState().reload();
    await useStocksStore.getState().addCategory("Pinned");
    await useStocksStore.getState().addCategory("Recent");
    const [pinnedId, recentId] = useStocksStore.getState().categories.map((category) => category.id);
    await useStocksStore.getState().togglePinnedCategory(pinnedId);
    await useStocksStore.getState().setActiveCategory(recentId);
    await useStocksStore.getState().removeCategory(pinnedId);
    await useStocksStore.getState().removeCategory(recentId);
    expect(useStocksStore.getState().pinnedCategoryIds).toEqual([]);
    expect(useStocksStore.getState().recentCategoryIds).toEqual([]);
    expect(useStocksStore.getState().activeCategoryId).toBe("");
  });
});
