import { describe, expect, it } from "vitest";
import { emptyAccountSnapshot, hasPersonalData, normalizeAccountSnapshot } from "../snapshot";

describe("current account snapshot", () => {
  it("starts with no virtual category and a stable empty sentinel", () => {
    const snapshot = emptyAccountSnapshot();
    expect(snapshot.categories).toEqual([]);
    expect(snapshot.activeCategoryId).toBe("");
    expect(hasPersonalData(snapshot)).toBe(false);
  });

  it("normalizes only real category memberships and infers local market groups", () => {
    const snapshot = normalizeAccountSnapshot({
      stocks: [{ id: "2330", name: "TSMC", group: "", type: "" }],
      categories: [
        { id: "group-a", name: "A", stockIds: ["2330", "missing"] },
        { id: "group-a", name: "duplicate", stockIds: [] },
      ],
      activeCategoryId: "missing",
      pinnedCategoryIds: ["missing", "group-a"],
      recentCategoryIds: ["group-a"],
      indicatorSettings: emptyAccountSnapshot().indicatorSettings,
    });
    expect(snapshot.stocks[0]).toMatchObject({ id: "2330", group: "TW", type: "stock" });
    expect(snapshot.categories).toEqual([{ id: "group-a", name: "A", stockIds: ["2330"] }]);
    expect(snapshot.activeCategoryId).toBe("group-a");
    expect(snapshot.pinnedCategoryIds).toEqual(["group-a"]);
    expect(snapshot.recentCategoryIds).toEqual([]);
  });
});
