// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DEFAULT_WATCHLIST_ID } from "../../../../store/Stock.store";
import { CategoryType } from "../../../../types";
import { groupCategories } from "../categoryGroups";

const categories: CategoryType[] = [
  { id: DEFAULT_WATCHLIST_ID, name: "", stockIds: [], isDefault: true },
  { id: "alpha", name: "Alpha", stockIds: [] },
  { id: "beta", name: "Beta", stockIds: [] },
  { id: "gamma", name: "Gamma", stockIds: [] },
];

describe("groupCategories", () => {
  it("deduplicates categories across default, pinned, recent, and remaining groups", () => {
    const result = groupCategories({ categories, pinnedCategoryIds: ["alpha"], recentCategoryIds: ["alpha", "beta"], query: "", defaultName: "Watchlist", locale: "en" });
    expect(result.defaultCategory?.id).toBe(DEFAULT_WATCHLIST_ID);
    expect(result.pinned.map((item) => item.id)).toEqual(["alpha"]);
    expect(result.recent.map((item) => item.id)).toEqual(["beta"]);
    expect(result.others.map((item) => item.id)).toEqual(["gamma"]);
    expect(result.visibleCount).toBe(4);
  });

  it("searches the localized default label and custom names case-insensitively", () => {
    expect(groupCategories({ categories, pinnedCategoryIds: [], recentCategoryIds: [], query: "watch", defaultName: "Watchlist", locale: "en" }).defaultCategory?.id).toBe(DEFAULT_WATCHLIST_ID);
    const result = groupCategories({ categories, pinnedCategoryIds: ["alpha"], recentCategoryIds: ["beta"], query: "GAM", defaultName: "Watchlist", locale: "en" });
    expect(result.others.map((item) => item.id)).toEqual(["gamma"]);
    expect(result.visibleCount).toBe(1);
  });
});
