import { describe, expect, it } from "vitest";
import {
  classifyCloudThickness,
  getCloudDirection,
  summarizeProjectedCloud,
} from "./projectedCloud";

describe("projected cloud summary", () => {
  it("treats equal spans as neutral instead of bearish", () => {
    expect(getCloudDirection(100, 100)).toBe("neutral");
  });

  it("uses one shared thickness scale", () => {
    expect(classifyCloudThickness(1.01, 1)).toBe("thick");
    expect(classifyCloudThickness(1, 1)).toBe("normal");
    expect(classifyCloudThickness(0.75, 1)).toBe("normal");
    expect(classifyCloudThickness(0.5, 1)).toBe("normal");
    expect(classifyCloudThickness(0.49, 1)).toBe("thin");
  });

  it("counts a direction change once when spans meet before crossing", () => {
    const summary = summarizeProjectedCloud(
      [
        { senkouA: 102, senkouB: 100 },
        { senkouA: 101, senkouB: 101 },
        { senkouA: 100, senkouB: 102 },
      ],
      1,
    );

    expect(summary?.direction).toBe("bearish");
    expect(summary?.twistPeriods).toEqual([3]);
    expect(summary?.thicknessAtrRatio).toBe(2);
  });

  it("uses one-based periods and ignores invalid cloud rows", () => {
    const summary = summarizeProjectedCloud(
      [
        { senkouA: null, senkouB: null },
        { senkouA: 99, senkouB: 101 },
        { senkouA: 102, senkouB: 100 },
      ],
      1,
    );

    expect(summary?.majorityDirection).toBe("neutral");
    expect(summary?.twistPeriods).toEqual([3]);
  });
});
