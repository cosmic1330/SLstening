import { describe, expect, it } from "vitest";
import { buildLegacyRepairPlan, emptyAccountSnapshot, hasPersonalData } from "../snapshot";

describe("legacy account import detection", () => {
  it("treats non-default indicator settings as personal data", () => {
    const snapshot = emptyAccountSnapshot();
    expect(hasPersonalData(snapshot)).toBe(false);
    snapshot.indicatorSettings.rsi = 21;
    expect(hasPersonalData(snapshot)).toBe(true);
  });

  it("merges missing category members while preserving current account preferences", () => {
    const current = emptyAccountSnapshot();
    current.stocks = [{ id: "2330", name: "TSMC", group: "TW", type: "stock" }];
    current.categories[0].stockIds = ["2330"];
    current.indicatorSettings.rsi = 21;
    const legacy = {
      snapshot: {
        ...current,
        stocks: [
          ...current.stocks,
          { id: "2317", name: "Hon Hai", group: "TW", type: "stock" },
        ],
        categories: [
          { ...current.categories[0], stockIds: ["2330"] },
          { id: "power", name: "Power", stockIds: ["2317"] },
        ],
        indicatorSettings: { ...current.indicatorSettings, rsi: 14 },
      },
      unresolvedStockIds: ["9999"],
    };
    const plan = buildLegacyRepairPlan(current, legacy);
    expect(plan.snapshot.stocks.map((stock) => stock.id)).toEqual(["2330", "2317"]);
    expect(plan.snapshot.categories[plan.snapshot.categories.length - 1]?.stockIds).toEqual(["2317"]);
    expect(plan.snapshot.indicatorSettings.rsi).toBe(21);
    expect(plan.unresolvedStockIds).toEqual(["9999"]);
    expect(plan.missingCategoryIds).toEqual(["power"]);
  });
});
