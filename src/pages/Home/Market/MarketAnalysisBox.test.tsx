/** @vitest-environment jsdom */
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import i18n from "../../../i18n";
import type { TaType } from "../../../types";
const mock = vi.hoisted(() => ({ history: vi.fn() }));
vi.mock("../../../hooks/useConditionalDeals", () => ({ default: mock.history }));
vi.mock("../../../hooks/useIsVisible", () => ({ useIsVisible: () => true }));
import MarketAnalysisBox from "./MarketAnalysisBox";

const bars: TaType = Array.from({ length: 35 }, (_, i) => ({
  t: Number(new Date(Date.UTC(2026, 9, i + 1)).toISOString().slice(0, 10).replace(/-/g, "")),
  o: 100 + i, c: 100 + i, h: 101 + i, l: 99 + i, v: 100,
}));
const ready = { phase: "ready", freshness: "fresh", isRefreshing: false, marketSession: "closed" };
beforeEach(async () => { await i18n.changeLanguage("en"); mock.history.mockReset(); });

it("shows only the last 10 states chronologically using full history for MA warmup", () => {
  mock.history.mockReturnValue({ deals: bars, historyState: ready, retryHistory: vi.fn() });
  render(<MarketAnalysisBox />);
  const points = within(screen.getByRole("list")).getAllByRole("listitem");
  expect(points).toHaveLength(10);
  expect(points[0].getAttribute("aria-label")).toBe("2026-10-26 · Bullish");
  expect(points[9].getAttribute("aria-label")).toBe("2026-11-04 · Bullish");
  expect(screen.getByText("Bullish")).toBeTruthy();
  expect(screen.queryByRole("list", { name: "Recent market state changes" })).toBeNull();
  expect(screen.getByRole("heading", { name: "Taiwan index futures · Daily" })).toBeTruthy();
  expect(mock.history.mock.calls[0]).toEqual(["WTX%26.TW", true, true, { fetchTick: false, fetchHistory: true }]);
});

it.each([
  [1, ["Bullish", "Sideways", "Bearish"]],
  [-1, ["Bearish", "Sideways", "Bullish"]],
] as const)("shows actual transitions and their dates beyond the visible 10 days (direction %s)", (direction, labels) => {
  const history = Array.from({ length: 120 }, (_, i) => {
    const value = i < 30 ? 100 + i : i < 60 ? 160 - i : i < 90 ? 40 + i : 220 - i;
    const close = 200 + direction * value;
    return {
      t: Number(new Date(Date.UTC(2026, 6, i + 1)).toISOString().slice(0, 10).replace(/-/g, "")),
      o: close, h: close + 1, l: close - 1, c: close, v: 100,
    };
  });
  mock.history.mockReturnValue({ deals: history, historyState: ready, retryHistory: vi.fn() });
  render(<MarketAnalysisBox />);
  const transitions = within(screen.getByRole("list", { name: "Recent market state changes" }));
  expect(transitions.getAllByRole("listitem").map(point => point.getAttribute("aria-label"))).toEqual([
    `2026-09-09 · ${labels[0]}`,
    `2026-10-07 · ${labels[1]}`,
    `2026-10-09 · ${labels[2]}`,
  ]);
  expect(transitions.getByText("2026-09-09").getAttribute("datetime")).toBe("2026-09-09");
  const daily = within(screen.getByRole("list", { name: "Market states over the latest 10 trading days" }));
  expect(daily.getAllByRole("listitem")).toHaveLength(10);
  expect(daily.queryByText("09/09")).toBeNull();
});

it("shows insufficient history explicitly instead of inventing a market state", () => {
  mock.history.mockReturnValue({ deals: bars.slice(0, 4), historyState: ready, retryHistory: vi.fn() });
  render(<MarketAnalysisBox />);
  expect(screen.getByText("Insufficient data")).toBeTruthy();
  expect(screen.queryByText("Bullish")).toBeNull();
});

it("shows loading, empty and error states with a working retry", () => {
  const retryHistory = vi.fn();
  mock.history.mockReturnValue({ deals: [], historyState: { ...ready, phase: "loading" }, retryHistory });
  const view = render(<MarketAnalysisBox />);
  expect(screen.getByRole("status")).toBeTruthy();
  expect(screen.queryByRole("list")).toBeNull();
  mock.history.mockReturnValue({ deals: [], historyState: { ...ready, phase: "empty" }, retryHistory });
  view.rerender(<MarketAnalysisBox />);
  expect(screen.getByRole("button")).toBeTruthy();
  mock.history.mockReturnValue({ deals: [], historyState: { ...ready, phase: "error", error: new Error("offline") }, retryHistory });
  view.rerender(<MarketAnalysisBox />);
  expect(screen.getByRole("alert")).toBeTruthy();
  fireEvent.click(screen.getByRole("button"));
  expect(retryHistory).toHaveBeenCalledOnce();
});

it("keeps the timeline visible when refreshing fails", () => {
  mock.history.mockReturnValue({ deals: bars, historyState: { ...ready, error: new Error("offline") }, retryHistory: vi.fn() });
  render(<MarketAnalysisBox />);
  expect(screen.getAllByRole("listitem")).toHaveLength(10);
  expect(screen.getByRole("button")).toBeTruthy();
});
