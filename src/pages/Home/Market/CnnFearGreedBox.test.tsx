/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { MarketSentimentRow } from "../../../api/marketSentimentApi";
import i18n from "../../../i18n";

const swr = vi.hoisted(() => ({
  useSWR: vi.fn(),
}));

vi.mock("swr", () => ({ default: swr.useSWR }));

import CnnFearGreedBox, {
  buildCnnTrendData,
  clampSentimentScore,
  classifySentimentScore,
  CNN_SENTIMENT_REFRESH_INTERVAL_MS,
  CNN_SENTIMENT_THRESHOLDS,
  CNN_SENTIMENT_Y_AXIS_INTERVAL,
  CNN_SENTIMENT_Y_TICKS,
  sentimentFillMotionSx,
} from "./CnnFearGreedBox";

const row = (dataDate: string | null, score: number | string | null, observedAt = "2026-10-23T23:59:44Z"): MarketSentimentRow => ({
  source: "cnn_fear_and_greed",
  data_date: dataDate,
  observed_at: observedAt,
  score,
  rating: "extreme fear",
  updated_at: "2026-10-24T09:40:07Z",
});

beforeEach(async () => {
  await i18n.changeLanguage("en");
  swr.useSWR.mockReset();
});

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("CNN Fear & Greed box", () => {
  it("classifies every inclusive score boundary from the numeric score", () => {
    const cases: Array<[unknown, string]> = [
      ["not-a-number", "unknown"],
      [0, "extremeFear"],
      [20, "extremeFear"],
      [20.01, "fear"],
      [40, "fear"],
      [40.01, "neutral"],
      [60, "neutral"],
      [60.01, "greed"],
      [80, "greed"],
      [80.01, "extremeGreed"],
      [100, "extremeGreed"],
    ];
    for (const [score, rating] of cases) expect(classifySentimentScore(score)).toBe(rating);
    expect(clampSentimentScore(-5)).toBe(0);
    expect(clampSentimentScore("101.2")).toBe(100);
  });

  it("disables the score-fill transition when reduced motion is requested", () => {
    expect(sentimentFillMotionSx.transition).toBe("width 200ms ease");
    expect(sentimentFillMotionSx["@media (prefers-reduced-motion: reduce)"].transition).toBe("none");
  });

  it("keeps the 20 and 80 score thresholds configured for the trend chart", () => {
    expect(CNN_SENTIMENT_THRESHOLDS).toEqual([20, 80]);
    expect(CNN_SENTIMENT_Y_TICKS).toEqual([0, 20, 50, 80, 100]);
    expect(CNN_SENTIMENT_Y_AXIS_INTERVAL).toBe(0);
  });

  it("refreshes the persisted sentiment history once per hour", () => {
    swr.useSWR.mockReturnValue({ data: [], error: undefined, isLoading: false, mutate: vi.fn() });
    render(<CnnFearGreedBox />);

    const options = swr.useSWR.mock.calls[0][2] as { refreshInterval: number; revalidateOnFocus: boolean };
    expect(CNN_SENTIMENT_REFRESH_INTERVAL_MS).toBe(60 * 60 * 1000);
    expect(options.refreshInterval).toBe(3_600_000);
    expect(options.revalidateOnFocus).toBe(false);
  });

  it("renders a score-derived Fear label for 20.98 despite a persisted extreme-fear rating", () => {
    swr.useSWR.mockReturnValue({
      data: [row("2026-10-23", 20.98), row("2026-10-22", 19.2), row("2026-10-01", 32)],
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<CnnFearGreedBox />);

    expect(screen.getByRole("heading", { name: "CNN Fear & Greed" })).toBeTruthy();
    expect(screen.getByText("21.0")).toBeTruthy();
    expect(screen.getByText("Fear")).toBeTruthy();
    expect(screen.queryByText("Extreme fear")).toBeNull();
    expect(screen.getByText("Observation date: Oct 23, 2026")).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "CNN Fear & Greed score from 0 to 100" }).getAttribute("aria-valuenow")).toBe("20.98");
  });

  it("renders the valid history oldest-to-newest with a visible 30-day summary", () => {
    const history = [row("2026-10-23", 20.98), row("2026-10-22", 19.2), row("2026-10-01", 32)];
    swr.useSWR.mockReturnValue({ data: history, error: undefined, isLoading: false, mutate: vi.fn() });

    expect(buildCnnTrendData(history, "en").map((point) => point.dateLabel)).toEqual(["Oct 1", "Oct 22", "Oct 23"]);
    render(<CnnFearGreedBox />);

    expect(screen.getByText("30-day trend")).toBeTruthy();
    expect(screen.getByRole("img", { name: "CNN Fear & Greed trend with 3 observations from Oct 1 to Oct 23" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("3 observations · Oct 1 32.0 → Oct 23 21.0 (0–100)");

    const columns = screen.getByTestId("cnn-sentiment-columns");
    const current = screen.getByTestId("cnn-sentiment-current");
    const trend = screen.getByTestId("cnn-sentiment-trend");
    expect(getComputedStyle(columns).display).toBe("grid");
    expect(current.parentElement).toBe(columns);
    expect(trend.parentElement).toBe(columns);
    expect(current.contains(screen.getByText("21.0"))).toBe(true);
    expect(trend.contains(screen.getByText("30-day trend"))).toBe(true);
  });

  it("keeps the latest observation as the headline when its score is invalid", () => {
    swr.useSWR.mockReturnValue({
      data: [row("2026-10-23", "invalid"), row("2026-10-22", 19.2)],
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<CnnFearGreedBox />);

    expect(screen.getByText("—")).toBeTruthy();
    expect(screen.getByText("Unclassified")).toBeTruthy();
    expect(screen.getByText("Observation date: Oct 23, 2026")).toBeTruthy();
    expect(screen.queryByText("19.2")).toBeNull();
  });

  it("shows a localized insufficient-history state when only one valid point remains", () => {
    swr.useSWR.mockReturnValue({ data: [row("2026-10-23", 20.98), row("not-a-date", "bad")], error: undefined, isLoading: false, mutate: vi.fn() });
    render(<CnnFearGreedBox />);
    expect(screen.getByText("Not enough valid observations to show a trend.")).toBeTruthy();
  });

  it("offers retry for a failed request and distinguishes empty data", () => {
    const mutate = vi.fn();
    swr.useSWR.mockReturnValue({ data: undefined, error: new Error("offline"), isLoading: false, mutate });
    const view = render(<CnnFearGreedBox />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(mutate).toHaveBeenCalledTimes(1);

    swr.useSWR.mockReturnValue({ data: [], error: undefined, isLoading: false, mutate });
    view.rerender(<CnnFearGreedBox />);
    expect(screen.getByRole("status").textContent).toContain("No CNN sentiment data is available.");
  });

  it("falls back to observed_at when data_date is malformed", () => {
    swr.useSWR.mockReturnValue({ data: [row("not-a-date", 50, "2026-10-23T23:59:44Z")], error: undefined, isLoading: false, mutate: vi.fn() });
    render(<CnnFearGreedBox />);
    expect(screen.getByText("Observation date: Oct 23, 2026")).toBeTruthy();
  });

  it("shows a loading status while the first request is pending", () => {
    swr.useSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: true, mutate: vi.fn() });
    render(<CnnFearGreedBox />);
    expect(screen.getByRole("status").textContent).toContain("Loading sentiment data…");
  });
});
