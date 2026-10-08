// @vitest-environment node
import { describe, expect, it } from "vitest";
import { CategoryType } from "../../../../types";
import { groupCategories } from "../categoryGroups";

const categories: CategoryType[] = [
  { id: "alpha", name: "Alpha", stockIds: [] },
  { id: "beta", name: "Beta", stockIds: [] },
  { id: "gamma", name: "Gamma", stockIds: [] },
];

describe("groupCategories", () => {
  it("deduplicates real categories across pinned, recent, and remaining groups", () => {
    const result = groupCategories({ categories, pinnedCategoryIds: ["alpha"], recentCategoryIds: ["alpha", "beta"], query: "", locale: "en" });
    expect(result.pinned.map((item) => item.id)).toEqual(["alpha"]);
    expect(result.recent.map((item) => item.id)).toEqual(["beta"]);
    expect(result.others.map((item) => item.id)).toEqual(["gamma"]);
    expect(result.visibleCount).toBe(3);
  });

  it("searches custom names case-insensitively and never invents a default category", () => {
    const result = groupCategories({ categories, pinnedCategoryIds: ["alpha"], recentCategoryIds: ["beta"], query: "GAM", locale: "en" });
    expect(result.others.map((item) => item.id)).toEqual(["gamma"]);
    expect(result.visibleCount).toBe(1);
    expect(groupCategories({ categories, pinnedCategoryIds: [], recentCategoryIds: [], query: "watch", locale: "en" }).visibleCount).toBe(0);
  });
});
