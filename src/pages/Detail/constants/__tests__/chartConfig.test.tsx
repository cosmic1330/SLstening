import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../Donchian/Donchian", () => ({
  default: () => <div>donchian-chart</div>,
}));

import { CHART_CONFIG, getChartAdvice } from "../chartConfig";
import en from "../../../../locales/en.json";

describe("CHART_CONFIG", () => {
  it("keeps stable, unique chart ids used by Detail navigation", () => {
    const ids = CHART_CONFIG.map(({ id }) => id);

    expect(ids).toEqual([
      "bollean",
      "Donchian",
      "ma",
      "ema",
      "atr",
      "obv",
      "volume_profile",
      "cci",
      "mr",
      "kd",
      "mfi",
      "ichimoku_cloud",
      "chip",
      "pe_river",
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("provides complete metadata and a renderable component for every chart", () => {
    for (const chart of CHART_CONFIG) {
      expect(chart.label.trim()).not.toBe("");
      expect(chart.title.trim()).not.toBe("");
      expect(chart.docContent.trim()).not.toBe("");
      expect(chart.timezoneAdvice.trim()).not.toBe("");
      expect(
        React.isValidElement(
          chart.component({
            perd: "d",
            visibleCount: 120,
            setVisibleCount: () => undefined,
            rightOffset: 0,
            setRightOffset: () => undefined,
          }),
        ),
      ).toBe(true);
    }
  });

  it("keeps every chart implementation behind a React.lazy boundary", () => {
    for (const chart of CHART_CONFIG) {
      const element = chart.component({
        perd: "d",
        visibleCount: 120,
        setVisibleCount: () => undefined,
        rightOffset: 0,
        setRightOffset: () => undefined,
      });

      expect(React.isValidElement(element)).toBe(true);
      expect((element as React.ReactElement).type).toMatchObject({
        $$typeof: Symbol.for("react.lazy"),
      });
    }
  });

  it("has chart-specific English guidance rather than a shared fallback", () => {
    const t = (key: string) => key.split(".").reduce<any>((value, segment) => value?.[segment], en);
    expect(getChartAdvice(CHART_CONFIG.find((chart) => chart.id === "bollean"), t as any)).toContain("Bollinger");
    expect(getChartAdvice(CHART_CONFIG.find((chart) => chart.id === "volume_profile"), t as any)).toContain("Volume Profile");
    expect(getChartAdvice(CHART_CONFIG.find((chart) => chart.id === "chip"), t as any)).toContain("Positioning");
  });

  it("keeps positioning and valuation charts at the bottom", () => {
    expect(CHART_CONFIG.slice(-2).map((chart) => chart.id)).toEqual(["chip", "pe_river"]);
  });

  it("classifies every chart by trading horizon", () => {
    expect(CHART_CONFIG.every((chart) => ["short", "mediumLong"].includes(chart.horizon))).toBe(true);
    expect(
      CHART_CONFIG.filter((chart) => chart.horizon === "short").map((chart) => chart.id),
    ).toEqual(expect.arrayContaining(["mfi", "mr", "kd", "obv"]));
  });
});
