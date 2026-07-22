import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../Donchian/Donchian", () => ({
  default: () => <div>donchian-chart</div>,
}));

import { CHART_CONFIG } from "../chartConfig";

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
});
