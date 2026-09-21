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

import useStocksStore, { DEFAULT_WATCHLIST_ID } from "../Stock.store";

const stock = (id: string) => ({ id, name: `Stock ${id}`, group: "TW", type: "stock" });
const resetState = () => useStocksStore.setState({ stocks: [], menu: [], categories: [], activeCategoryId: DEFAULT_WATCHLIST_ID, hydrated: false, pinnedCategoryIds: [], recentCategoryIds: [] });

describe("Stock.store category memberships", () => {
  beforeEach(() => { persisted.clear(); save.mockClear(); resetState(); });

  it("creates one default category for fresh settings and is idempotent", async () => {
    await useStocksStore.getState().reload();
    expect(useStocksStore.getState().categories).toEqual([{ id: DEFAULT_WATCHLIST_ID, name: "", stockIds: [], isDefault: true }]);
    const firstSaveCount = save.mock.calls.length;
    await useStocksStore.getState().reload();
    expect(save.mock.calls.length).toBe(firstSaveCount);
  });

  it("migrates legacy stocks into the default category while preserving customs", async () => {
    persisted.set("stocks", [stock("2330")]);
    persisted.set("categories", [{ id: "growth", name: "Growth", stockIds: [] }]);
    await useStocksStore.getState().reload();
    expect(useStocksStore.getState().categories.map((category) => category.id)).toEqual([DEFAULT_WATCHLIST_ID, "growth"]);
    expect(useStocksStore.getState().categories[0].stockIds).toEqual(["2330"]);
  });

  it("restores a valid active category and falls back to default after deletion", async () => {
    persisted.set("categories", [{ id: DEFAULT_WATCHLIST_ID, name: "", stockIds: [], isDefault: true }, { id: "tech", name: "Tech", stockIds: [] }]);
    persisted.set("activeCategoryId", "tech");
    await useStocksStore.getState().reload();
    expect(useStocksStore.getState().activeCategoryId).toBe("tech");
    await useStocksStore.getState().removeCategory("tech");
    expect(useStocksStore.getState().activeCategoryId).toBe(DEFAULT_WATCHLIST_ID);
  });

  it("rejects duplicate custom names ignoring case and whitespace", async () => {
    await useStocksStore.getState().reload(); await useStocksStore.getState().addCategory("Growth");
    await expect(useStocksStore.getState().addCategory(" growth ")).rejects.toThrow("CATEGORY_NAME_DUPLICATE");
  });

  it("keeps master stock while a remaining category still contains it, then removes orphan", async () => {
    await useStocksStore.getState().reload(); await useStocksStore.getState().addCategory("Tech");
    const techId = useStocksStore.getState().categories[1].id;
    await useStocksStore.getState().setStockCategories(stock("2330"), [DEFAULT_WATCHLIST_ID, techId]);
    await useStocksStore.getState().removeStockFromCategory(DEFAULT_WATCHLIST_ID, "2330");
    expect(useStocksStore.getState().stocks.map((item) => item.id)).toEqual(["2330"]);
    await useStocksStore.getState().removeStockFromCategory(techId, "2330");
    expect(useStocksStore.getState().stocks).toEqual([]);
  });

  it("removes orphan stocks when a category is deleted and global removal clears every membership", async () => {
    await useStocksStore.getState().reload(); await useStocksStore.getState().addCategory("Tech");
    const techId = useStocksStore.getState().categories[1].id;
    await useStocksStore.getState().setStockCategories(stock("2330"), [techId]);
    await useStocksStore.getState().removeCategory(techId);
    expect(useStocksStore.getState().stocks).toEqual([]);
    await useStocksStore.getState().setStockCategories(stock("2317"), [DEFAULT_WATCHLIST_ID]);
    await useStocksStore.getState().remove("2317");
    expect(useStocksStore.getState().categories.flatMap((category) => category.stockIds)).not.toContain("2317");
  });

  it("pins default category first and persists a complete category stock order", async () => {
    await useStocksStore.getState().reload(); await useStocksStore.getState().addCategory("Tech");
    const techId = useStocksStore.getState().categories[1].id;
    await useStocksStore.getState().setStockCategories(stock("2330"), [techId]);
    await useStocksStore.getState().setStockCategories(stock("2317"), [techId]);
    await useStocksStore.getState().updateStockOrder(techId, ["2330", "2317"]);
    expect(useStocksStore.getState().categories.find((category) => category.id === techId)?.stockIds).toEqual(["2330", "2317"]);
    await useStocksStore.getState().updateStockOrder(techId, ["2330"]);
    expect(useStocksStore.getState().categories.find((category) => category.id === techId)?.stockIds).toEqual(["2330", "2317"]);
    await useStocksStore.getState().updateStockOrder(techId, ["2330", "2317", "9999"]);
    expect(useStocksStore.getState().categories.find((category) => category.id === techId)?.stockIds).toEqual(["2330", "2317"]);
    await useStocksStore.getState().updateCategories([...useStocksStore.getState().categories].reverse());
    expect(useStocksStore.getState().categories[0].id).toBe(DEFAULT_WATCHLIST_ID);
  });

  it("keeps a stock that is shared with another category when deleting a category", async () => {
    await useStocksStore.getState().reload(); await useStocksStore.getState().addCategory("Tech");
    const techId = useStocksStore.getState().categories[1].id;
    await useStocksStore.getState().setStockCategories(stock("2330"), [DEFAULT_WATCHLIST_ID, techId]);
    await useStocksStore.getState().removeCategory(techId);
    expect(useStocksStore.getState().stocks.map((item) => item.id)).toEqual(["2330"]);
  });

  it("serializes concurrent tracking mutations so neither removal is lost", async () => {
    await useStocksStore.getState().reload();
    await useStocksStore.getState().setStockCategories(stock("2330"), [DEFAULT_WATCHLIST_ID]);
    await useStocksStore.getState().setStockCategories(stock("2317"), [DEFAULT_WATCHLIST_ID]);
    let releaseFirstSave!: () => void;
    save.mockImplementationOnce(() => new Promise<undefined>((resolve) => { releaseFirstSave = () => resolve(undefined); }));
    const first = useStocksStore.getState().removeStockFromCategory(DEFAULT_WATCHLIST_ID, "2330");
    const second = useStocksStore.getState().removeStockFromCategory(DEFAULT_WATCHLIST_ID, "2317");
    await vi.waitFor(() => expect(releaseFirstSave).toBeTypeOf("function"));
    releaseFirstSave();
    await Promise.all([first, second]);
    expect(useStocksStore.getState().stocks).toEqual([]);
    expect(useStocksStore.getState().categories[0].stockIds).toEqual([]);
  });

  it("limits pins to five, persists pin order, and excludes pins from recents", async () => {
    await useStocksStore.getState().reload();
    for (const name of ["A", "B", "C", "D", "E", "F"]) await useStocksStore.getState().addCategory(name);
    const customIds = useStocksStore.getState().categories.slice(1).map((category) => category.id);
    for (const id of customIds.slice(0, 5)) await useStocksStore.getState().togglePinnedCategory(id);
    await expect(useStocksStore.getState().togglePinnedCategory(customIds[5])).rejects.toThrow("PIN_LIMIT_REACHED");
    const reversed = [...customIds.slice(0, 5)].reverse();
    await useStocksStore.getState().reorderPinnedCategories(reversed);
    expect(useStocksStore.getState().pinnedCategoryIds).toEqual(reversed);
    await useStocksStore.getState().setActiveCategory(customIds[5]);
    await useStocksStore.getState().setActiveCategory(customIds[0]);
    expect(useStocksStore.getState().recentCategoryIds).toEqual([customIds[5]]);
  });

  it("cleans pin and recent history when deleting a category", async () => {
    await useStocksStore.getState().reload();
    await useStocksStore.getState().addCategory("Pinned");
    await useStocksStore.getState().addCategory("Recent");
    const [pinnedId, recentId] = useStocksStore.getState().categories.slice(1).map((category) => category.id);
    await useStocksStore.getState().togglePinnedCategory(pinnedId);
    await useStocksStore.getState().setActiveCategory(recentId);
    await useStocksStore.getState().removeCategory(pinnedId);
    await useStocksStore.getState().removeCategory(recentId);
    expect(useStocksStore.getState().pinnedCategoryIds).toEqual([]);
    expect(useStocksStore.getState().recentCategoryIds).toEqual([]);
    expect(useStocksStore.getState().activeCategoryId).toBe(DEFAULT_WATCHLIST_ID);
  });
});
