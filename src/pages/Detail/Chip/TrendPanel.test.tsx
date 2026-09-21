/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../../i18n";
import type { ChipData } from "../../../api/marketApi";
import TrendPanel, { buildTrendData } from "./TrendPanel";

vi.mock("recharts", () => ({
  Bar: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null,
  Cell: () => null,
  ComposedChart: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Line: () => null,
  ReferenceLine: () => null,
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

const history = [
  {
    date: "2026-09-01",
    close: 100,
    foreign: 700,
    trust: 200,
    dealer: 100,
    institutionalTotal: 1000,
    marginBalance: 10,
  },
  {
    date: "2026-09-02",
    close: 101,
    foreign: -1500,
    trust: -700,
    dealer: -300,
    institutionalTotal: -2500,
    marginBalance: 11,
  },
  {
    date: "2026-09-03",
    close: 102,
    foreign: 400,
    trust: 200,
    dealer: -100,
    institutionalTotal: 500,
    marginBalance: 12,
  },
] satisfies ChipData["history"];

const chipData = {
  symbol: "2330",
  asOf: "2026-09-03",
  source: "test",
  score: 50,
  verdict: "mixed",
  confidence: "medium",
  institutional: {
    foreign5d: 0,
    trust5d: 0,
    dealer5d: 0,
    total5d: 0,
    total20d: -1000,
    consecutiveDays: 0,
  },
  margin: {
    marginBalance: 12,
    marginChange5d: 0,
    marginChangePercent5d: 0,
    shortBalance: 0,
    shortChange5d: 0,
    shortMarginRatio: 0,
  },
  history,
  signals: [],
  scoreBreakdown: [],
  lights: {
    institutional: "neutral",
    foreignHolding: "stable",
    lendingPressure: "normal",
    summary: "mixed",
    foreignRatio: null,
    foreignChange5d: null,
    lendingVolume5d: 0,
    lendingChangePercent: null,
  },
} satisfies ChipData;

describe("buildTrendData", () => {
  it("calculates mixed daily institutional flow as immutable cumulative lots", () => {
    const input = history.map((day) => ({ ...day }));
    const inputSnapshot = history.map((day) => ({ ...day }));

    const result = buildTrendData(input);

    expect(result.map((day) => day.institutionalLots)).toEqual([1, -2.5, 0.5]);
    expect(result.map((day) => day.institutionalCumulativeLots)).toEqual([1, -1.5, -1]);
    expect(input).toEqual(inputSnapshot);
    expect(result[0]).not.toBe(input[0]);
  });
});

describe("TrendPanel", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("labels the white line as cumulative institutions", () => {
    render(<TrendPanel data={chipData} />);

    expect(screen.getByText("White line cumulative institutions")).toBeTruthy();
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe(
      "Daily institutional net flow (lots); Red bars net buy | Green bars net sell | White line cumulative institutions",
    );
  });
});
